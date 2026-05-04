/**
 * Source → Target mapping configuration.
 * Defines how each Claude Code artifact maps to each target CLI.
 */

import type { SourceFile } from './types.js'

export interface MappingEntry {
  id: string
  matches: (file: SourceFile) => boolean
  transformer: string
  sourceBase: string
}

export interface TargetMappings {
  mappings: MappingEntry[]
  configDir: string
}

export const TARGET_MAPPINGS: Record<string, TargetMappings> = {
  opencode: {
    configDir: '.opencode',
    mappings: [
      {
        id: 'claude-md',
        matches: (f: SourceFile) => f.path.endsWith('CLAUDE.md'),
        transformer: 'claude-md',
        sourceBase: '',
      },
      {
        id: 'skills',
        matches: (f: SourceFile) => f.path.includes('/skills/'),
        transformer: 'skill',
        sourceBase: '.claude/skills',
      },
      {
        id: 'rules',
        matches: (f: SourceFile) => f.path.includes('/rules/'),
        transformer: 'rule',
        sourceBase: '.claude/rules',
      },
      {
        id: 'commands',
        matches: (f: SourceFile) => f.path.includes('/commands/'),
        transformer: 'command',
        sourceBase: '.claude/commands',
      },
      {
        id: 'agents',
        matches: (f: SourceFile) => f.path.includes('/agents/'),
        transformer: 'agent',
        sourceBase: '.claude/agents',
      },
      {
        id: 'mcp-json',
        matches: (f: SourceFile) => f.path.endsWith('.mcp.json'),
        transformer: 'mcp-json-opencode',
        sourceBase: '',
      },
    ],
  },

  codex: {
    configDir: '.codex',
    mappings: [
      {
        id: 'claude-md',
        matches: (f: SourceFile) => f.path.endsWith('CLAUDE.md'),
        transformer: 'claude-md',
        sourceBase: '',
      },
      {
        id: 'skills',
        matches: (f: SourceFile) => f.path.includes('/skills/'),
        transformer: 'skill',
        sourceBase: '.claude/skills',
      },
      {
        id: 'rules',
        matches: (f: SourceFile) => f.path.includes('/rules/'),
        transformer: 'rule',
        sourceBase: '.claude/rules',
      },
      {
        id: 'commands',
        matches: (f: SourceFile) => f.path.includes('/commands/'),
        transformer: 'command-codex',
        sourceBase: '.claude/commands',
      },
      {
        id: 'agents',
        matches: (f: SourceFile) => f.path.includes('/agents/'),
        transformer: 'agent',
        sourceBase: '.claude/agents',
      },
      {
        id: 'mcp-json',
        matches: (f: SourceFile) => f.path.endsWith('.mcp.json'),
        transformer: 'mcp-json-codex',
        sourceBase: '',
      },
    ],
  },

  antigravity: {
    configDir: '.agents',
    mappings: [
      {
        id: 'claude-md',
        matches: (f: SourceFile) => f.path.endsWith('CLAUDE.md'),
        transformer: 'claude-md',
        sourceBase: '',
      },
      {
        id: 'skills',
        matches: (f: SourceFile) => f.path.includes('/skills/'),
        transformer: 'skill',
        sourceBase: '.claude/skills',
      },
      {
        id: 'rules',
        matches: (f: SourceFile) => f.path.includes('/rules/'),
        transformer: 'rule-antigravity',
        sourceBase: '.claude/rules',
      },
      {
        id: 'commands',
        matches: (f: SourceFile) => f.path.includes('/commands/'),
        transformer: 'command-antigravity',
        sourceBase: '.claude/commands',
      },
      {
        id: 'mcp-json',
        matches: (f: SourceFile) => f.path.endsWith('.mcp.json'),
        transformer: 'mcp-json-antigravity',
        sourceBase: '',
      },
    ],
  },

  copilot: {
    configDir: '.github',
    mappings: [
      {
        id: 'claude-md',
        matches: (f: SourceFile) => f.path.endsWith('CLAUDE.md'),
        transformer: 'claude-md-copilot',
        sourceBase: '',
      },
      {
        id: 'rules',
        matches: (f: SourceFile) => f.path.includes('/rules/'),
        transformer: 'rule-copilot',
        sourceBase: '.claude/rules',
      },
      {
        id: 'commands',
        matches: (f: SourceFile) => f.path.includes('/commands/'),
        transformer: 'command-copilot',
        sourceBase: '.claude/commands',
      },
      {
        id: 'skills',
        matches: (f: SourceFile) => f.path.includes('/skills/'),
        transformer: 'skill-copilot',
        sourceBase: '.claude/skills',
      },
      {
        id: 'agents',
        matches: (f: SourceFile) => f.path.includes('/agents/'),
        transformer: 'skill-copilot',
        sourceBase: '.claude/agents',
      },
    ],
  },
}

/** Files that should be ignored (no equivalent in any target). */
export const IGNORE_IDS = new Set(['claude-local'])
