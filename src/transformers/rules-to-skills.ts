/**
 * Rule files (.claude/rules/*.md) to OpenCode skills transformer.
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'
import { basename, extname } from 'node:path'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/rules/')
}

function extractDescription(source: SourceFile): string {
  const lines = source.body
    .trim()
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.trim().startsWith('#'))

  if (lines.length === 0) {
    return `Project rule: ${sourceName(source)}`
  }

  const firstBullet = lines
    .find((l) => l.trim().startsWith('-'))
    ?.trim()
    .replace(/^- /, '')

  const snippet = firstBullet || lines[0].trim()
  const truncated = snippet.length > 160
    ? snippet.slice(0, 157) + '...'
    : snippet

  const pathPattern = source.frontmatter['path'] || source.frontmatter['paths']
  if (pathPattern && typeof pathPattern === 'string') {
    return `[Rule] ${truncated} (files: ${pathPattern})`
  }

  return `[Rule] ${truncated}`
}

function sourceName(source: SourceFile): string {
  const name = basename(source.path, extname(source.path))
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function transform(source: SourceFile): TransformResult {
  const name = sourceName(source)
  const description = extractDescription(source)
  const body = wrapBody(source.body, name)

  const frontmatter: Record<string, unknown> = {
    name,
    description,
  }

  const content = stringify(body, frontmatter)
  return { content, needsFormat: true }
}

function wrapBody(body: string, ruleName: string): string {
  const trimmed = body.trim()

  if (trimmed.startsWith('#')) {
    return trimmed
  }

  return `# ${ruleName}\n\n${trimmed}`
}
