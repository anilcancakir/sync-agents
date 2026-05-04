import { describe, it, expect } from 'vitest'
import { scanClaudeCode, classifyFile } from '../../src/sources/claude-code'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fixturesDir = resolve(__dirname, '..', 'fixtures', 'claude-code')

describe('claude-code source adapter', () => {
  it('scans all known file types', async () => {
    const files = await scanClaudeCode(fixturesDir)

    const paths = files.map((f) => f.path)

    expect(paths.some((p) => p.endsWith('CLAUDE.md') && !p.includes('.claude'))).toBe(true)
    expect(paths.some((p) => p.endsWith('CLAUDE.local.md'))).toBe(true)
    expect(paths.some((p) => p.includes('/skills/') && p.endsWith('SKILL.md'))).toBe(true)
    expect(paths.some((p) => p.includes('/rules/') && p.endsWith('.md'))).toBe(true)
    expect(paths.some((p) => p.includes('/commands/') && p.endsWith('.md'))).toBe(true)
    expect(paths.some((p) => p.includes('/agents/') && p.endsWith('.md'))).toBe(true)
    expect(paths.some((p) => p.endsWith('.mcp.json'))).toBe(true)
  })

  it('reads CLAUDE.md content', async () => {
    const files = await scanClaudeCode(fixturesDir)
    const claudeMd = files.find(
      (f) => f.path.endsWith('CLAUDE.md') && !f.path.includes('.claude'),
    )

    expect(claudeMd).toBeDefined()
    expect(claudeMd!.content).toContain('Project Rules')
    expect(claudeMd!.frontmatter).toEqual({})
  })

  it('reads skill with frontmatter', async () => {
    const files = await scanClaudeCode(fixturesDir)
    const skill = files.find((f) => f.path.includes('/skills/'))

    expect(skill).toBeDefined()
    expect(skill!.frontmatter).toHaveProperty('name', 'test-skill')
    expect(skill!.frontmatter).toHaveProperty('description', 'A test skill for testing sync')
  })

  it('reads conditional rule with path frontmatter', async () => {
    const files = await scanClaudeCode(fixturesDir)
    const rule = files.find(
      (f) => f.path.endsWith('tests.md'),
    )

    expect(rule).toBeDefined()
    expect(rule!.frontmatter).toHaveProperty('path', 'tests/**/*.ts')
  })

  it('reads unconditional rule without frontmatter', async () => {
    const files = await scanClaudeCode(fixturesDir)
    const rule = files.find(
      (f) => f.path.endsWith('project.md'),
    )

    expect(rule).toBeDefined()
    expect(rule!.content).toContain('Project-wide coding standard')
  })

  it('classifies file types correctly', () => {
    expect(
      classifyFile({
        path: '/project/CLAUDE.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('claude-md')

    expect(
      classifyFile({
        path: '/home/user/.claude/CLAUDE.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('claude-md')

    expect(
      classifyFile({
        path: '/project/CLAUDE.local.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('claude-local')

    expect(
      classifyFile({
        path: '/project/.claude/rules/foo.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('rule')

    expect(
      classifyFile({
        path: '/project/.claude/skills/foo/SKILL.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('skill')

    expect(
      classifyFile({
        path: '/project/.claude/commands/foo.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('command')

    expect(
      classifyFile({
        path: '/project/.claude/agents/foo.md',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('agent')

    expect(
      classifyFile({
        path: '/project/.mcp.json',
        content: '',
        frontmatter: {},
        body: '',
        raw: '',
      }),
    ).toBe('mcp-json')
  })
})
