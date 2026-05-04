/**
 * Claude Code skills + agents to GitHub Copilot agents transformer.
 *
 * Official Copilot spec: https://docs.github.com/en/copilot/reference/custom-agents-configuration
 *
 * .github/agents/*.agent.md format:
 *   - name (optional): display name, defaults to filename
 *   - description (REQUIRED): what the agent does
 *   - model (optional): AI model identifier
 *   - tools (optional): tool aliases. If unset = all. Empty [] = none.
 *   - user-invocable (optional): default true
 *   - disable-model-invocation (optional): default false
 *
 * Copilot tool aliases: execute, read, edit, search, web, todo, agent
 * MCP tools: <server-name>/<tool-name> or <server-name>/*
 */

import { stringify } from '../utils/frontmatter.js'
import type { SourceFile, TransformResult } from '../types.js'
import { basename, extname } from 'node:path'

export function canTransform(source: SourceFile): boolean {
  return source.path.includes('/skills/') || source.path.includes('/agents/')
}

/** Map Claude Code tool names to Copilot aliases. */
function mapTools(allowed: string | string[]): string[] {
  const raw = Array.isArray(allowed)
    ? allowed
    : String(allowed).split(',').map((t) => t.trim())

  const toolMap: Record<string, string> = {
    Bash: 'execute',
    bash: 'execute',
    Read: 'read',
    read: 'read',
    Edit: 'edit',
    edit: 'edit',
    Write: 'edit',
    write: 'edit',
    MultiEdit: 'edit',
    NotebookEdit: 'edit',
    Grep: 'search',
    grep: 'search',
    Glob: 'search',
    glob: 'search',
    WebSearch: 'web',
    webSearch: 'web',
    WebFetch: 'web',
    webFetch: 'web',
    TodoWrite: 'todo',
    task: 'agent',
    Task: 'agent',
  }

  return raw
    .map((t) => toolMap[t] || t)
    .filter((t, i, arr) => arr.indexOf(t) === i) // dedupe
}

export function transform(source: SourceFile): TransformResult {
  const rawName = basename(source.path, extname(source.path))
  const frontmatter: Record<string, unknown> = {}

  // name
  if (source.frontmatter['name'] && typeof source.frontmatter['name'] === 'string') {
    frontmatter['name'] = source.frontmatter['name']
  } else if (source.path.includes('/skills/')) {
    frontmatter['name'] = rawName
  }

  // description (REQUIRED for Copilot agents)
  if (source.frontmatter['description']) {
    frontmatter['description'] = source.frontmatter['description']
  } else {
    // Derive from first line
    const firstLine = source.body.trim().split('\n')[0]?.replace(/^#+\s*/, '') || rawName
    frontmatter['description'] = firstLine.slice(0, 200)
  }

  // model
  if (source.frontmatter['model'] && typeof source.frontmatter['model'] === 'string') {
    frontmatter['model'] = source.frontmatter['model']
  }

  // tools: map to Copilot aliases
  const allowed = source.frontmatter['allowed-tools']
  if (allowed && (Array.isArray(allowed) || typeof allowed === 'string')) {
    frontmatter['tools'] = mapTools(allowed)
  }

  // user-invocable
  if (source.path.includes('/agents/') && source.frontmatter['user-invocable'] === false) {
    frontmatter['user-invocable'] = false
  }

  const content = stringify(source.body.trim(), frontmatter)
  return { content, needsFormat: true }
}
