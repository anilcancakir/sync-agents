import { describe, it, expect } from 'vitest'
import { transform, canTransform } from '../../src/transformers/agents-to-agents'
import type { SourceFile } from '../../src/types'

function makeSource(path: string, body: string, fm: Record<string, unknown> = {}): SourceFile {
  const raw = Object.keys(fm).length > 0
    ? `---\n${Object.entries(fm)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')}\n---\n\n${body}`
    : body
  return {
    path,
    content: body,
    frontmatter: fm,
    body,
    raw,
  }
}

describe('agents-to-agents', () => {
  it('detects agent files', () => {
    const source = makeSource(
      '/project/.claude/agents/reviewer.md',
      '# Reviewer',
    )
    expect(canTransform(source)).toBe(true)
  })

  it('sets default mode to subagent', () => {
    const source = makeSource(
      '/project/.claude/agents/reviewer.md',
      'You are a code reviewer.\n',
      { description: 'Code review agent' },
    )
    const result = transform(source)

    expect(result.needsFormat).toBe(true)
    expect(result.content).toContain('mode: subagent')
    expect(result.content).toContain('description: Code review agent')
  })

  it('adds provider prefix to model if missing', () => {
    const source = makeSource(
      '/project/.claude/agents/reviewer.md',
      'You are a code reviewer.\n',
      { description: 'Reviewer', model: 'claude-sonnet-4-5' },
    )
    const result = transform(source)

    expect(result.content).toContain('model: anthropic/claude-sonnet-4-5')
  })

  it('keeps model with provider prefix as-is', () => {
    const source = makeSource(
      '/project/.claude/agents/reviewer.md',
      'Reviewer.\n',
      { description: 'R', model: 'anthropic/claude-opus-4-5' },
    )
    const result = transform(source)

    expect(result.content).toContain('model: anthropic/claude-opus-4-5')
  })

  it('sets hidden if user-invocable is false', () => {
    const source = makeSource(
      '/project/.claude/agents/internal.md',
      'Internal agent.\n',
      { 'user-invocable': false },
    )
    const result = transform(source)

    expect(result.content).toContain('hidden: true')
  })
})
