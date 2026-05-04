/**
 * Claude Code .mcp.json to Codex config.toml [mcp_servers] transformer.
 *
 * Claude JSON format:
 * { "mcpServers": { "name": { "command": "...", "args": [...] } } }
 *
 * Codex TOML format:
 * [mcp_servers.name]
 * command = "..."
 * args = ["..."]
 */

import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.endsWith('.mcp.json')
}

interface ClaudeMcpServer {
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
  headers?: Record<string, string>
}

interface ClaudeMcpConfig {
  mcpServers?: Record<string, ClaudeMcpServer>
}

function tomlValue(value: unknown): string {
  if (typeof value === 'string') {
    if (/^[a-zA-Z0-9_./\-]+$/.test(value) && value.length > 0) {
      return value
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return '[' + value.map((v) => tomlValue(v)).join(', ') + ']'
  }
  if (typeof value === 'object' && value !== null) {
    const pairs = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k} = ${tomlValue(v)}`)
    return '{ ' + pairs.join(', ') + ' }'
  }
  return JSON.stringify(String(value))
}

export function parseAndTransform(source: SourceFile): { servers: Record<string, string> } {
  const config: ClaudeMcpConfig = JSON.parse(source.raw)
  const servers: Record<string, string> = {}

  if (config.mcpServers) {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const lines: string[] = []
      lines.push(`[mcp_servers.${name}]`)

      if (server.command) {
        lines.push(`command = ${tomlValue(server.command)}`)
      }

      if (server.args && server.args.length > 0) {
        lines.push(`args = ${tomlValue(server.args)}`)
      }

      if (server.env && Object.keys(server.env).length > 0) {
        lines.push(`env = ${tomlValue(server.env)}`)
      }

      if (server.url) {
        lines.push(`url = ${tomlValue(server.url)}`)
      }

      if (server.headers && Object.keys(server.headers).length > 0) {
        lines.push(`http_headers = ${tomlValue(server.headers)}`)
      }

      lines.push('')
      servers[name] = lines.join('\n')
    }
  }

  return { servers }
}

export function transform(source: SourceFile): TransformResult {
  const data = parseAndTransform(source)
  const content = Object.values(data.servers).join('')
  return { content, needsFormat: true }
}
