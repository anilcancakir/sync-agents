/**
 * Minimal TOML serializer for Codex config.toml.
 * Handles string, number, boolean, array, and object values.
 */

export function tomlify(obj: Record<string, unknown>, indent = ''): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Use inline table for nested objects (e.g., env = { KEY = "val" })
      const serialized = tomlInlineTable(value as Record<string, unknown>)
      lines.push(`${indent}${key} = ${serialized}`)
      continue
    }

    const serialized = tomlValue(value)
    lines.push(`${indent}${key} = ${serialized}`)
  }

  return lines.join('\n')
}

function tomlValue(value: unknown): string {
  if (typeof value === 'string') {
    return tomlString(value)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    if (value.every((v) => typeof v === 'string')) {
      return '[' + value.map((v) => tomlString(v as string)).join(', ') + ']'
    }
    return '[' + value.map((v) => tomlValue(v)).join(', ') + ']'
  }

  if (typeof value === 'object') {
    return tomlInlineTable(value as Record<string, unknown>)
  }

  return tomlString(String(value))
}

function tomlString(s: string): string {
  if (/^[a-zA-Z0-9_./\-]+$/.test(s) && s.length > 0) {
    return s
  }

  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')

  return `"${escaped}"`
}

function tomlInlineTable(obj: Record<string, unknown>): string {
  const pairs = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${tolmString(k)} = ${tolmValue(v)}`)
  return '{ ' + pairs.join(', ') + ' }'
}

function tolmString(s: string): string {
  if (/^[a-zA-Z0-9_]+$/.test(s)) {
    return s
  }
  return tomlString(s)
}

function tolmValue(value: unknown): string {
  return tomlValue(value)
}
