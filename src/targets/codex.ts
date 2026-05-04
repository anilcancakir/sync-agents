/**
 * Codex target adapter.
 * Writes files to .codex/ directory.
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

export const CODEX_CONFIG_DIR = '.codex'

export async function writeAsSymlink(
  sourcePath: string,
  targetPath: string,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) {
    return true
  }

  const alreadyCorrect = await ensureSymlink(sourcePath, targetPath)
  if (alreadyCorrect) {
    return false
  }

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
  if (dryRun) {
    return true
  }

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
        path: join(projectRoot, 'AGENTS.md'),
        content: '',
      }
    }

    case 'skill': {
      const relative = sourcePath.replace(sourceRoot + '/', '')
      const relativeWithoutRoot = relative.replace(/^skills\//, '')
      return {
        path: join(
          projectRoot,
          CODEX_CONFIG_DIR,
          'skills',
          relativeWithoutRoot,
        ),
        content: '',
      }
    }

    case 'rule': {
      const relative = sourcePath.replace(sourceRoot + '/', '')
      const fileName = relative.split('/').pop() || 'rule'
      const skillName = fileName.replace(/\.md$/, '')
      return {
        path: join(
          projectRoot,
          CODEX_CONFIG_DIR,
          'skills',
          skillName,
          'SKILL.md',
        ),
        content: '',
      }
    }

    case 'command': {
      const relative = sourcePath.replace(sourceRoot + '/commands/', '')
      const skillName = relative.replace(/\.md$/, '.md').split('/').pop()?.replace('.md', '') || 'command'
      return {
        path: join(
          projectRoot,
          CODEX_CONFIG_DIR,
          'skills',
          `command-${skillName}`,
          'SKILL.md',
        ),
        content: '',
      }
    }

    case 'agent': {
      const relative = sourcePath.replace(sourceRoot + '/agents/', '')
      const targetName = relative.replace(/\.md$/, '.md')
      return {
        path: join(
          projectRoot,
          CODEX_CONFIG_DIR,
          'agents',
          targetName,
        ),
        content: '',
      }
    }

    default:
      return null
  }
}

/**
 * Merges MCP servers from .mcp.json into .codex/config.toml.
 * Reads existing config, replaces matching [mcp_servers.*] sections,
 * preserves existing servers not in .mcp.json. Returns true if written.
 */
export async function mergeMcpIntoConfig(
  _projectRoot: string,
  configPath: string,
  _servers: Record<string, Record<string, unknown>>,
): Promise<boolean> {
  const newMcp = _servers as unknown as { _codex_mcp_toml?: string }
  const mcpToml = newMcp._codex_mcp_toml || ''

  // Extract server names from the new TOML content
  const newNames = new Set<string>()
  const nameRegex = /\[mcp_servers\.([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = nameRegex.exec(mcpToml)) !== null) {
    newNames.add(match[1])
  }

  let existingContent = ''
  try {
    existingContent = await readFile(configPath, 'utf8')
  } catch {
    // Will create new config
  }

  // Remove only [mcp_servers.X] sections for servers present in new config
  let stripped = existingContent
  for (const name of newNames) {
    const sectionRegex = new RegExp(
      `\\n?\\[mcp_servers\\.${escapeRegex(name)}\\]\\s*[\\s\\S]*?(?=\\n\\[|$)`,
      'g',
    )
    stripped = stripped.replace(sectionRegex, '')
  }
  stripped = stripped.trim()

  const newContent = stripped
    ? stripped + '\n\n' + mcpToml
    : mcpToml

  const trimmed = newContent.trim()
  if (!trimmed) {
    return false
  }

  const previous = existingContent.trim()
  if (previous === trimmed) {
    return false
  }

  await ensureDir(dirname(configPath))
  await writeFile(configPath, trimmed + '\n', 'utf8')
  return true
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
