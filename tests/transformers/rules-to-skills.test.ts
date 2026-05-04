import { describe, it, expect } from 'vitest'
import { transform, canTransform } from '../../src/transformers/rules-to-skills'
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

describe('rules-to-skills', () => {
  it('detects rule files', () => {
    const source = makeSource(
      '/project/.claude/rules/project.md',
      '- Use tabs',
    )
    expect(canTransform(source)).toBe(true)
  })

  it('does not detect non-rule files', () => {
    const source = makeSource(
      '/project/.claude/skills/foo/SKILL.md',
      '# Skill',
    )
    expect(canTransform(source)).toBe(false)
  })

  it('transforms unconditional rule to skill with frontmatter', () => {
    const source = makeSource(
      '/project/.claude/rules/project.md',
      '- Use tabs for indentation.\n- All commits must follow Conventional Commits.\n- Never use `any` in TypeScript.\n',
    )
    const result = transform(source)

    expect(result.needsFormat).toBe(true)
    expect(result.content).toContain('---')
    expect(result.content).toContain('name: project')
    expect(result.content).toContain('description:')
    expect(result.content).toContain('[Rule]')
    expect(result.content).toContain('- Use tabs for indentation')
  })

  it('transforms conditional rule with path into description', () => {
    const source = makeSource(
      '/project/.claude/rules/tests.md',
      '- TDD by default: red-green-refactor.\n- Use vitest for testing.\n- Mock external dependencies.\n',
      { path: 'tests/**/*.ts' },
    )
    const result = transform(source)

    expect(result.needsFormat).toBe(true)
    expect(result.content).toContain('name: tests')
    expect(result.content).toContain('description:')
    expect(result.content).toContain('tests/**/*.ts')
  })
})
