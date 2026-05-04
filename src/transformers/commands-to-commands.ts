/**
 * Claude Code commands to OpenCode commands transformer.
 *
 * Claude command frontmatter: description, argument-hint, effort
 * OpenCode command frontmatter: description, agent, model, subtask
 * Body becomes template in both systems.
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/commands/')
}

export function transform(source: SourceFile): TransformResult {
  const frontmatter: Record<string, unknown> = {}

  // description is kept as-is
  if (source.frontmatter['description']) {
    frontmatter['description'] = source.frontmatter['description']
  }

  // argument-hint, effort, allowed-tools, argumentNames -> dropped
  // (OpenCode does not support them as frontmatter fields)
  // The template body already references $ARGUMENTS etc.

  const content = stringify(source.body.trim(), frontmatter)
  return { content, needsFormat: true }
}
