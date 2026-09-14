

interface Column<T> {
  key: string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading: boolean
  emptyMessage: string
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj) as unknown
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-md bg-bg-hover" style={{ height: 40 }} />
        ))}
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-text-primary">{emptyMessage}</p>
        <p className="mt-1 text-xs text-text-tertiary">No records available for the current view.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border-subtle">
        <thead className="bg-bg-surface">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary ${col.className ?? ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-bg-surface">
          {data.map((row, i) => (
            <tr
              key={i}
              className={`${i % 2 === 0 ? '' : 'bg-bg-elevated'} transition-colors hover:bg-bg-hover`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-sm text-text-secondary ${col.className ?? ''}`}>
                  {col.render
                    ? col.render(getNestedValue(row, col.key), row)
                    : (getNestedValue(row, col.key) as React.ReactNode) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}