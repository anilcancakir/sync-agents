/**
 * Antigravity IDE target adapter.
 * Writes files to .agents/ directory (project-level) and mcp_config.json.
 */

import { join, dirname } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { writeFileIfChanged, ensureDir, fileExists } from '../utils/fs.js'
import {
  createRelativeSymlink,
  ensureSymlink,
  removeLink,
} from '../utils/symlink.js'
import type { TargetFile } from '../types.js'

export const AGENTS_CONFIG_DIR = '.agents'

export async function writeAsSymlink(
  sourcePath: string,
  targetPath: string,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) return true

  const alreadyCorrect = await ensureSymlink(sourcePath, targetPath)
  if (alreadyCorrect) return false

  if (await fileExists(targetPath)) {
    await removeLink(targetPath)
  }

  await ensureDir(dirname(targetPath))
  await createRelativeSymlink(sourcePath, targetPath)
  return true
}

export async function writeAsCopy(
  content: string,
  targetPath: string,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) return true
  return writeFileIfChanged(targetPath, content)
}

export function buildTargetPath(
  projectRoot: string,
  transformerName: string,
  sourcePath: string,
  sourceRoot: string,
): TargetFile | null {
  switch (transformerName) {
    case 'claude-md': {
      return {
        path: join(projectRoot, 'GEMINI.md'),
        content: '',
      }
    }

    case 'skill': {
      const relative = sourcePath.replace(sourceRoot + '/', '')
      const relativeWithoutRoot = relative.replace(/^skills\//, '')
      return {
        path: join(projectRoot, AGENTS_CONFIG_DIR, 'skills', relativeWithoutRoot),
        content: '',
      }
    }

    case 'rule':
    case 'rule-antigravity': {
      const relative = sourcePath.replace(sourceRoot + '/', '')
      const fileName = relative.split('/').pop() || 'rule'
      return {
        path: join(projectRoot, AGENTS_CONFIG_DIR, 'rules', fileName),
        content: '',
      }
    }

    case 'command':
    case 'command-antigravity': {
      const relative = sourcePath.replace(sourceRoot + '/commands/', '')
      const workflowName = relative.replace(/\.md$/, '.md')
      return {
        path: join(projectRoot, AGENTS_CONFIG_DIR, 'workflows', workflowName),
        content: '',
      }
    }

    default:
      return null
  }
}

/**
 * Merges MCP servers from .mcp.json into mcp_config.json (Antigravity LS format).
 * Preserves existing config and only updates matching servers.
 */
export async function mergeMcpIntoConfig(
  _projectRoot: string,
  configPath: string,
  _servers: Record<string, Record<string, unknown>>,
): Promise<boolean> {
  const content = _servers as unknown as { _antigravity_mcp?: string }
  const newMcpJson = content._antigravity_mcp || ''

  if (!newMcpJson) return false

  let existing: Record<string, unknown> = {}
  try {
    const raw = await readFile(configPath, 'utf8')
    existing = JSON.parse(raw)
  } catch {
    // will create new
  }

  const newMcp = JSON.parse(newMcpJson)
  const newServers = (newMcp.mcpServers || {}) as Record<string, unknown>
  const existingServers = (existing.mcpServers || {}) as Record<string, unknown>
  const merged: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(existingServers)) {
    if (!(name in newServers)) {
      merged[name] = value
    }
  }

  for (const [name, value] of Object.entries(newServers)) {
    merged[name] = value
  }

  existing.mcpServers = merged

  const output = JSON.stringify(existing, null, 2) + '\n'
  const previous = JSON.stringify((existing as Record<string, unknown>).mcpServers)

  if (JSON.stringify(merged) === previous) return false

  await ensureDir(dirname(configPath))
  await writeFile(configPath, output, 'utf8')
  return true
}

/** Path to Antigravity's MCP config in ~/.gemini/antigravity/ */
export function mcpConfigPath(): string {
  const home = process.env.HOME || '/tmp'
  return join(home, '.gemini', 'antigravity', 'mcp_config.json')
}
