import { describe, it, expect } from 'vitest'
import { sanitizePdfText } from './exportPdf'

describe('sanitizePdfText', () => {
  it('replaces the rupee sign with an ASCII label', () => {
    expect(sanitizePdfText('₹45,000')).toBe('Rs. 45,000')
  })

  it('normalises em/en dashes to hyphens', () => {
    expect(sanitizePdfText('Risk — HIGH')).toBe('Risk - HIGH')
  })

  it('strips non-Latin control characters and collapses whitespace', () => {
    expect(sanitizePdfText('RBI\u00a0·\u00a0SEBI')).toBe('RBI SEBI')
    expect(sanitizePdfText('a   b\t\nc')).toBe('a b c')
  })
})