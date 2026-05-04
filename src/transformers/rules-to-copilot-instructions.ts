/**
 * Claude Code rules to GitHub Copilot instructions transformer.
 *
 * Official Copilot spec: https://docs.github.com/en/copilot/concepts/prompting/response-customization
 *
 * .github/instructions/*.instructions.md format:
 *   - applyTo (REQUIRED): glob pattern, comma-separated for multiple
 *   - excludeAgent (optional): "code-review" | "cloud-agent"
 *   - NO name, NO description frontmatter
 *
 * Mapping:
 *   - path frontmatter → applyTo: <path value>
 *   - unconditional (no path) → applyTo: "**" (apply everywhere)
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/rules/')
}

export function transform(source: SourceFile): TransformResult {
  const pathPattern = source.frontmatter['path'] || source.frontmatter['paths']
  const hasPath = typeof pathPattern === 'string' && pathPattern.length > 0

  const applyTo = hasPath ? pathPattern : '**'
  const frontmatter: Record<string, unknown> = {
    applyTo,
  }

  // Format glob: Claude uses comma-separated, Copilot also uses comma-separated
  // Ensure proper Copilot glob syntax
  if (typeof frontmatter['applyTo'] === 'string') {
    frontmatter['applyTo'] = (frontmatter['applyTo'] as string)
      .replace(/\.php/g, '.php')      // preserve
      .replace(/\.ts/g, '.ts')        // preserve
      .replace(/\*\*\/\*$/g, '**/*')   // normalize /**/* at root level
  }

  const content = stringify(source.body.trim(), frontmatter)
  return { content, needsFormat: true }
}
