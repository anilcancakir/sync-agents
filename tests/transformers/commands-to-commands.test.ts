import { describe, it, expect } from 'vitest'
import { transform, canTransform } from '../../src/transformers/commands-to-commands'
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

describe('commands-to-commands', () => {
  it('detects command files', () => {
    const source = makeSource(
      '/project/.claude/commands/build.md',
      '# Build',
    )
    expect(canTransform(source)).toBe(true)
  })

  it('does not detect non-command files', () => {
    const source = makeSource(
      '/project/.claude/rules/project.md',
      '# Rules',
    )
    expect(canTransform(source)).toBe(false)
  })

  it('keeps description and drops argument-hint/effort', () => {
    const source = makeSource(
      '/project/.claude/commands/build.md',
      '# Build Command\n\nRun the build.\n',
      { description: 'Build the project', 'argument-hint': '[target]', effort: 'high' },
    )
    const result = transform(source)

    expect(result.needsFormat).toBe(true)
    expect(result.content).toContain('description: Build the project')
    expect(result.content).not.toContain('argument-hint')
    expect(result.content).not.toContain('effort')
    expect(result.content).toContain('# Build Command')
  })

  it('works with command without frontmatter', () => {
    const source = makeSource(
      '/project/.claude/commands/deploy.md',
      '# Deploy\n\nDeploy to production.\n',
    )
    const result = transform(source)

    expect(result.needsFormat).toBe(true)
    expect(result.content).not.toContain('description:')
    expect(result.content).toContain('# Deploy')
  })
})
