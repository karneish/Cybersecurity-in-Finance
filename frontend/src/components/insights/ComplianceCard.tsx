import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Scale, Loader2, Fingerprint } from 'lucide-react'
import type { ComplianceResult } from '@/types/riskInsights'

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-status-low/15 text-status-low',
  PLANNED: 'bg-status-medium/15 text-status-medium',
  NOT_MAPPED: 'bg-status-critical/15 text-status-critical',
}

export default function ComplianceCard() {
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getCompliance()
      .then((res) => setCompliance(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking compliance mapping...
      </div>
    )
  }

  if (!compliance) return null

  return (
    <div className="cyber-card relative p-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Scale className="h-4 w-4 text-status-info" />
        Compliance Control Mapping
      </h3>
      <div className="absolute right-4 top-5 flex items-center gap-1.5 rounded-full border border-status-low/30 bg-status-low/10 px-2.5 py-1 text-[10px] font-semibold text-status-low">
        <Fingerprint className="h-3 w-3" />
        Audit-chain sealed
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {(compliance.regulations ?? []).map((r) => (
          <span key={r} className="rounded-full bg-status-info/10 px-2 py-0.5 text-[11px] font-medium text-status-info">
            {r}
          </span>
        ))}
      </div>
      <div className="mb-3 text-xs text-text-tertiary">
        {compliance.coverage?.active_controls ?? 0} of {compliance.coverage?.total_control_types ?? 0} control types active ·{' '}
        {compliance.coverage?.compliance_coverage_percent ?? 0}% coverage
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
        {(compliance.mapped_requirements ?? []).map((s) => (
          <div key={s.control_type} className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-1.5">
            <span className="text-xs font-medium text-text-primary">{s.control_type}</span>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[s.status] ?? 'bg-bg-hover text-text-secondary'}`}>
                {s.status.replace('_', ' ')}
              </span>
              <span className="text-[11px] text-text-tertiary">{s.mandates?.length ?? 0} mandates</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
