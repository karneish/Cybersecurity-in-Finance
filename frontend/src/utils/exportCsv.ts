export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''

  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  )

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const raw = String(value)
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`
    }
    return raw
  }

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ]
  return lines.join('\n')
}

export function downloadBlob(content: string, filename: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string): void {
  downloadBlob(rowsToCsv(rows), filename)
}

export function downloadJson(data: Record<string, unknown>, filename: string): void {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json')
}