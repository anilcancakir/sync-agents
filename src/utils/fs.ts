/**
 * File system helpers.
 */

import {
  readFile as fsReadFile,
  writeFile,
  mkdir,
  readdir as fsReaddir,
  stat,
} from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

export async function readFile(filePath: string): Promise<string> {
  return fsReadFile(filePath, 'utf8')
}

export async function writeFileIfChanged(
  filePath: string,
  content: string,
): Promise<boolean> {
  try {
    const existing = await readFile(filePath)
    if (existing === content) {
      return false
    }
  } catch {
    // file doesn't exist, will write
  }

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
  return true
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

export async function walkDirectory(dir: string): Promise<string[]> {
  const results: string[] = []

  try {
    const entries = await fsReaddir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name)

      if (entry.isDirectory()) {
        const nested = await walkDirectory(fullPath)
        results.push(...nested)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    return []
  }

  return results
}

export async function findMdFiles(dir: string): Promise<string[]> {
  const results: string[] = []

  try {
    const entries = await fsReaddir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name)

      if (entry.isDirectory()) {
        const nested = await findMdFiles(fullPath)
        results.push(...nested)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    return []
  }

  return results
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}
