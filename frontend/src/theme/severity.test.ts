import { describe, it, expect } from 'vitest'
import { SEVERITY_HEX, scoreTextColor, scoreRingColor, scoreHex } from './severity'

describe('SEVERITY_HEX', () => {
  it('has an entry for every severity level', () => {
    expect(Object.keys(SEVERITY_HEX)).toEqual(
      expect.arrayContaining(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
    )
  })
})

describe('scoreTextColor', () => {
  it('maps bands to the correct text color', () => {
    expect(scoreTextColor(85)).toBe('text-status-critical')
    expect(scoreTextColor(80)).toBe('text-status-critical')
    expect(scoreTextColor(65)).toBe('text-status-high')
    expect(scoreTextColor(45)).toBe('text-status-medium')
    expect(scoreTextColor(20)).toBe('text-status-low')
  })
})

describe('scoreRingColor', () => {
  it('maps bands to the correct stroke color', () => {
    expect(scoreRingColor(90)).toBe('stroke-status-critical')
    expect(scoreRingColor(60)).toBe('stroke-status-high')
    expect(scoreRingColor(40)).toBe('stroke-status-medium')
    expect(scoreRingColor(0)).toBe('stroke-status-low')
  })
})

describe('scoreHex', () => {
  it('maps bands to the correct hex colours', () => {
    expect(scoreHex(81)).toBe('#F43F5E')
    expect(scoreHex(62)).toBe('#F97316')
    expect(scoreHex(44)).toBe('#F59E0B')
    expect(scoreHex(12)).toBe('#22C55E')
  })
})