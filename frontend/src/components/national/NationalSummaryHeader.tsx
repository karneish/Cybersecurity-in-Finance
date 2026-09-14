import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Gauge, Activity, ShieldAlert, Server, Bug, Building2, Loader2 } from 'lucide-react'
import type { NationalSummary } from '@/types/national'
import { formatINR, formatPct } from './format'

export default function NationalSummaryHeader() {
  const [summary, setSummary] = useState<NationalSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getNationalSummary()
      .then((res) => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading national summary...
      </div>
    )
  }

  if (!summary) return null

  const topSector = summary.top_sectors?.[0]

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-primary/15">
            <Gauge className="h-5 w-5 text-accent-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Sovereign Cyber-Risk Observatory</h2>
            <p className="text-xs text-text-tertiary">As on {summary.as_on}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-3 py-1.5">
          <span className="text-xs font-medium text-accent-primary">Sovereign Risk Index</span>
          <span className="text-lg font-bold text-accent-primary">{summary.sovereign_risk_index.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border-subtle p-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Activity className="h-4 w-4" />
            <span className="text-xs">National EAL</span>
          </div>
          <p className="mt-1 text-xl font-bold text-status-high">{formatINR(summary.total_eal_inr)}</p>
        </div>
        <div className="rounded-lg border border-border-subtle p-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-xs">Average Risk Score</span>
          </div>
          <p className="mt-1 text-xl font-bold text-text-primary">{summary.average_risk_score.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border border-border-subtle p-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Server className="h-4 w-4" />
            <span className="text-xs">Critical Infrastructure</span>
          </div>
          <p className="mt-1 text-xl font-bold text-status-medium">
            {summary.critical_infra_count} / {summary.total_assets}
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle p-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Bug className="h-4 w-4" />
            <span className="text-xs">Open Vulnerabilities</span>
          </div>
          <p className="mt-1 text-xl font-bold text-text-primary">{summary.total_open_vulns}</p>
        </div>
      </div>

      {summary.framing && (
        <p className="mt-4 rounded-lg border border-accent-primary/20 bg-accent-primary/5 px-4 py-3 text-sm leading-relaxed text-text-secondary">
          {summary.framing}
        </p>
      )}

      {topSector && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-bg-elevated px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-text-tertiary">
            <Building2 className="h-4 w-4" />
            Highest-risk sector
          </span>
          <span className="font-bold text-text-primary">{topSector.sector}</span>
          <span className="text-status-high">{formatINR(topSector.expected_annual_loss)}</span>
          <span className="text-text-tertiary">
            SRI {formatPct(topSector.sovereign_risk_index * 100, 0)}
          </span>
          <span className="text-text-tertiary">
            Present in: {summary.regions_present?.join(', ') ?? '—'}
          </span>
        </div>
      )}
    </div>
  )
}