import { describe, it, expect } from 'vitest'
import { rowsToCsv } from './exportCsv'

describe('rowsToCsv', () => {
  it('returns empty string for no rows', () => {
    expect(rowsToCsv([])).toBe('')
  })

  it('writes headers then rows', () => {
    const csv = rowsToCsv([
      { asset: 'DB-01', eal: 120000 },
      { asset: 'APP-02', eal: 45000 },
    ])
    expect(csv).toBe('asset,eal\nDB-01,120000\nAPP-02,45000')
  })

  it('collects union of keys across rows', () => {
    const csv = rowsToCsv([
      { asset: 'A', eal: 1 },
      { asset: 'B', openVulns: 3 },
    ])
    expect(csv).toContain('asset,eal,openVulns')
  })

  it('quotes cells containing commas, quotes or newlines', () => {
    const csv = rowsToCsv([{ note: 'a, "quoted", note' }])
    expect(csv).toContain('"a, ""quoted"", note"')
  })

  it('renders null and undefined as empty', () => {
    const csv = rowsToCsv([{ a: null, b: undefined, c: 0 }])
    expect(csv).toContain(',0')
  })
})