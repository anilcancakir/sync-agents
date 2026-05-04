import { describe, it, expect } from 'vitest'
import {
  transform,
  canTransform,
  parseAndTransform,
} from '../../src/transformers/mcp-json-to-opencode-json'
import type { SourceFile } from '../../src/types'

function makeSource(raw: string): SourceFile {
  return {
    path: '/project/.mcp.json',
    content: raw,
    frontmatter: {},
    body: raw,
    raw,
  }
}

describe('mcp-json-to-opencode-json', () => {
  it('detects .mcp.json files', () => {
    const source = makeSource('{}')
    expect(canTransform(source)).toBe(true)
  })

  it('does not detect regular .md files', () => {
    const source: SourceFile = {
      path: '/project/CLAUDE.md',
      content: '# Rules',
      frontmatter: {},
      body: '# Rules',
      raw: '# Rules',
    }
    expect(canTransform(source)).toBe(false)
  })

  it('converts mcpServers to mcp key', () => {
    const raw = JSON.stringify({
      mcpServers: {
        'test-server': {
          command: 'node',
          args: ['server.js'],
        },
      },
    })
    const source = makeSource(raw)
    const result = parseAndTransform(source)

    expect(result.mcp).toBeDefined()
    expect(result.mcp['test-server']).toBeDefined()
    expect(result.mcp['test-server'].type).toBe('stdio')
    expect(result.mcp['test-server'].command).toBe('node')
  })

  it('preserves explicit type for http servers', () => {
    const raw = JSON.stringify({
      mcpServers: {
        api: {
          type: 'http',
          url: 'http://localhost:3000/mcp',
          headers: {
            Authorization: 'Bearer token',
          },
        },
      },
    })
    const source = makeSource(raw)
    const result = parseAndTransform(source)

    expect(result.mcp.api.type).toBe('http')
    expect(result.mcp.api.url).toBe('http://localhost:3000/mcp')
    expect(result.mcp.api.headers).toBeDefined()
  })

  it('transforms and marks as needing format', () => {
    const raw = JSON.stringify({
      mcpServers: {
        test: { command: 'php', args: ['artisan', 'mcp:serve'] },
      },
    })
    const source = makeSource(raw)
    const result = transform(source)

    expect(result.needsFormat).toBe(true)
    const parsed = JSON.parse(result.content)
    expect(parsed.mcp.test.type).toBe('stdio')
  })
})
