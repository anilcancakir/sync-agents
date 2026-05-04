/**
 * Claude Code .mcp.json to OpenCode opencode.jsonc MCP section transformer.
 *
 * Claude format:
 * {
 *   "mcpServers": {
 *     "name": { "command": "...", "args": [...], "env": {...} },
 *     "http-name": { "type": "http", "url": "..." }
 *   }
 * }
 *
 * OpenCode format (merged into opencode.jsonc):
 * {
 *   "mcp": {
 *     "name": { "type": "stdio", "command": "...", "args": [...], "env": {...} },
 *     "http-name": { "type": "http", "url": "..." }
 *   }
 * }
 */

import type { SourceFile, TransformResult } from '../types.js'

export function canTransform(source: SourceFile): boolean {
  return source.path.endsWith('.mcp.json')
}

export interface McpServer {
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
  headers?: Record<string, string>
}

export interface McpConfig {
  mcpServers?: Record<string, McpServer>
}

export interface OpenCodeMcpConfig {
  mcp: Record<string, McpServer>
}

export function parseAndTransform(source: SourceFile): OpenCodeMcpConfig {
  const config: McpConfig = JSON.parse(source.raw)
  const servers: Record<string, McpServer> = {}

  if (config.mcpServers) {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const converted: McpServer = { ...server }

      // If no explicit type and has a command, it's a stdio server
      if (!converted.type && converted.command) {
        converted.type = 'stdio'
      }

      // If no explicit type and has a url, it's an http server
      if (!converted.type && converted.url) {
        converted.type = 'http'
      }

      servers[name] = converted
    }
  }

  return { mcp: servers }
}

export function transform(source: SourceFile): TransformResult {
  const result = parseAndTransform(source)
  const content = JSON.stringify(result, null, 2) + '\n'
  return { content, needsFormat: true }
}
