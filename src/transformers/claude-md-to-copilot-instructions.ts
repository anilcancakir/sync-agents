/**
 * CLAUDE.md to GitHub Copilot copilot-instructions.md transformer.
 * Unlike other targets, Copilot reads from git repos and cannot resolve symlinks,
 * so we copy the content instead of symlinking.
 */

import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.endsWith('CLAUDE.md')
}

export function transform(source: SourceFile): TransformResult {
  return {
    content: source.raw,
    needsFormat: true,
  }
}
