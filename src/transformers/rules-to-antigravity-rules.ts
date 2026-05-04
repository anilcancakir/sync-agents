/**
 * Claude Code rules to Antigravity IDE rules transformer.
 *
 * Claude rule frontmatter: path (optional)
 * Antigravity rule frontmatter: trigger (always_on|manual|model_decision|glob)
 *
 * Mapping:
 * - No path frontmatter → trigger: always_on
 * - path frontmatter     → trigger: glob, globs: <path value>
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/rules/')
}

export function transform(source: SourceFile): TransformResult {
  const pathPattern = source.frontmatter['path'] || source.frontmatter['paths']
  const hasPath = typeof pathPattern === 'string' && pathPattern.length > 0

  const frontmatter: Record<string, unknown> = {}

  if (hasPath) {
    frontmatter['trigger'] = 'glob'
    frontmatter['globs'] = pathPattern
  } else {
    frontmatter['trigger'] = 'always_on'
  }

  const content = stringify(source.body.trim(), frontmatter)
  return { content, needsFormat: true }
}
