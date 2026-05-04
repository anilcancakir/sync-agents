/**
 * Frontmatter parser / writer using gray-matter.
 */

import matter from 'gray-matter'
import type { ParsedFile } from '../types.js'

export function parse(raw: string): ParsedFile {
  const result = matter(raw)
  return {
    frontmatter: result.data as Record<string, unknown>,
    content: result.content,
    raw,
  }
}

export function stringify(content: string, frontmatter?: Record<string, unknown>): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content.trimStart()
  }

  const clean = Object.fromEntries(
    Object.entries(frontmatter).filter(([, v]) => v !== undefined),
  )

  if (Object.keys(clean).length === 0) {
    return content.trimStart()
  }

  return matter.stringify(content, clean).trimEnd() + '\n'
}
