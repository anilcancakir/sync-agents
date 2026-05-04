/**
 * Main sync engine.
 * Orchestrates scanning, classifying, transforming, and writing files.
 * Supports multiple target CLIs via the `--to` option.
 * Supports global/user-level sync via the `--global` flag.
 */

import { resolve, join } from 'node:path'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { scanClaudeCode, classifyFile, scanGlobalMcp } from './sources/claude-code.js'
import * as OpenCodeTarget from './targets/opencode.js'
import * as CodexTarget from './targets/codex.js'
import * as AntigravityTarget from './targets/antigravity.js'
import * as CopilotTarget from './targets/copilot.js'
import { loadCache, setCacheEntry, saveCache, isStale } from './utils/cache.js'
import { sha256 } from './utils/hash.js'
import { TARGET_MAPPINGS, IGNORE_IDS } from './mapping.js'
import type { SyncOptions, SourceFile } from './types.js'

import * as rulesToSkills from './transformers/rules-to-skills.js'
import * as commandsToCommands from './transformers/commands-to-commands.js'
import * as commandsToCodexSkills from './transformers/commands-to-codex-skills.js'
import * as skillsToSkills from './transformers/skills-to-skills.js'
import * as agentsToAgents from './transformers/agents-to-agents.js'
import * as claudeMdToAgents from './transformers/claude-md-to-agents.js'
import * as mcpJsonToOpenCodeJson from './transformers/mcp-json-to-opencode-json.js'
import * as mcpJsonToCodexToml from './transformers/mcp-json-to-codex-toml.js'
import * as rulesToAntigravityRules from './transformers/rules-to-antigravity-rules.js'
import * as commandsToAntigravityWf from './transformers/commands-to-antigravity-workflows.js'
import * as mcpJsonToAntigravityMcp from './transformers/mcp-json-to-antigravity-mcp.js'
import * as rulesToCopilotInstructions from './transformers/rules-to-copilot-instructions.js'
import * as commandsToCopilotPrompts from './transformers/commands-to-copilot-prompts.js'
import * as skillsToCopilotAgents from './transformers/skills-to-copilot-agents.js'
import * as claudeMdToCopilotInstructions from './transformers/claude-md-to-copilot-instructions.js'

interface Adapter {
  buildTargetPath: typeof OpenCodeTarget.buildTargetPath
  writeAsSymlink: typeof OpenCodeTarget.writeAsSymlink
  writeAsCopy: typeof OpenCodeTarget.writeAsCopy
  mergeMcpIntoConfig?: (
    projectRoot: string,
    configPath: string,
    servers: Record<string, Record<string, unknown>>,
  ) => Promise<boolean>
}

const ADAPTERS: Record<string, Adapter> = {
  opencode: {
    buildTargetPath: OpenCodeTarget.buildTargetPath,
    writeAsSymlink: OpenCodeTarget.writeAsSymlink,
    writeAsCopy: OpenCodeTarget.writeAsCopy,
    mergeMcpIntoConfig: OpenCodeTarget.mergeMcpIntoConfig as unknown as Adapter['mergeMcpIntoConfig'],
  },
  codex: {
    buildTargetPath: CodexTarget.buildTargetPath,
    writeAsSymlink: CodexTarget.writeAsSymlink,
    writeAsCopy: CodexTarget.writeAsCopy,
    mergeMcpIntoConfig: CodexTarget.mergeMcpIntoConfig as unknown as Adapter['mergeMcpIntoConfig'],
  },
  antigravity: {
    buildTargetPath: AntigravityTarget.buildTargetPath,
    writeAsSymlink: AntigravityTarget.writeAsSymlink,
    writeAsCopy: AntigravityTarget.writeAsCopy,
    mergeMcpIntoConfig: AntigravityTarget.mergeMcpIntoConfig as unknown as Adapter['mergeMcpIntoConfig'],
  },
  copilot: {
    buildTargetPath: CopilotTarget.buildTargetPath,
    writeAsSymlink: CopilotTarget.writeAsSymlink,
    writeAsCopy: CopilotTarget.writeAsCopy,
  },
}

const TRANSFORMERS: Record<string, {
  canTransform: (s: SourceFile) => boolean
  transform: (s: SourceFile) => { content: string; needsFormat: boolean }
}> = {
  rule: rulesToSkills,
  command: commandsToCommands,
  'command-codex': commandsToCodexSkills,
  skill: skillsToSkills,
  agent: agentsToAgents,
  'claude-md': claudeMdToAgents,
  'mcp-json-opencode': mcpJsonToOpenCodeJson,
  'mcp-json-codex': mcpJsonToCodexToml,
  'rule-antigravity': rulesToAntigravityRules,
  'command-antigravity': commandsToAntigravityWf,
  'mcp-json-antigravity': mcpJsonToAntigravityMcp,
  'rule-copilot': rulesToCopilotInstructions,
  'command-copilot': commandsToCopilotPrompts,
  'skill-copilot': skillsToCopilotAgents,
  'claude-md-copilot': claudeMdToCopilotInstructions,
}

interface SyncResult {
  synced: number
  skipped: number
  symlinks: number
  formatted: number
  details: string[]
}

/** Global config output directories for each target. */
function globalOutputRoot(target: string): string {
  const home = resolve(homedir())
  switch (target) {
    case 'opencode': return join(home, '.config', 'opencode')
    case 'codex': return join(home, '.codex')
    case 'antigravity': return join(home, '.gemini')
    case 'copilot': return home  // Copilot has no global config; project-level only
    default: return home
  }
}

export async function syncProject(
  projectRoot: string,
  options: SyncOptions,
): Promise<SyncResult> {
  const absRoot = options.global ? resolve(homedir()) : resolve(projectRoot)
  const targetName = options.to || 'opencode'
  const targetConfig = TARGET_MAPPINGS[targetName]
  const adapter = ADAPTERS[targetName]

  // Global mode: write to the target's global config directory
  const outputRoot = options.global
    ? globalOutputRoot(targetName)
    : absRoot

  if (!targetConfig || !adapter) {
    throw new Error(`Unknown target: ${targetName}. Supported: ${Object.keys(TARGET_MAPPINGS).join(', ')}`)
  }

  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    symlinks: 0,
    formatted: 0,
    details: [],
  }

  const cache = await loadCache(absRoot)
  const sourceFiles = await scanClaudeCode(absRoot)

  // Global mode: also scan ~/.claude/settings.json for mcpServers
  if (options.global) {
    const globalMcp = await scanGlobalMcp()
    sourceFiles.push(...globalMcp)
  }

  for (const file of sourceFiles) {
    const classification = classifyFile(file)

    if (IGNORE_IDS.has(classification)) {
      result.details.push(
        `→ ${file.path} → skipped (CLAUDE.local.md has no equivalent in ${targetName})`,
      )
      result.skipped++
      continue
    }

    const mapping = targetConfig.mappings.find((m) => m.matches(file))
    if (!mapping) {
      result.details.push(`→ ${file.path} → skipped (unknown file type)`)
      result.skipped++
      continue
    }

    const currentHash = sha256(file.raw)
    const stable = !options.force && !isStale(cache, file.path, currentHash)
    if (stable) {
      result.details.push(`→ ${file.path} → up to date`)
      result.skipped++
      continue
    }

    const module = TRANSFORMERS[mapping.transformer]
    if (!module || !module.canTransform(file)) {
      result.details.push(`→ ${file.path} → skipped (no transformer)`)
      result.skipped++
      continue
    }

    const transformed = module.transform(file)

    // Handle MCP merge specially for each target
    if (classification === 'mcp-json') {
      if (targetName === 'opencode') {
        const jsonPath = join(outputRoot, 'opencode.json')
        const jsoncPath = join(outputRoot, 'opencode.jsonc')
        const configPath = existsSync(jsoncPath)
          ? jsoncPath
          : existsSync(jsonPath)
            ? jsonPath
            : jsoncPath

        const opencodeMcp = mcpJsonToOpenCodeJson.parseAndTransform(file)
        await handleMcpMerge(
          file, configPath, result, options, currentHash, cache,
          mapping.transformer, adapter,
          opencodeMcp.mcp as unknown as Record<string, Record<string, unknown>>,
        )
      } else if (targetName === 'codex') {
        const configPath = join(outputRoot, 'config.toml')
        const mcpToml = transformed.content

        if (!options.dryRun) {
          const wrote = await adapter.mergeMcpIntoConfig!(
            absRoot,
            configPath,
            { _codex_mcp_toml: mcpToml } as unknown as Record<string, Record<string, unknown>>,
          )
          if (wrote) {
            result.formatted++
            result.synced++
            result.details.push(
              `→ ${file.path} → ${configPath} (MCP servers merged)`,
            )
          } else {
            result.details.push(
              `→ ${file.path} → ${configPath} (MCP servers unchanged)`,
            )
            result.skipped++
          }
        } else {
          result.synced++
          result.formatted++
          result.details.push(
            `→ ${file.path} → ${configPath} (MCP servers merged) [DRY-RUN]`,
          )
        }

        const entry = {
          sourcePath: file.path,
          targetPath: configPath,
          transformer: mapping.transformer,
          symlink: false,
          sourceHash: currentHash,
          transformedHash: sha256(mcpToml),
        }
        setCacheEntry(cache, file.path, entry)
        continue
      } else if (targetName === 'antigravity') {
        const configPath = AntigravityTarget.mcpConfigPath()
        const mcpJson = JSON.stringify(mcpJsonToAntigravityMcp.parseAndTransform(file))

        if (!options.dryRun) {
          const wrote = await adapter.mergeMcpIntoConfig!(
            absRoot,
            configPath,
            { _antigravity_mcp: mcpJson } as unknown as Record<string, Record<string, unknown>>,
          )
          if (wrote) {
            result.formatted++
            result.synced++
            result.details.push(
              `→ ${file.path} → ${configPath} (MCP servers merged)`,
            )
          } else {
            result.details.push(
              `→ ${file.path} → ${configPath} (MCP servers unchanged)`,
            )
            result.skipped++
          }
        } else {
          result.synced++
          result.formatted++
          result.details.push(
            `→ ${file.path} → ${configPath} (MCP servers merged) [DRY-RUN]`,
          )
        }

        const mcpEntry = {
          sourcePath: file.path,
          targetPath: configPath,
          transformer: mapping.transformer,
          symlink: false,
          sourceHash: currentHash,
          transformedHash: sha256(mcpJson),
        }
        setCacheEntry(cache, file.path, mcpEntry)
        continue
      }
      continue
    }

    const target = adapter.buildTargetPath(
      outputRoot,
      mapping.transformer,
      file.path,
      resolve(absRoot, '.claude'),
    )
    if (!target) {
      result.details.push(`→ ${file.path} → skipped (could not build target path)`)
      result.skipped++
      continue
    }

    await writeFileResult(file.path, target.path, transformed, result, options, adapter)

    const entry = {
      sourcePath: file.path,
      targetPath: target.path,
      transformer: mapping.transformer,
      symlink: !transformed.needsFormat,
      sourceHash: currentHash,
      transformedHash: transformed.needsFormat
        ? sha256(transformed.content)
        : undefined,
    }

    setCacheEntry(cache, file.path, entry)
  }

  await saveCache(absRoot, cache, options.dryRun)
  return result
}

async function handleMcpMerge(
  file: SourceFile,
  configPath: string,
  result: SyncResult,
  options: SyncOptions,
  currentHash: string,
  cache: Awaited<ReturnType<typeof loadCache>>,
  transformerName: string,
  adapter: Adapter,
  servers: Record<string, Record<string, unknown>>,
) {
  if (!options.dryRun) {
    const wrote = await adapter.mergeMcpIntoConfig!(options.from, configPath, servers)
    if (wrote) {
      result.formatted++
      result.synced++
      result.details.push(
        `→ ${file.path} → ${configPath} (MCP servers merged)`,
      )
    } else {
      result.details.push(
        `→ ${file.path} → ${configPath} (MCP servers unchanged)`,
      )
      result.skipped++
    }
  } else {
    result.synced++
    result.formatted++
    result.details.push(
      `→ ${file.path} → ${configPath} (MCP servers merged) [DRY-RUN]`,
    )
  }

  const entry = {
    sourcePath: file.path,
    targetPath: configPath,
    transformer: transformerName,
    symlink: false,
    sourceHash: currentHash,
    transformedHash: sha256(JSON.stringify(servers)),
  }

  setCacheEntry(cache, file.path, entry)
}

async function writeFileResult(
  sourcePath: string,
  targetPath: string,
  transformed: { content: string; needsFormat: boolean },
  result: SyncResult,
  options: SyncOptions,
  adapter: Adapter,
) {
  if (!options.dryRun) {
    if (transformed.needsFormat) {
      const wrote = await adapter.writeAsCopy(transformed.content, targetPath, false)
      if (wrote) {
        result.formatted++
        result.synced++
        result.details.push(
          `→ ${sourcePath} → ${targetPath} (formatted)`,
        )
      } else {
        result.details.push(
          `→ ${sourcePath} → ${targetPath} (unchanged)`,
        )
        result.skipped++
      }
    } else {
      const wrote = await adapter.writeAsSymlink(sourcePath, targetPath, false)
      if (wrote) {
        result.symlinks++
        result.synced++
        result.details.push(
          `→ ${sourcePath} → ${targetPath} (symlink)`,
        )
      } else {
        result.details.push(
          `→ ${sourcePath} → ${targetPath} (symlink unchanged)`,
        )
        result.skipped++
      }
    }
  } else {
    result.synced++
    if (transformed.needsFormat) {
      result.formatted++
      result.details.push(
        `→ ${sourcePath} → ${targetPath} (formatted) [DRY-RUN]`,
      )
    } else {
      result.symlinks++
      result.details.push(
        `→ ${sourcePath} → ${targetPath} (symlink) [DRY-RUN]`,
      )
    }
  }
}
