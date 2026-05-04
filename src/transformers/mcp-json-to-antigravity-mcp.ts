/**
 * Claude Code .mcp.json to Antigravity LS mcp_config.json transformer.
 *
 * Claude JSON: { mcpServers: { name: { command, args, env, type, url } } }
 * Antigravity LS: { mcpServers: { name: { command, args, env } | { serverUrl, headers } } }
 *
 * Key differences:
 * - No `type` discriminator (inferred from fields)
 * - `url` → `serverUrl`
 * - `$typeName` for plugin-based servers is preserved
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
  $typeName?: string
}

interface ClaudeMcpConfig {
  mcpServers?: Record<string, ClaudeMcpServer>
}

export function parseAndTransform(source: SourceFile): { mcpServers: Record<string, Record<string, unknown>> } {
  const config: ClaudeMcpConfig = JSON.parse(source.raw)
  const servers: Record<string, Record<string, unknown>> = {}

  if (config.mcpServers) {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const entry: Record<string, unknown> = {}

      // Preserve $typeName for plugin-based servers
      if (server.$typeName) {
        entry.$typeName = server.$typeName
      }

      if (server.command) {
        entry.command = server.command
      }

      if (server.args && server.args.length > 0) {
        entry.args = server.args
      }

      if (server.env && Object.keys(server.env).length > 0) {
        entry.env = server.env
      }

      // url → serverUrl (Antigravity LS format)
      if (server.url) {
        entry.serverUrl = server.url
      }

      if (server.headers && Object.keys(server.headers).length > 0) {
        entry.headers = server.headers
      }

      servers[name] = entry
    }
  }

  return { mcpServers: servers }
}

export function transform(source: SourceFile): TransformResult {
  const data = parseAndTransform(source)
  const content = JSON.stringify(data, null, 2) + '\n'
  return { content, needsFormat: true }
}
