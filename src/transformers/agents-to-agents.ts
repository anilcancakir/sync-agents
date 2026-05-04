/**
 * Claude Code agents to OpenCode agents transformer.
 *
 * Claude agent frontmatter: description, model, allowed-tools, effort, etc.
 * OpenCode agent frontmatter: mode, model, description, hidden, color, tools, permission, steps, etc.
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/agents/')
}

export function transform(source: SourceFile): TransformResult {
  const opencodeFm: Record<string, unknown> = {}

  // mode: default to 'subagent' since Claude agents are invoked via slash commands
  opencodeFm['mode'] = 'subagent'

  // description
  if (source.frontmatter['description']) {
    opencodeFm['description'] = source.frontmatter['description']
  }

  // model: add provider prefix if missing
  if (source.frontmatter['model'] && typeof source.frontmatter['model'] === 'string') {
    const modelStr = source.frontmatter['model'] as string
    if (modelStr.includes('/')) {
      opencodeFm['model'] = modelStr
    } else {
      opencodeFm['model'] = `anthropic/${modelStr}`
    }
  }

  // hidden from Claude's user-invocable
  if (source.frontmatter['user-invocable'] === false) {
    opencodeFm['hidden'] = true
  }

  // Body becomes the prompt
  const content = stringify(source.body.trim(), opencodeFm)
  return { content, needsFormat: true }
}
