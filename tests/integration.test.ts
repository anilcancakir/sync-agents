import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { syncProject } from '../src/sync-engine'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  existsSync,
  rmSync,
  readFileSync,
  unlinkSync,
} from 'node:fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures', 'claude-code')

function cleanupOutput() {
  const opencodeDir = resolve(fixturesDir, '.opencode')
  if (existsSync(opencodeDir)) {
    rmSync(opencodeDir, { recursive: true, force: true })
  }
  const cacheFile = resolve(fixturesDir, '.sync-agents-cache.json')
  if (existsSync(cacheFile)) {
    unlinkSync(cacheFile)
  }
  const agentsMd = resolve(fixturesDir, 'AGENTS.md')
  if (existsSync(agentsMd)) {
    try {
      unlinkSync(agentsMd)
    } catch {
      // ignore
    }
  }
  const configFile = resolve(fixturesDir, 'opencode.jsonc')
  if (existsSync(configFile)) {
    unlinkSync(configFile)
  }
}

describe('sync engine integration', () => {
  beforeEach(cleanupOutput)
  afterEach(cleanupOutput)

  it('syncs rules to skills with formatting', async () => {
    const result = await syncProject(fixturesDir, {
      dryRun: false,
      force: true,
      from: 'claude-code',
      to: 'opencode',
    })

    expect(result.synced).toBeGreaterThan(0)
    expect(result.formatted).toBeGreaterThan(0)

    // Check output exists
    const skillsDir = resolve(fixturesDir, '.opencode', 'skills')
    expect(existsSync(skillsDir)).toBe(true)

    const projectSkill = resolve(skillsDir, 'project', 'SKILL.md')
    expect(existsSync(projectSkill)).toBe(true)
    const content = readFileSync(projectSkill, 'utf8')
    expect(content).toContain('name: project')
    expect(content).toContain('description:')
    expect(content).toContain('Project-wide coding standard')
  })

  it('symlinks CLAUDE.md to AGENTS.md', async () => {
    const result = await syncProject(fixturesDir, {
      dryRun: false,
      force: true,
      from: 'claude-code',
      to: 'opencode',
    })

    expect(result.symlinks).toBeGreaterThan(0)
  })

  it('does not sync CLAUDE.local.md', async () => {
    const result = await syncProject(fixturesDir, {
      dryRun: false,
      force: true,
      from: 'claude-code',
      to: 'opencode',
    })

    const details = result.details.join('\n')
    expect(details).toContain('CLAUDE.local.md')
    expect(details).toContain('skipped')
  })

  it('supports dry-run mode', async () => {
    const result = await syncProject(fixturesDir, {
      dryRun: true,
      force: true,
      from: 'claude-code',
      to: 'opencode',
    })

    expect(result.synced).toBeGreaterThan(0)
    const actionLines = result.details.filter(
      (d) => !d.includes('skipped'),
    )
    expect(actionLines.length).toBeGreaterThan(0)
    expect(actionLines.every((d) => d.includes('[DRY-RUN]'))).toBe(true)

    // No files should be created in dry-run mode
    const skillsDir = resolve(fixturesDir, '.opencode', 'skills')
    expect(existsSync(skillsDir)).toBe(false)
  })

  it('skips unchanged files on second run', async () => {
    // First run
    await syncProject(fixturesDir, {
      dryRun: false,
      force: true,
      from: 'claude-code',
      to: 'opencode',
    })

    // Second run without force
    const result = await syncProject(fixturesDir, {
      dryRun: false,
      force: false,
      from: 'claude-code',
      to: 'opencode',
    })

    // All should be up to date
    const skipped = result.details.filter((d) => d.includes('up to date'))
    expect(skipped.length).toBeGreaterThan(0)
  })

  it('merges mcp.json into opencode.jsonc', async () => {
    const result = await syncProject(fixturesDir, {
      dryRun: false,
      force: true,
      from: 'claude-code',
      to: 'opencode',
    })

    const configPath = resolve(fixturesDir, 'opencode.jsonc')
    expect(existsSync(configPath)).toBe(true)

    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    expect(config.mcp).toBeDefined()
    expect(config.mcp['test-server']).toBeDefined()
    expect(config.mcp['test-server'].type).toBe('stdio')
    expect(config.mcp['test-server'].command).toBe('node')
    expect(config.mcp['test-api'].type).toBe('http')

    const details = result.details.join('\n')
    expect(details).toContain('MCP servers merged')
  })
})
