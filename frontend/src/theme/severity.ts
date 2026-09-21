export const SEVERITY_HEX: Record<string, string> = {
  CRITICAL: '#B8393F',
  HIGH: '#C05A1F',
  MEDIUM: '#A67D1E',
  LOW: '#2F7D52',
  INFO: '#3B6F92',
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
  if (s >= 80) return '#B8393F'
  if (s >= 60) return '#C05A1F'
  if (s >= 40) return '#A67D1E'
  return '#2F7D52'
}
