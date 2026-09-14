import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Scale, Loader2 } from 'lucide-react'
import type { SectorCompliance } from '@/types/national'
import { formatPct } from './format'

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-status-low/15 text-status-low',
  PLANNED: 'bg-status-medium/15 text-status-medium',
  NOT_MAPPED: 'bg-status-critical/15 text-status-critical',
}

export default function ComplianceSectorPanel() {
  const [sectors, setSectors] = useState<string[]>([])
  const [sector, setSector] = useState('BANKING')
  const [compliance, setCompliance] = useState<SectorCompliance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getNationalSectors()
      .then((res) => {
        const available = res.data.map((s) => s.sector)
        setSectors(available)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setCompliance(null)
    riskApi
      .getSectorCompliance(sector)
      .then((res) => setCompliance(res.data))
      .catch(() => setCompliance(null))
      .finally(() => setLoading(false))
  }, [sector])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading sector compliance…
      </div>
    )
  }

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Scale className="h-4 w-4 text-status-info" />
          Sector Compliance Coverage
        </h3>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="cyber-input appearance-none bg-bg-elevated text-text-primary"
        >
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {!compliance ? (
        <p className="text-sm text-text-tertiary">No compliance mapping available for {sector}.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(compliance.regulators ?? []).map((r) => (
              <span key={r} className="rounded-full bg-status-info/10 px-2 py-0.5 text-[11px] font-medium text-status-info">
                {r}
              </span>
            ))}
            <span className="ml-auto text-xs text-text-tertiary">
              {compliance.coverage?.active_controls ?? 0}/{compliance.coverage?.total_control_types ?? 0} active ·{' '}
              {formatPct(compliance.coverage?.compliance_coverage_percent ?? 0, 0)} coverage
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Control</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Coverage</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Mandates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-surface">
                {(compliance.mapped_requirements ?? []).map((m) => (
                  <tr key={m.control_type} className="align-top transition-colors hover:bg-bg-hover">
                    <td className="px-3 py-2 text-sm font-medium text-text-primary">{m.control_type}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_STYLES[m.status] ?? 'bg-bg-hover text-text-secondary'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{formatPct(m.coverage_score * 100, 0)}</td>
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        {(m.mandates ?? []).map((mandate, i) => (
                          <p key={i} className="text-xs text-text-tertiary">
                            <span className="font-medium text-text-secondary">{(mandate as string[])[0]}</span>
                            {' — '}
                            {(mandate as string[])[1]}
                          </p>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}