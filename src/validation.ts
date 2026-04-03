import { InternalConfig } from './types'

export class FauxError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message)
    this.name = 'FauxError'
  }
}

export function validateInternalConfig(config: InternalConfig): InternalConfig {
  const { seed, cursorIncrease, override, sharedOverride, getSharedValue } =
    config

  /** Seed */
  if (seed < 1) {
    throw new FauxError('Seed must be a non-negative number', { seed })
  }

  if (!Number.isInteger(seed)) {
    throw new FauxError('Seed must be an integer', { seed })
  }

  if (seed > Number.MAX_SAFE_INTEGER) {
    throw new FauxError(
      `Seed must be less than or equal to ${Number.MAX_SAFE_INTEGER}`,
      { seed },
    )
  }

  /** Seed increase */
  if (typeof cursorIncrease !== 'number' || isNaN(cursorIncrease)) {
    throw new FauxError('cursorIncrease must be a number', { cursorIncrease })
  }

  if (cursorIncrease === 0) {
    throw new FauxError(
      'cursorIncrease cannot be 0 as it would cause cursor value overlaps',
      { cursorIncrease },
    )
  }

  if (cursorIncrease < 0) {
    throw new FauxError('cursorIncrease must be a positive number', {
      cursorIncrease,
    })
  }

  /** overrides */
  if (
    typeof override !== 'object' ||
    override === null ||
    Array.isArray(override)
  ) {
    throw new FauxError('override must be an object', { override })
  }

  /** shared overrides */
  if (
    typeof sharedOverride !== 'object' ||
    sharedOverride === null ||
    Array.isArray(sharedOverride)
  ) {
    throw new FauxError('override.shared must be an object', { sharedOverride })
  }

  /** shared values  */
  if (typeof getSharedValue !== 'function') {
    throw new FauxError('getSharedValue must be a function', { getSharedValue })
  }

  return config
}
