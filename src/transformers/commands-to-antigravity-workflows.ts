/**
 * Claude Code commands to Antigravity IDE workflows transformer.
 *
 * Claude command frontmatter: description, argument-hint, effort
 * Antigravity workflow frontmatter: description
 * Body becomes workflow content in both.
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/commands/')
}

export function transform(source: SourceFile): TransformResult {
  const frontmatter: Record<string, unknown> = {}

  if (source.frontmatter['description']) {
    frontmatter['description'] = source.frontmatter['description']
  }

  const content = stringify(source.body.trim(), frontmatter)
  return { content, needsFormat: true }
}
