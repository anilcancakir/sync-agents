/**
 * Sync cache management (.sync-agents-cache.json).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { CacheData, SyncEntry } from '../types.js'

const CACHE_FILE = '.sync-agents-cache.json'

export function cachePath(projectRoot: string): string {
  return resolve(projectRoot, CACHE_FILE)
}

export async function loadCache(projectRoot: string): Promise<CacheData> {
  try {
    const raw = await readFile(cachePath(projectRoot), 'utf8')
    return JSON.parse(raw) as CacheData
  } catch {
    return { version: 1, entries: {} }
  }
}

export async function saveCache(
  projectRoot: string,
  cache: CacheData,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    return
  }

  const filePath = cachePath(projectRoot)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(cache, null, 2), 'utf8')
}

export function getCacheEntry(
  cache: CacheData,
  sourcePath: string,
): SyncEntry | undefined {
  return cache.entries[sourcePath]
}

export function setCacheEntry(
  cache: CacheData,
  sourcePath: string,
  entry: SyncEntry,
): void {
  cache.entries[sourcePath] = entry
}

export function isStale(
  cache: CacheData,
  sourcePath: string,
  currentHash: string,
): boolean {
  const entry = getCacheEntry(cache, sourcePath)
  if (!entry) {
    return true
  }
  return entry.sourceHash !== currentHash
}
