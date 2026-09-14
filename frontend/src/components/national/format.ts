export function formatINR(value: number): string {
  if (Number.isNaN(value) || value === 0) return '₹0'
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

export function formatINRFull(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function shortUuid(value: string | null | undefined): string {
  if (!value) return '—'
  const parts = value.split('-')
  return parts.length > 1 ? parts[parts.length - 1] : value
}