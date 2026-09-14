import { describe, it, expect } from 'vitest'
import { formatINR, formatINRFull, formatPct, shortUuid } from './format'

describe('formatINR', () => {
  it('renders zero and NaN as ₹0', () => {
    expect(formatINR(0)).toBe('₹0')
    expect(formatINR(Number.NaN)).toBe('₹0')
  })

  it('formats crores (>= 10,000,000)', () => {
    expect(formatINR(10_000_000)).toBe('₹1.00 Cr')
    expect(formatINR(15_200_000)).toBe('₹1.52 Cr')
  })

  it('formats lakhs (>= 100,000)', () => {
    expect(formatINR(100_000)).toBe('₹1.00 L')
    expect(formatINR(250_000)).toBe('₹2.50 L')
  })

  it('formats plain amounts with en-IN grouping', () => {
    expect(formatINR(45_000)).toBe('₹45,000')
  })
})

describe('formatINRFull', () => {
  it('always uses full en-IN grouping', () => {
    expect(formatINRFull(1_25_000)).toBe('₹1,25,000')
    expect(formatINRFull(1_00_000)).toBe('₹1,00,000')
  })
})

describe('formatPct', () => {
  it('applies fixed digits and a percent sign', () => {
    expect(formatPct(12.345)).toBe('12.3%')
    expect(formatPct(7, 2)).toBe('7.00%')
    expect(formatPct(100)).toBe('100.0%')
  })
})

describe('shortUuid', () => {
  it('returns the last segment of a dash-delimited id', () => {
    expect(shortUuid('df6a1c4f-9a1b-4f5e-8c2d-3e5a7b9c1d2e')).toBe(
      '3e5a7b9c1d2e'
    )
    expect(shortUuid('PAY-SRV-001')).toBe('001')
  })

  it('returns the raw value when there is no dash', () => {
    expect(shortUuid('ABC123')).toBe('ABC123')
  })

  it('returns an em dash for empty values', () => {
    expect(shortUuid(null)).toBe('—')
    expect(shortUuid(undefined)).toBe('—')
    expect(shortUuid('')).toBe('—')
  })
})