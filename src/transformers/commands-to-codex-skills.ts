/**
 * Claude Code commands to Codex skills transformer.
 * Codex doesn't have custom slash commands, so commands become skills.
 *
 * Claude command frontmatter: description, argument-hint, effort
 * Codex skill frontmatter: name, description
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'
import { basename, extname } from 'node:path'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/commands/')
}

function skillName(source: SourceFile): string {
  const name = basename(source.path, extname(source.path))
  return `command-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function extractDescription(source: SourceFile): string {
  if (source.frontmatter['description'] && typeof source.frontmatter['description'] === 'string') {
    return source.frontmatter['description'] as string
  }

  const lines = source.body.trim().split('\n').filter((l) => l.trim() !== '')
  const firstNonHeading = lines.find((l) => !l.trim().startsWith('#'))
  return firstNonHeading?.trim().slice(0, 160) || `Command: ${basename(source.path, '.md')}`
}

export function transform(source: SourceFile): TransformResult {
  const name = skillName(source)
  const description = extractDescription(source)
  const body = source.body.trim()

  const frontmatter: Record<string, unknown> = {
    name,
    description: `[Command] ${description}`,
  }

  const content = stringify(body.startsWith('#') ? body : `# ${name}\n\n${body}`, frontmatter)
  return { content, needsFormat: true }
}
