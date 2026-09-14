import { useEffect, useState } from 'react'
import { Database, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { clsx } from 'clsx'
import { riskApi } from '@/api/riskApi'
import type { DataSourceResult } from '@/types/riskInsights'

function statusStyles(status: string) {
  switch (status) {
    case 'CONNECTED':
      return 'bg-status-low/10 text-status-low border-status-low/30'
    case 'ACTIVE':
      return 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
    case 'DEGRADED':
      return 'bg-status-medium/10 text-status-medium border-status-medium/30'
    default:
      return 'bg-status-critical/10 text-status-critical border-status-critical/30'
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function DataSourcesPanel() {
  const [sources, setSources] = useState<DataSourceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    riskApi
      .getDataSources()
      .then((res) => setSources(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const connected = sources.filter((s) => s.status === 'CONNECTED' || s.status === 'ACTIVE').length

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Database className="h-4 w-4 text-accent-primary" />
          Ingestion Data Sources
        </h3>
        <button
          onClick={load}
          className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary transition hover:border-accent-primary/40 hover:text-accent-primary"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-text-tertiary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking connectors...
        </div>
      ) : error || sources.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-tertiary">
          {error ? 'Connectors unavailable. Is the risk engine running?' : 'No data sources configured.'}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-status-low" />
              {connected}/{sources.length} online
            </span>
            <span className="h-3 w-px bg-border-subtle" />
            <span className="text-text-tertiary">
              Event streaming → factor refresh → EAL recompute
            </span>
          </div>
          <div className="space-y-2.5">
            {sources.map((s) => {
              const connectedSource = s.status === 'CONNECTED' || s.status === 'ACTIVE'
              return (
                <div
                  key={s.source_key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{s.name}</span>
                      <span className="font-mono text-[10px] text-text-tertiary">{s.source_key}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-text-tertiary">
                      {s.connector_type} · {s.description ?? 'Telemetry connector'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="text-text-tertiary">
                        {connectedSource ? 'Ingested' : 'Last seen'}{' '}
                        <span className="font-medium text-text-secondary">{relativeTime(s.last_ingested_at)}</span>
                      </p>
                      <p className="mt-0.5 text-text-tertiary">
                        {s.records_ingested.toLocaleString()} records
                        {s.error_count > 0 && (
                          <span className="text-status-medium"> · {s.error_count} err</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                        statusStyles(s.status)
                      )}
                    >
                      {connectedSource ? (
                        <Wifi className="h-3 w-3" />
                      ) : (
                        <WifiOff className="h-3 w-3" />
                      )}
                      {s.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}