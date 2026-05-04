import { describe, it, expect } from 'vitest'
import { transform, canTransform } from '../../src/transformers/skills-to-skills'
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

describe('skills-to-skills', () => {
  it('detects skill files', () => {
    const source = makeSource(
      '/project/.claude/skills/my-skill/SKILL.md',
      '# Skill',
    )
    expect(canTransform(source)).toBe(true)
  })

  it('returns raw content unchanged (symlink path)', () => {
    const raw = '---\nname: my-skill\ndescription: Does stuff\n---\n\n# My Skill\n\nSkill body content.\n'
    const source: SourceFile = {
      path: '/project/.claude/skills/my-skill/SKILL.md',
      content: '# My Skill\n\nSkill body content.\n',
      frontmatter: { name: 'my-skill', description: 'Does stuff' },
      body: '# My Skill\n\nSkill body content.\n',
      raw,
    }
    const result = transform(source)

    expect(result.needsFormat).toBe(false)
    expect(result.content).toBe(raw)
  })
})
