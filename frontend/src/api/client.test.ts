import { describe, it, expect } from 'vitest'
import { toSnakeCase } from './client'

describe('toSnakeCase', () => {
  it('preserves all-caps keys', () => {
    expect(toSnakeCase('CRITICAL')).toBe('critical')
    expect(toSnakeCase('HIGH')).toBe('high')
    expect(toSnakeCase('MEDIUM')).toBe('medium')
    expect(toSnakeCase('LOW')).toBe('low')
  })

  it('converts camelCase keys', () => {
    expect(toSnakeCase('bySeverity')).toBe('by_severity')
    expect(toSnakeCase('totalEalInr')).toBe('total_eal_inr')
    expect(toSnakeCase('portfolioRosi')).toBe('portfolio_rosi')
  })

  it('leaves snake_case keys untouched', () => {
    expect(toSnakeCase('by_severity')).toBe('by_severity')
    expect(toSnakeCase('open')).toBe('open')
    expect(toSnakeCase('cve_id')).toBe('cve_id')
  })
})