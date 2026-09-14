export const SEVERITY_HEX: Record<string, string> = {
  CRITICAL: '#F43F5E',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#22C55E',
  INFO: '#38BDF8',
}

export const SEVERITY_CLASSES: Record<string, string> = {
  CRITICAL: 'border-status-critical bg-status-critical/15 text-status-critical',
  HIGH: 'border-status-high bg-status-high/15 text-status-high',
  MEDIUM: 'border-status-medium bg-status-medium/15 text-status-medium',
  LOW: 'border-status-low bg-status-low/15 text-status-low',
  INFO: 'border-status-info bg-status-info/15 text-status-info',
}

export const scoreTextColor = (s: number): string => {
  if (s >= 80) return 'text-status-critical'
  if (s >= 60) return 'text-status-high'
  if (s >= 40) return 'text-status-medium'
  return 'text-status-low'
}

export const scoreRingColor = (s: number): string => {
  if (s >= 80) return 'stroke-status-critical'
  if (s >= 60) return 'stroke-status-high'
  if (s >= 40) return 'stroke-status-medium'
  return 'stroke-status-low'
}

export const scoreHex = (s: number): string => {
  if (s >= 80) return '#F43F5E'
  if (s >= 60) return '#F97316'
  if (s >= 40) return '#F59E0B'
  return '#22C55E'
}
