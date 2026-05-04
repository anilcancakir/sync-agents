/**
 * Claude Code skills to OpenCode skills transformer.
 *
 * Both systems use the same format: name + description in frontmatter, markdown body.
 * This is a no-op transformer (content is identical), resulting in a symlink.
 */

import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/skills/')
}

export function transform(source: SourceFile): TransformResult {
  // Skills format is already compatible: name, description in frontmatter.
  // No content transformation needed.
  return {
    content: source.raw,
    needsFormat: false,
  }
}
