import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react'
import type { SectorRollup } from '@/types/national'
import { formatINR, formatPct } from './format'

export default function SectorRiskChart() {
  const [sectors, setSectors] = useState<SectorRollup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getNationalSectors()
      .then((res) => setSectors(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading sector risk...
      </div>
    )
  }

  const sorted = [...sectors].sort((a, b) => b.expected_annual_loss - a.expected_annual_loss)

  const option: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = params as { name: string; value: number }[]
        const row = list[0]
        return `${row.name}<br/><b>${formatINR(row.value)}</b>`
      },
    },
    grid: { left: 8, right: 8, top: 30, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map((s) => s.sector),
      axisLabel: { color: '#64748B' },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#64748B',
        formatter: (v: number) => {
          if (v >= 10000000) return `${(v / 10000000).toFixed(0)} Cr`
          if (v >= 100000) return `${(v / 100000).toFixed(0)} L`
          return String(v)
        },
      },
    },
    series: [
      {
        name: 'Expected Annual Loss',
        type: 'bar',
        data: sorted.map((s) => s.expected_annual_loss),
        itemStyle: { color: '#243B6B', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 48,
      },
    ],
  }

  return (
    <div className="cyber-card p-6" data-tour="sector-risk">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <BarChart3 className="h-4 w-4 text-text-secondary" />
        Sector Risk Exposure
      </h3>

      {sectors.length > 0 && <EChart option={option} height={220} />}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-bg-surface">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Sector</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Regulator</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">EAL</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Share</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Risk</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">SRI</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Coverage</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-bg-surface">
            {sorted.map((s) => (
              <tr key={s.sector} className="transition-colors hover:bg-bg-hover">
                <td className="px-3 py-2 text-sm font-medium text-text-primary">
                  {s.sector}
                  <span className="block text-[11px] text-text-tertiary">{s.sector_name}</span>
                </td>
                <td className="px-3 py-2 text-sm text-text-secondary">{s.regulator ?? '—'}</td>
                <td className="px-3 py-2 text-sm font-medium text-status-high">{formatINR(s.expected_annual_loss)}</td>
                <td className="px-3 py-2 text-sm text-text-secondary">{formatPct(s.eal_share_percent)}</td>
                <td className="px-3 py-2 text-sm text-text-primary">{s.average_risk_score.toFixed(1)}</td>
                <td className="px-3 py-2 text-sm font-medium text-accent-primary">{s.sovereign_risk_index.toFixed(2)}</td>
                <td className="px-3 py-2 text-sm text-text-secondary">{formatPct(s.control_coverage_percent, 0)}</td>
                <td className="px-3 py-2">
                  {s.threshold_exceeded ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-status-critical">
                      <AlertTriangle className="h-3.5 w-3.5" /> Exceeds ₹{s.threshold_critical_mln}M
                    </span>
                  ) : (
                    <span className="text-xs text-status-low">Within threshold</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}