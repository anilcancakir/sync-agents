/**
 * GitHub Copilot target adapter.
 * Writes files to .github/ directory.
 */

import { join, dirname } from 'node:path'
import { writeFileIfChanged, ensureDir, fileExists } from '../utils/fs.js'
import {
  createRelativeSymlink,
  ensureSymlink,
  removeLink,
} from '../utils/symlink.js'
import type { TargetFile } from '../types.js'

export const COPILOT_CONFIG_DIR = '.github'

export async function writeAsSymlink(
  sourcePath: string,
  targetPath: string,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) return true
  const alreadyCorrect = await ensureSymlink(sourcePath, targetPath)
  if (alreadyCorrect) return false
  if (await fileExists(targetPath)) await removeLink(targetPath)
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
    case 'claude-md':
    case 'claude-md-copilot': {
      return {
        path: join(projectRoot, COPILOT_CONFIG_DIR, 'copilot-instructions.md'),
        content: '',
      }
    }

    case 'rule':
    case 'rule-copilot': {
      const relative = sourcePath.replace(sourceRoot + '/', '')
      const fileName = relative.split('/').pop() || 'rule'
      const name = fileName.replace(/\.md$/, '')
      return {
        path: join(projectRoot, COPILOT_CONFIG_DIR, 'instructions', `${name}.instructions.md`),
        content: '',
      }
    }

    case 'command':
    case 'command-copilot': {
      const relative = sourcePath.replace(sourceRoot + '/commands/', '')
      const name = relative.replace(/\.md$/, '')
      return {
        path: join(projectRoot, COPILOT_CONFIG_DIR, 'prompts', `${name}.prompt.md`),
        content: '',
      }
    }

    case 'skill':
    case 'skill-copilot':
    case 'agent': {
      const relative = sourcePath.replace(sourceRoot + '/', '')
      const parts = relative.split('/')
      const name = parts[parts.length - 1]?.replace(/\.md$/, '') || 'agent'
      const agentName = parts[parts.length - 2] || name
      return {
        path: join(projectRoot, COPILOT_CONFIG_DIR, 'agents', `${agentName}.agent.md`),
        content: '',
      }
    }

    default:
      return null
  }
}
