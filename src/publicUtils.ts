import { FauxError } from './validation'

/**
 * Given a seed integer, generates a deterministic UUID V4 string. This is
 * useful for generating consistent IDs in tests or fixtures without relying on
 * randomness.
 *
 * Since BigInt is not universally supported, this function only accepts safe
 * integers.
 */
export function deterministicUUID(seed: number): string {
  if (
    seed > Number.MAX_SAFE_INTEGER ||
    seed < Number.MIN_SAFE_INTEGER ||
    !Number.isInteger(seed)
  ) {
    throw new FauxError(
      `deterministicUUID(${seed}) must be a safe integer between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER`,
    )
  }
  /** Pack the seed into 16 bytes using repeated mod/divide (big-endian) */
  const bytes = new Array(16).fill(0)
  let n = Math.abs(seed)
  for (let i = 15; i >= 0 && n > 0; i--) {
    bytes[i] = n & 0xff
    n = Math.floor(n / 256)
  }

  // Set version 4 (byte 6) and variant (byte 8)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  // Format as UUID string
  let hex = ''
  for (let i = 0; i < 16; i++) {
    hex += (bytes[i] | 0x100).toString(16).substring(1)
  }
  return (
    hex.substring(0, 8) +
    '-' +
    hex.substring(8, 12) +
    '-' +
    hex.substring(12, 16) +
    '-' +
    hex.substring(16, 20) +
    '-' +
    hex.substring(20, 32)
  )
}
