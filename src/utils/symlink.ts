/**
 * Cross-platform symlink helper.
 */

import {
  symlink as fsSymlink,
  unlink,
  readlink,
  stat,
  copyFile,
} from 'node:fs/promises'
import { relative, dirname } from 'node:path'

export async function createRelativeSymlink(
  targetPath: string,
  linkPath: string,
): Promise<void> {
  const dir = dirname(linkPath)
  const relTarget = relative(dir, targetPath)

  try {
    await fsSymlink(relTarget, linkPath)
  } catch {
    // Fallback: copy if symlink fails (Windows non-admin, etc.)
    await copyFile(targetPath, linkPath)
  }
}

export async function ensureSymlink(
  targetPath: string,
  linkPath: string,
): Promise<boolean> {
  try {
    const current = await readlink(linkPath)
    const dir = dirname(linkPath)
    const relTarget = relative(dir, targetPath)
    return current === relTarget
  } catch {
    return false
  }
}

export async function removeLink(linkPath: string): Promise<void> {
  try {
    await unlink(linkPath)
  } catch {
    // ignore
  }
}

export async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath)
    return s.isSymbolicLink()
  } catch {
    return false
  }
}
