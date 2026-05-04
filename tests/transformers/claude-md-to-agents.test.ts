import { describe, it, expect } from 'vitest'
import { transform, canTransform } from '../../src/transformers/claude-md-to-agents'
import type { SourceFile } from '../../src/types'

describe('claude-md-to-agents', () => {
  it('detects root CLAUDE.md file', () => {
    const source: SourceFile = {
      path: '/project/CLAUDE.md',
      content: '# Rules\n',
      frontmatter: {},
      body: '# Rules\n',
      raw: '# Rules\n',
    }
    expect(canTransform(source)).toBe(true)
  })

  it('detects nested .claude/CLAUDE.md (global mode)', () => {
    const source: SourceFile = {
      path: '/home/user/.claude/CLAUDE.md',
      content: '# Global Rules\n',
      frontmatter: {},
      body: '# Global Rules\n',
      raw: '# Global Rules\n',
    }
    expect(canTransform(source)).toBe(true)
  })

  it('returns raw content unchanged (symlink path)', () => {
    const raw = '# Project Rules\n\n- Use TypeScript\n'
    const source: SourceFile = {
      path: '/project/CLAUDE.md',
      content: '# Project Rules\n\n- Use TypeScript\n',
      frontmatter: {},
      body: '# Project Rules\n\n- Use TypeScript\n',
      raw,
    }
    const result = transform(source)

    expect(result.needsFormat).toBe(false)
    expect(result.content).toBe(raw)
  })
})
