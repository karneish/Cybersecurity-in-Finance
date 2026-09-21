import { useTheme } from './useTheme'

export interface ChartTokens {
  /** Axis / default chart text */
  text: string
  /** Secondary muted legend / label text */
  legend: string
  /** Axis labels */
  axisLabel: string
  /** Axis guide lines */
  axisLine: string
  /** Horizontal/vertical grid split lines */
  splitLine: string
  /** Tooltip surface */
  tooltipBg: string
  /** Tooltip border */
  tooltipBorder: string
  /** Tooltip text */
  tooltipText: string
  /** Border used to separate series slices from the chart surface */
  seriesBorder: string
  /** Primary series color (strong contrast) */
  seriesPrimary: string
  /** Secondary series color */
  seriesSecondary: string
  /** Tertiary series color */
  seriesTertiary: string
}

function cssVars(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string) => styles.getPropertyValue(name).trim()
  return {
    '--text-secondary': read('--text-secondary'),
    '--text-tertiary': read('--text-tertiary'),
    '--text-disabled': read('--text-disabled'),
    '--border-default': read('--border-default'),
    '--border-subtle': read('--border-subtle'),
    '--bg-elevated': read('--bg-elevated'),
    '--bg-surface': read('--bg-surface'),
    '--bg-app': read('--bg-app'),
    '--accent-primary': read('--accent-primary'),
  }
}

function toRgb(triplet: string | undefined, fallback: string): string {
  if (!triplet || !/^[\d\s.]+$/.test(triplet)) return fallback
  return `rgb(${triplet})`
}

export function getChartTokens(): ChartTokens {
  const v = cssVars()

  return {
    text: toRgb(v['--text-secondary'], '#94A3B8'),
    legend: toRgb(v['--text-tertiary'], '#64748B'),
    axisLabel: toRgb(v['--text-tertiary'], '#64748B'),
    axisLine: toRgb(v['--border-default'], '#334155'),
    splitLine: '#E2E8F0',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#CBD5E1',
    tooltipText: '#0F1F37',
    seriesBorder: toRgb(v['--bg-surface'], '#11161E'),
    seriesPrimary: '#243B6B',
    seriesSecondary: '#5B7DB1',
    seriesTertiary: '#2F7F8F',
  }
}

export function useChartTokens(): ChartTokens {
  useTheme()
  return getChartTokens()
}