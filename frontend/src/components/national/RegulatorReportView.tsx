import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { FileText, ShieldCheck, ShieldX, Loader2, AlertTriangle, Download } from 'lucide-react'
import { clsx } from 'clsx'
import type { NationalReport } from '@/types/national'
import type { AuditVerifyResult } from '@/types/riskInsights'
import { formatINR, formatPct } from './format'
import { exportTablePdf } from '@/utils/exportPdf'
import { useToastStore } from '@/store/toastStore'

export default function RegulatorReportView() {
  const [report, setReport] = useState<NationalReport | null>(null)
  const [verify, setVerify] = useState<AuditVerifyResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([riskApi.getNationalReport(), riskApi.verifyAuditChain()])
      .then(([repRes, verRes]) => {
        setReport(repRes.data)
        setVerify(verRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleExport() {
    if (!report) return
    const warnings = (report.early_warnings ?? []).map((w, i) => ({
      id: w.id ?? String(i + 1),
      type: w.title ?? w.warning_type,
      severity: w.severity ?? '—',
      target: `${w.target_type ?? ''} ${w.target_id ?? ''}`.trim() || '—',
      status: w.status ?? '—',
    }))
    const compliance = Object.entries(report.compliance_by_sector ?? {}).map(
      ([name, c]) => ({
        sector: name,
        regulators: (c.regulators ?? []).join(', ') || '—',
        controls: `${c.coverage?.active_controls ?? 0} / ${c.coverage?.total_control_types ?? 0}`,
        coverage: formatPct(c.coverage?.compliance_coverage_percent ?? 0, 0),
      })
    )
    exportTablePdf({
      title: 'Regulator-Ready National Report — Sovereign Cyber-Risk Observatory',
      subtitle: `National EAL ${formatINR(report.national.total_eal_inr)} · SRI ${report.national.sovereign_risk_index.toFixed(2)} · Generated ${new Date().toISOString().slice(0, 10)}`,
      filename: 'national-regulator-report.pdf',
      sections: [
        {
          title: 'Early Warnings',
          columns: [
            { header: 'ID', dataKey: 'id' },
            { header: 'Type', dataKey: 'type' },
            { header: 'Severity', dataKey: 'severity' },
            { header: 'Target', dataKey: 'target' },
            { header: 'Status', dataKey: 'status' },
          ],
          rows: warnings,
        },
        {
          title: 'Compliance by Sector',
          columns: [
            { header: 'Sector', dataKey: 'sector' },
            { header: 'Regulators', dataKey: 'regulators' },
            { header: 'Active / Total', dataKey: 'controls' },
            { header: 'Coverage', dataKey: 'coverage' },
          ],
          rows: compliance,
        },
      ],
    })
    useToastStore.getState().addToast('success', 'Regulator report exported as PDF')
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compiling regulator report…
      </div>
    )
  }

  if (!report) return null

  const sectorCompliance = Object.entries(report.compliance_by_sector ?? {})

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <FileText className="h-4 w-4 text-text-secondary" />
          Regulator-Ready National Report
        </h3>
        {verify && (
          <span
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              verify.tampered ? 'bg-status-critical/15 text-status-critical' : 'bg-status-low/15 text-status-low',
            )}
          >
            {verify.tampered ? (
              <ShieldX className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {verify.tampered
              ? `TAMPERED — ${verify.checked} entries`
              : `Audit chain intact — ${verify.checked} entries`}
          </span>
        )}
        <button
          onClick={handleExport}
          disabled={!report}
          className="flex items-center gap-1.5 rounded-button border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-active hover:text-text-primary disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border-subtle p-3">
            <p className="text-xs text-text-tertiary">National EAL</p>
            <p className="mt-1 text-lg font-bold text-status-high">{formatINR(report.national.total_eal_inr)}</p>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <p className="text-xs text-text-tertiary">Sovereign Risk Index</p>
            <p className="mt-1 text-lg font-bold text-accent-primary">{report.national.sovereign_risk_index.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <p className="text-xs text-text-tertiary">Assets / CI</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {report.national.total_assets} / {report.national.critical_infra_count}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <p className="text-xs text-text-tertiary">Open Vulnerabilities</p>
            <p className="mt-1 text-lg font-bold text-text-primary">{report.national.total_open_vulns}</p>
          </div>
        </div>

        {(report.early_warnings?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <AlertTriangle className="h-3.5 w-3.5 text-status-medium" /> Early Warnings
            </h4>
            <div className="space-y-1">
              {report.early_warnings.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm"
                >
                  <span className="text-text-primary">{w.title ?? w.warning_type}</span>
                  <span className="flex items-center gap-2 text-xs text-text-tertiary">
                    <span className="rounded-full bg-status-medium/10 px-2 py-0.5 font-semibold text-status-medium">
                      {w.severity ?? '—'}
                    </span>
                    <span>{w.target_type} · {w.target_id}</span>
                    <span className={w.status === 'ACTIVE' ? 'text-status-medium' : 'text-status-low'}>
                      {w.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sectorCompliance.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Compliance by Sector
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-subtle">
                <thead className="bg-bg-surface">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Sector</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Regulators</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Active / Total</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-bg-surface">
                  {sectorCompliance.map(([name, c]) => (
                    <tr key={name} className="transition-colors hover:bg-bg-hover">
                      <td className="px-3 py-2 text-sm font-medium text-text-primary">{name}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{(c.regulators ?? []).join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary">
                        {c.coverage?.active_controls ?? 0} / {c.coverage?.total_control_types ?? 0}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-bg-hover">
                            <div
                              className="h-2 rounded-full bg-status-low"
                              style={{ width: `${c.coverage?.compliance_coverage_percent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-tertiary">
                            {formatPct(c.coverage?.compliance_coverage_percent ?? 0, 0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border-subtle p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Data Quality</h4>
            <p className="text-sm text-text-secondary">
              {(report.data_quality as { confidence_percent?: number })?.confidence_percent !== undefined
                ? `Mean confidence ${formatPct(
                    (report.data_quality as { confidence_percent: number }).confidence_percent,
                    0,
                  )} · ${(report.data_quality as { gap_count?: number }).gap_count ?? 0} gaps across assets`
                : 'Data quality assessment unavailable in this report view.'}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">National Roll-up</h4>
            <p className="text-sm text-text-secondary">
              {report.sectors?.length ?? 0} sectors · {report.regions?.regions?.length ?? 0} regions ·{' '}
              {report.agencies?.length ?? 0} agencies consolidated into this report.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}