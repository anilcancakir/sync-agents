/**
 * SHA-256 file hashing.
 */

import { createHash } from 'node:crypto'

export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}
