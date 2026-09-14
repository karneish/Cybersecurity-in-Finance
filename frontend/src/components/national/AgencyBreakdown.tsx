import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Building2, ChevronDown, ChevronRight, Loader2, Server } from 'lucide-react'
import { clsx } from 'clsx'
import type { AgencyRollup } from '@/types/national'
import { formatINR } from './format'

export default function AgencyBreakdown() {
  const [agencies, setAgencies] = useState<AgencyRollup[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getNationalAgencies()
      .then((res) => setAgencies(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading agency roll-ups...
      </div>
    )
  }

  if (agencies.length === 0) return null

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="cyber-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Building2 className="h-4 w-4 text-text-secondary" />
        Agencies & Critical Infrastructure
      </h3>

      <div className="space-y-2">
        {agencies.map((a) => {
          const open = expanded[a.agency_id]
          const sortedAssets = [...a.assets].sort((x, y) => y.expected_annual_loss - x.expected_annual_loss)
          return (
            <div key={a.agency_id} className="overflow-hidden rounded-lg border border-border-subtle">
              <button
                onClick={() => toggle(a.agency_id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-hover"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{a.name}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {a.sector ?? '—'} · {a.region ?? '—'} · {a.agency_type ?? '—'} ·{' '}
                    {a.classification ?? '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-status-high">{formatINR(a.expected_annual_loss)}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {a.critical_infra_count} CI · {a.asset_count} assets
                  </p>
                </div>
              </button>

              {open && (
                <div className="border-t border-border-subtle bg-bg-surface">
                  {sortedAssets.map((asset) => (
                    <div
                      key={asset.asset_id}
                      className="flex items-center justify-between gap-3 px-8 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-text-primary">
                        <Server className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" />
                        <span className="truncate">{asset.asset_name}</span>
                        {asset.critical_infra && (
                          <span
                            className={clsx(
                              'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              asset.critical_infra
                                ? 'bg-status-medium/15 text-status-medium'
                                : 'bg-bg-hover text-text-tertiary',
                            )}
                          >
                            CI
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-4 text-xs text-text-tertiary">
                        <span>Score {asset.risk_score.toFixed(1)}</span>
                        <span className="font-medium text-text-primary">{formatINR(asset.expected_annual_loss)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}