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
  /** Primary series color (strong contrast in both themes) */
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
    '--gold': read('--gold'),
  }
}

function toRgb(triplet: string | undefined, fallback: string): string {
  if (!triplet || !/^[\d\s.]+$/.test(triplet)) return fallback
  return `rgb(${triplet})`
}

export function getChartTokens(): ChartTokens {
  const v = cssVars()

  const light = document.documentElement.getAttribute('data-theme') !== 'dark'

  return {
    text: toRgb(v['--text-secondary'], '#94A3B8'),
    legend: toRgb(v['--text-tertiary'], '#64748B'),
    axisLabel: toRgb(v['--text-tertiary'], '#64748B'),
    axisLine: toRgb(v['--border-default'], '#334155'),
    splitLine: light ? '#E2E8F0' : '#16202F',
    tooltipBg: light ? '#FFFFFF' : '#161C25',
    tooltipBorder: light ? '#CBD5E1' : '#252C37',
    tooltipText: light ? '#0F1F37' : '#F1F5F9',
    seriesBorder: toRgb(v['--bg-surface'], '#11161E'),
    seriesPrimary: light ? '#1D4ED8' : '#38BDF8',
    seriesSecondary: light ? '#B08416' : '#818CF8',
    seriesTertiary: light ? '#0E7490' : '#34D399',
  }
}

export function useChartTokens(): ChartTokens {
  useTheme()
  return getChartTokens()
}