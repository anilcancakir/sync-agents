/**
 * CLAUDE.md to AGENTS.md transformer.
 *
 * Both are plain markdown without frontmatter.
 * This is a rename operation (no content change), resulting in a symlink.
 */

import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.endsWith('CLAUDE.md')
}

export function transform(source: SourceFile): TransformResult {
  // CLAUDE.md content is identical to what AGENTS.md expects.
  // No transformation needed - symlink.
  return {
    content: source.raw,
    needsFormat: false,
  }
}
