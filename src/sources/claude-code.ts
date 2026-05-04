/**
 * Claude Code CLI source adapter.
 * Scans and reads .claude/ directory structure.
 */

import { existsSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFile, walkDirectory } from '../utils/fs.js'
import { parse } from '../utils/frontmatter.js'
import type { SourceFile } from '../types.js'

export const CLAUDE_CONFIG_DIR = '.claude'
export const CLAUDE_MD = 'CLAUDE.md'
export const CLAUDE_LOCAL_MD = 'CLAUDE.local.md'

export async function scanClaudeCode(projectRoot: string): Promise<SourceFile[]> {
  const files: SourceFile[] = []

  // 1. CLAUDE.md (project root OR inside .claude/ for global mode)
  const claudeMdPath = join(projectRoot, CLAUDE_MD)
  const claudeMdInConfig = join(projectRoot, CLAUDE_CONFIG_DIR, CLAUDE_MD)
  const mdPaths = [claudeMdPath, claudeMdInConfig]
  for (const p of mdPaths) {
    if (existsSync(p) && lstatSync(p).isFile() && !files.some((f) => f.path === p)) {
      const raw = await readFile(p)
      const parsed = parse(raw)
      files.push({
        path: p,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        body: parsed.content,
        raw,
      })
    }
  }

  // 2. CLAUDE.local.md
  const claudeLocalPath = join(projectRoot, CLAUDE_LOCAL_MD)
  if (existsSync(claudeLocalPath) && lstatSync(claudeLocalPath).isFile()) {
    const raw = await readFile(claudeLocalPath)
    const parsed = parse(raw)
    files.push({
      path: claudeLocalPath,
      content: parsed.content,
      frontmatter: parsed.frontmatter,
      body: parsed.content,
      raw,
    })
  }

  // 3. .claude/rules/*.md
  const rulesDir = join(projectRoot, CLAUDE_CONFIG_DIR, 'rules')
  if (existsSync(rulesDir)) {
    const ruleFiles = await walkDirectory(rulesDir)
    for (const p of ruleFiles) {
      const raw = await readFile(p)
      const parsed = parse(raw)
      files.push({
        path: p,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        body: parsed.content,
        raw,
      })
    }
  }

  // 4. .claude/skills/*/SKILL.md
  const skillsDir = join(projectRoot, CLAUDE_CONFIG_DIR, 'skills')
  if (existsSync(skillsDir)) {
    const skillFiles = await walkDirectory(skillsDir)
    for (const p of skillFiles) {
      const raw = await readFile(p)
      const parsed = parse(raw)
      files.push({
        path: p,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        body: parsed.content,
        raw,
      })
    }
  }

  // 5. .claude/commands/*.md
  const commandsDir = join(projectRoot, CLAUDE_CONFIG_DIR, 'commands')
  if (existsSync(commandsDir)) {
    const cmdFiles = await walkDirectory(commandsDir)
    for (const p of cmdFiles) {
      const raw = await readFile(p)
      const parsed = parse(raw)
      files.push({
        path: p,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        body: parsed.content,
        raw,
      })
    }
  }

  // 6. .claude/agents/*.md
  const agentsDir = join(projectRoot, CLAUDE_CONFIG_DIR, 'agents')
  if (existsSync(agentsDir)) {
    const agentFiles = await walkDirectory(agentsDir)
    for (const p of agentFiles) {
      const raw = await readFile(p)
      const parsed = parse(raw)
      files.push({
        path: p,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        body: parsed.content,
        raw,
      })
    }
  }

  // 7. .mcp.json
  const mcpJsonPath = join(projectRoot, '.mcp.json')
  if (existsSync(mcpJsonPath) && lstatSync(mcpJsonPath).isFile()) {
    const raw = await readFile(mcpJsonPath)
    files.push({
      path: mcpJsonPath,
      content: raw,
      frontmatter: {},
      body: raw,
      raw,
    })
  }

  return files
}

export function classifyFile(file: SourceFile): string {
  const p = file.path

  if (p.endsWith(CLAUDE_MD) && !p.includes('/.claude/')) {
    return 'claude-md'
  }

  if (p.endsWith(CLAUDE_MD) && p.includes('/.claude/CLAUDE.md')) {
    return 'claude-md'
  }

  if (p.endsWith(CLAUDE_LOCAL_MD)) {
    return 'claude-local'
  }

  if (p.includes('/rules/')) {
    return 'rule'
  }

  if (p.includes('/skills/')) {
    return 'skill'
  }

  if (p.includes('/commands/')) {
    return 'command'
  }

  if (p.includes('/agents/')) {
    return 'agent'
  }

  if (p.endsWith('.mcp.json')) {
    return 'mcp-json'
  }

  return 'unknown'
}

/**
 * Scans ~/.claude/settings.json for mcpServers key (global MCP config).
 * Returns a synthetic SourceFile if MCP servers are found.
 */
export async function scanGlobalMcp(): Promise<SourceFile[]> {
  const settingsPath = join(homedir(), '.claude', 'settings.json')
  if (!existsSync(settingsPath)) {
    return []
  }

  try {
    const raw = await readFile(settingsPath)
    const config = JSON.parse(raw)
    const mcpServers = config.mcpServers

    if (!mcpServers || Object.keys(mcpServers).length === 0) {
      return []
    }

    const mcpJson = JSON.stringify({ mcpServers })
    return [{
      path: settingsPath,
      content: mcpJson,
      frontmatter: {},
      body: mcpJson,
      raw: mcpJson,
    }]
  } catch {
    return []
  }
}
