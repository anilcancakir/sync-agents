/**
 * OpenCode target adapter.
 * Writes files to .opencode/ directory.
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
import type { McpServer } from '../transformers/mcp-json-to-opencode-json.js'

export const OPENCODE_CONFIG_DIR = '.opencode'

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
      // Strip the leading 'skills/' prefix and keep the full nested path
      const relativeWithoutRoot = relative.replace(/^skills\//, '')
      return {
        path: join(
          projectRoot,
          OPENCODE_CONFIG_DIR,
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
          OPENCODE_CONFIG_DIR,
          'skills',
          skillName,
          'SKILL.md',
        ),
        content: '',
      }
    }

    case 'command': {
      const relative = sourcePath.replace(sourceRoot + '/commands/', '')
      const targetName = relative.replace(/\.md$/, '.md')
      return {
        path: join(
          projectRoot,
          OPENCODE_CONFIG_DIR,
          'command',
          targetName,
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
          OPENCODE_CONFIG_DIR,
          'agent',
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
 * Parses JSONC (JSON with comments) by stripping comments then parsing.
 */
function parseJsonc(text: string): Record<string, unknown> {
  // Remove line comments but not URL slashes (https://)
  const stripped = text
    .replace(/(?<!:)\/\/\s*.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  return JSON.parse(stripped)
}

/**
 * Merges MCP servers from .mcp.json into opencode.jsonc.
 * Preserves existing config and only updates the `mcp` section.
 * Returns true if the file was written, false if unchanged.
 */
export async function mergeMcpIntoConfig(
  _projectRoot: string,
  configPath: string,
  servers: Record<string, McpServer>,
): Promise<boolean> {
  let config: Record<string, unknown> = {}

  try {
    const existing = await readFile(configPath, 'utf8')
    config = parseJsonc(existing)
  } catch {
    config = {
      $schema: 'https://opencode.ai/config.json',
    }
  }

  const existingMcp = (config.mcp as Record<string, unknown>) ?? {}
  const merged: Record<string, unknown> = {}

  // Preserve existing servers not in the source
  for (const [name, value] of Object.entries(existingMcp)) {
    if (!(name in servers)) {
      merged[name] = value
    }
  }

  // Overlay source servers
  for (const [name, value] of Object.entries(servers)) {
    merged[name] = value
  }

  const previous = JSON.stringify(config.mcp)
  const next = JSON.stringify(merged)
  if (previous === next) {
    return false
  }

  config.mcp = merged

  const content = JSON.stringify(config, null, 2) + '\n'
  await ensureDir(dirname(configPath))
  await writeFile(configPath, content, 'utf8')
  return true
}
