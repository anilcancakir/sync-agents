#!/usr/bin/env node

/**
 * sync-agents — Sync Claude Code CLI configuration to OpenCode CLI.
 */

import { Command } from 'commander'
import { syncProject } from './sync-engine'
import type { SyncOptions } from './types.js'

const program = new Command()

program
  .name('sync-agents')
  .description('Sync Claude Code configuration to OpenCode, Codex, Antigravity IDE, or GitHub Copilot')
  .version('0.1.0')
  .option('-d, --dry-run', 'Show what would be done without making changes')
  .option('-f, --force', 'Force re-sync all files ignoring cache')
  .option('--from <source>', 'Source agent CLI (default: claude-code)', 'claude-code')
  .option('--to <target>', 'Target agent CLI (default: opencode)', 'opencode')
  .option('-g, --global', 'Sync global/user-level configuration instead of project-level')
  .argument('[project-root]', 'Project root directory (default: current working directory)', process.cwd())
  .action(async (projectRoot: string) => {
    const options: SyncOptions = {
      dryRun: Boolean(program.opts().dryRun),
      force: Boolean(program.opts().force),
      from: program.opts().from,
      to: program.opts().to,
      global: Boolean(program.opts().global),
    }

    console.log()
    console.log(`sync-agents ${program.version()}`)
    console.log(`  from: ${options.from}`)
    console.log(`  to: ${options.to}`)
    console.log(`  project: ${projectRoot}`)
    if (options.dryRun) {
      console.log('  mode: dry-run (no changes will be made)')
    }
    if (options.global) {
      console.log('  scope: global (~/.claude/)')
    }
    console.log()

    try {
      const result = await syncProject(projectRoot, options)

      for (const detail of result.details) {
        console.log(detail)
      }

      console.log()
      console.log(
        `Synced ${result.synced} files (${result.symlinks} symlinks, ${result.formatted} formatted). ${result.skipped} skipped.`,
      )
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program.parse()
