# sync-agents

Sync Claude Code CLI configuration files to OpenCode, Codex, Antigravity IDE, or GitHub Copilot format. Run it in any project that already uses Claude Code, and it generates the equivalent configuration for your target agent automatically.

## Installation

```bash
npm install -g sync-agents
```

Or run directly without installing:

```bash
npx sync-agents
```

## Usage

```bash
# Project-level sync (default)
sync-agents --to opencode               # Sync to OpenCode
sync-agents --to codex                  # Sync to Codex
sync-agents --to antigravity            # Sync to Antigravity IDE
sync-agents --to copilot                # Sync to GitHub Copilot

# Global/user-level sync
sync-agents --global --to opencode      # ~/.claude/ → ~/.config/opencode/
sync-agents -g --to codex               # ~/.claude/ → ~/.codex/
sync-agents -g --to antigravity         # ~/.claude/ → ~/.gemini/

# Preview what will change without writing
sync-agents --dry-run

# Force re-sync everything (ignore cache)
sync-agents --force

# Target a specific project
sync-agents /path/to/project
```

## What It Syncs

### Project-Level

#### OpenCode Target (`--to opencode`)

| Claude Code Source | OpenCode Target | Strategy |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md` | Relative symlink |
| `.claude/rules/*.md` | `.opencode/skills/<name>/SKILL.md` | Formatted copy |
| `.claude/skills/*/SKILL.md` | `.opencode/skills/*/SKILL.md` | Relative symlink |
| `.claude/commands/*.md` | `.opencode/command/*.md` | Formatted copy |
| `.claude/agents/*.md` | `.opencode/agent/*.md` | Formatted copy |
| `.mcp.json` | `opencode.jsonc` (merged) | Config merge |

#### Codex Target (`--to codex`)

| Claude Code Source | Codex Target | Strategy |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md` | Relative symlink |
| `.claude/rules/*.md` | `.codex/skills/<name>/SKILL.md` | Formatted copy |
| `.claude/skills/*/SKILL.md` | `.codex/skills/*/SKILL.md` | Relative symlink |
| `.claude/commands/*.md` | `.codex/skills/command-<name>/SKILL.md` | Formatted copy |
| `.claude/agents/*.md` | `.codex/agents/*.md` | Formatted copy |
| `.mcp.json` | `.codex/config.toml` (merged) | Config merge |

#### Antigravity IDE Target (`--to antigravity`)

| Claude Code Source | Antigravity Target | Strategy |
|---|---|---|
| `CLAUDE.md` | `GEMINI.md` (project root) | Relative symlink |
| `.claude/rules/*.md` | `.agents/rules/<name>.md` | Formatted copy |
| `.claude/skills/*/SKILL.md` | `.agents/skills/*/SKILL.md` | Relative symlink |
| `.claude/commands/*.md` | `.agents/workflows/<name>.md` | Formatted copy |
| `.mcp.json` | `~/.gemini/antigravity/mcp_config.json` (merged) | Config merge |

Antigravity IDE rules use a `trigger` frontmatter field instead of Claude's `path:`:

```yaml
# Conditional rule (Claude: path frontmatter)
---
trigger: glob
globs: src/**/*.ts
---
Content

# Unconditional rule (Claude: no path)
---
trigger: always_on
---
Content
```

Commands become workflows with a `description` frontmatter. Agents are not syncable (Antigravity manages them through the IDE GUI, not files).

#### GitHub Copilot Target (`--to copilot`)

| Claude Code Source | Copilot Target | Strategy |
|---|---|---|
| `CLAUDE.md` | `.github/copilot-instructions.md` | File copy |
| `.claude/rules/*.md` (conditional) | `.github/instructions/<name>.instructions.md` | Formatted copy (`path:` → `applyTo:`) |
| `.claude/rules/*.md` (unconditional) | `.github/instructions/<name>.instructions.md` | Formatted copy (`applyTo: "**"`) |
| `.claude/commands/*.md` | `.github/prompts/<name>.prompt.md` | Formatted copy |
| `.claude/skills/*/SKILL.md` | `.github/agents/<name>.agent.md` | Formatted copy |
| `.claude/agents/*.md` | `.github/agents/<name>.agent.md` | Formatted copy |
| `.mcp.json` | — | Skip (no file-based MCP in Copilot) |

Copilot instructions use `applyTo` (required) instead of Claude's `path:`. Prompts have no frontmatter (plain Markdown only). Agents use Copilot tool aliases: `execute`, `read`, `edit`, `search`, `web`, `todo`, `agent`. Symlinks are not used (Copilot reads from git repos and cannot resolve them).

```yaml
# Conditional rule → instruction
---
applyTo: 'app/models/**/*.rb,lib/**/*.rb'
---
Rule content
```

```markdown
# Command → prompt (no frontmatter)
Deploy instructions here.
```

Copilot has no global config (all configuration is repo-level `.github/`).

### Global-Level (`--global`)

When `--global` (or `-g`) is used, the tool syncs from `~/.claude/` to the target's global/user-level config directory. It also scans `~/.claude/settings.json` for any `mcpServers` key.

| Claude Source (global) | OpenCode | Codex | Antigravity | Copilot |
|--------|--------|--------|--------|--------|
| `~/.claude/CLAUDE.md` | `~/.config/opencode/AGENTS.md` | `~/.codex/AGENTS.md` | `~/.gemini/GEMINI.md` | — (repo-level only) |
| `~/.claude/skills/` | `~/.config/opencode/skills/` | `~/.codex/skills/` | `~/.gemini/antigravity/skills/` | — |
| `~/.claude/commands/` | `~/.config/opencode/command/` | `~/.codex/skills/command-*/SKILL.md` | `~/.gemini/antigravity/global_workflows/` | — |
| `~/.claude/rules/` | `~/.config/opencode/skills/` | `~/.codex/skills/` | `~/.gemini/agents/rules/` | — |
| `~/.claude/agents/` | `~/.config/opencode/agents/` | `~/.codex/agents/` | — | — |
| `settings.json` (mcpServers) | `opencode.jsonc` | `config.toml` | `mcp_config.json` | — |

### Rules to Skills / Rules

Claude Code rules (`.claude/rules/*.md`) are converted differently per target:

**OpenCode & Codex**: Rules become skills (`SKILL.md` with `name` and `description` frontmatter). Conditional rules with a `path:` frontmatter include the file pattern in the description so the agent knows when to load the skill.

```yaml
# Before: .claude/rules/tests.md
---
path: tests/**/*.php
---
- TDD by default: red-green-refactor.

# After OpenCode/Codex: .opencode/skills/tests/SKILL.md
---
name: tests
description: >-
  [Rule] TDD by default: red-green-refactor... (files: tests/**/*.php)
---
# tests

- TDD by default: red-green-refactor.
```

**Antigravity IDE**: Rules keep their original name and get a `trigger` frontmatter. Files with a `path:` frontmatter become `trigger: glob` rules. Files without become `trigger: always_on`.

Skills load on-demand in OpenCode and Codex. The agent sees the description and invokes the `skill` tool when it needs the full content, keeping the system prompt lean.

### MCP Servers

MCP servers from `.mcp.json` are merged into the target's config format. Existing config is preserved, only the MCP section is updated.

**OpenCode** (`opencode.jsonc`):

```jsonc
// Source: .mcp.json
{
  "mcpServers": {
    "laravel-boost": {
      "command": "php",
      "args": ["artisan", "boost:mcp"]
    }
  }
}

// Target: merged into opencode.jsonc
{
  "mcp": {
    "laravel-boost": {
      "command": "php",
      "args": ["artisan", "boost:mcp"],
      "type": "stdio"
    }
  }
}
```

**Codex** (`.codex/config.toml`):

```toml
# Target: merged into .codex/config.toml
[mcp_servers.laravel-boost]
command = php
args = [artisan, "boost:mcp"]

[mcp_servers.api-server]
url = "http://localhost:3000"
http_headers = { Authorization = "Bearer token" }
```

**Antigravity IDE** (`~/.gemini/antigravity/mcp_config.json`):

```jsonc
# Target: merged into mcp_config.json (Antigravity LS format)
{
  "mcpServers": {
    "laravel-boost": {
      "command": "php",
      "args": ["artisan", "boost:mcp"],
      "env": { "APP_ENV": "local" }
    },
    "api-server": {
      "serverUrl": "http://localhost:3000",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

- `command`-based servers get `"type": "stdio"` for OpenCode, or are written as stdio sections for Codex/Antigravity.
- `url`-based servers: OpenCode keeps `url`, Antigravity uses `serverUrl`.
- `env` and `http_headers` are written as inline TOML tables for Codex, JSON objects for OpenCode/Antigravity.
- Existing config keys (`provider`, `permission`, `tools`, other MCP servers) stay untouched.

### Symlink vs Copy

Files that don't need format changes use relative symlinks. This means:
- Editing the source (`.claude/*`) automatically updates the target.
- No duplicate content on disk.
- Portable across machines (relative paths).

Files that need transformation (rules, commands, agents, MCP) are written as real copies with formatted content.

## How Sync Works

The tool uses a hash-based cache (`.sync-agents-cache.json`) to track changes. On subsequent runs:

1. Source files are scanned and hashed.
2. Hashes are compared against the cache.
3. Only changed files are re-synced. Unchanged files are skipped.
4. The cache is updated with new hashes.

Use `--force` to bypass the cache and re-sync everything.

## Files That Are Skipped

`CLAUDE.local.md` has no equivalent in any target, so it is always ignored. Antigravity IDE also skips `.claude/agents/*.md` (agents are managed through the IDE GUI, not files). In global mode, the same rules apply; only `~/.claude/` contents that have a target equivalent are synced.

## Project Structure

```
src/
├── index.ts                      # CLI entrypoint
├── sync-engine.ts                # Main sync orchestrator
├── mapping.ts                    # Source-to-target mapping config
├── types.ts                      # Shared interfaces
├── sources/
│   └── claude-code.ts            # .claude/ directory scanner
├── targets/
│   ├── opencode.ts               # .opencode/ writer + merge logic
│   ├── codex.ts                  # .codex/ writer + merge logic
│   ├── antigravity.ts            # .agents/ writer + merge logic
│   └── copilot.ts                # .github/ writer
├── transformers/
│   ├── rules-to-skills.ts        # .claude/rules/*.md → skills/SKILL.md (OpenCode, Codex)
│   ├── rules-to-antigravity-rules.ts  # .claude/rules/*.md → .agents/rules/*.md
│   ├── commands-to-commands.ts   # .claude/commands/*.md → .opencode/command/*.md
│   ├── commands-to-codex-skills.ts    # .claude/commands/*.md → .codex/skills/*/SKILL.md
│   ├── commands-to-antigravity-workflows.ts  # .claude/commands/*.md → .agents/workflows/*.md
│   ├── skills-to-skills.ts       # .claude/skills/*/SKILL.md → skills/*/SKILL.md (symlink)
│   ├── rules-to-copilot-instructions.ts  # .claude/rules/*.md → .github/instructions/*.instructions.md
│   ├── commands-to-copilot-prompts.ts  # .claude/commands/*.md → .github/prompts/*.prompt.md
│   ├── skills-to-copilot-agents.ts    # .claude/skills/*/SKILL.md → .github/agents/*.agent.md
│   ├── agents-to-agents.ts       # .claude/agents/*.md → agents/*.md
│   ├── claude-md-to-agents.ts    # CLAUDE.md → AGENTS.md / GEMINI.md
│   ├── mcp-json-to-opencode-json.ts  # .mcp.json → opencode.jsonc merge
│   ├── mcp-json-to-codex-toml.ts     # .mcp.json → .codex/config.toml merge
│   └── mcp-json-to-antigravity-mcp.ts  # .mcp.json → mcp_config.json merge
├── utils/
│   ├── frontmatter.ts            # YAML frontmatter parse/write
│   ├── hash.ts                   # SHA-256 hashing
│   ├── symlink.ts                # Cross-platform symlink helpers
│   ├── fs.ts                     # File system utilities
│   └── cache.ts                  # .sync-agents-cache.json management
tests/
├── fixtures/
│   └── claude-code/              # Mock .claude/ directory with all file types
├── transformers/                 # Unit tests per transformer
├── sources/                      # Source adapter tests
└── integration.test.ts           # End-to-end sync tests
```

## Development

```bash
npm install
npm run lint     # TypeScript type check
npm test         # Run test suite (35 tests)
npm run build    # Compile TypeScript
```
