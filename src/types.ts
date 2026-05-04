/**
 * Shared types for sync-agents.
 */

export interface ParsedFile {
  frontmatter: Record<string, unknown>
  content: string
  raw: string
}

export interface SyncEntry {
  sourcePath: string
  targetPath: string
  transformer: string
  symlink: boolean
  sourceHash: string
  transformedHash?: string
}

export interface CacheData {
  version: number
  entries: Record<string, SyncEntry>
}

export interface SourceFile {
  path: string
  content: string
  frontmatter: Record<string, unknown>
  body: string
  raw: string
}

export interface TargetFile {
  path: string
  content: string
}

export interface TransformResult {
  content: string
  needsFormat: boolean
}

export interface Transformer {
  name: string
  canTransform(source: SourceFile): boolean
  transform(source: SourceFile): TransformResult
}

export interface SyncOptions {
  dryRun: boolean
  force: boolean
  from: string
  to: string
  global: boolean
}
