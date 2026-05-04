/**
 * Claude Code commands to GitHub Copilot prompts transformer.
 *
 * Official Copilot spec: prompts have NO frontmatter - just plain Markdown.
 * They use #file:x.ts references and Markdown links for file references.
 *
 * Claude command frontmatter (description, argument-hint, effort) is discarded.
 * Only the Markdown body is preserved.
 */

import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/commands/')
}

export function transform(source: SourceFile): TransformResult {
  // Prompts are plain Markdown — no frontmatter
  return { content: source.body.trim() + '\n', needsFormat: true }
}
