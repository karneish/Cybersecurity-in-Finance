import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  computeBackoffDelay,
  WS_BASE_DELAY_MS,
  WS_MAX_DELAY_MS,
} from './useWebSocket'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('computeBackoffDelay', () => {
  it('returns 0 for non-positive attempts', () => {
    expect(computeBackoffDelay(0)).toBe(0)
    expect(computeBackoffDelay(-2)).toBe(0)
  })

  it('grows exponentially from the base delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(computeBackoffDelay(1)).toBe(WS_BASE_DELAY_MS)
    expect(computeBackoffDelay(2)).toBe(WS_BASE_DELAY_MS * 2)
    expect(computeBackoffDelay(3)).toBe(WS_BASE_DELAY_MS * 4)
  })

  it('applies full jitter within [0.5x, 1x] of the exponential value', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const jittered = computeBackoffDelay(2)
    expect(jittered).toBeGreaterThanOrEqual(WS_BASE_DELAY_MS)
    expect(jittered).toBeLessThanOrEqual(WS_BASE_DELAY_MS * 2)
  })

  it('caps the delay at the maximum', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(computeBackoffDelay(10)).toBe(WS_MAX_DELAY_MS)
    expect(computeBackoffDelay(100)).toBe(WS_MAX_DELAY_MS)
  })
})