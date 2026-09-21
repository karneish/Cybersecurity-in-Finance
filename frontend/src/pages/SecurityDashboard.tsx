import { useState, useEffect } from 'react'
import { vulnerabilityApi } from '@/api/vulnerabilityApi'
import { controlApi } from '@/api/controlApi'
import DataTable from '@/components/common/DataTable'
import SeverityBadge from '@/components/common/SeverityBadge'
import VulnerabilityPieChart from '@/components/charts/VulnerabilityPieChart'
import EventSimulator from '@/components/insights/EventSimulator'
import AttackPathPanel from '@/components/insights/AttackPathPanel'
import BlastRadiusPanel from '@/components/insights/BlastRadiusPanel'
import type { Vulnerability, Severity } from '@/types/vulnerability'
import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion } from 'lucide-react'

interface SeverityCount {
  label: string
  count: number
  color: string
  icon: React.ReactNode
}

interface ControlCoverageItem {
  type: string
  achieved: number
  potential: number
}

export default function SecurityDashboard() {
  const [vulns, setVulns] = useState<Vulnerability[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [controls, setControls] = useState<ControlCoverageItem[]>([])
  const [coverage, setCoverage] = useState(0)

  useEffect(() => {
    Promise.all([
      vulnerabilityApi.list({ page: 1, size: 20 }),
      vulnerabilityApi.getStats(),
      controlApi.getCoverage(),
      controlApi.list(),
    ])
      .then(([vulnRes, statsRes, covRes, controlListRes]) => {
        setVulns(vulnRes.data.data)
        setStats(statsRes.data.by_severity)
        setCoverage(covRes.data.coverage_percentage ?? 0)

        const controlList = controlListRes.data ?? []
        const byType = new Map<string, number>()
        const types = new Set<string>()
        for (const c of controlList) {
          types.add(c.control_type)
          byType.set(c.control_type, (byType.get(c.control_type) ?? 0) + 1)
        }
        const total = controlList.length || 1
        setControls(
          Array.from(types)
            .map((type) => ({
              type,
              achieved: (byType.get(type) ?? 0) / total,
              potential: 1,
            }))
            .slice(0, 8)
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const severityCards: SeverityCount[] = [
    {
      label: 'Critical',
      count: stats['critical'] ?? 0,
      color: 'bg-status-critical/10 text-status-critical border-status-critical/30',
      icon: <ShieldX className="h-5 w-5 text-status-critical" />,
    },
    {
      label: 'High',
      count: stats['high'] ?? 0,
      color: 'bg-status-high/10 text-status-high border-status-high/30',
      icon: <ShieldAlert className="h-5 w-5 text-status-high" />,
    },
    {
      label: 'Medium',
      count: stats['medium'] ?? 0,
      color: 'bg-status-medium/10 text-status-medium border-status-medium/30',
      icon: <ShieldQuestion className="h-5 w-5 text-status-medium" />,
    },
    {
      label: 'Low',
      count: stats['low'] ?? 0,
      color: 'bg-status-low/10 text-status-low border-status-low/30',
      icon: <ShieldCheck className="h-5 w-5 text-status-low" />,
    },
  ]

  const columns = [
    { key: 'cve_id', label: 'CVE ID', render: (v: unknown) => (
      <span className="font-mono text-xs">{(v as string) ?? '—'}</span>
    )},
    { key: 'title', label: 'Title' },
    { key: 'severity', label: 'Severity', render: (v: unknown) => (
      <SeverityBadge severity={v as Severity} />
    )},
    { key: 'cvss_score', label: 'CVSS', render: (v: unknown) => (
      <span className="font-mono font-bold">{(v as number).toFixed(1)}</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => {
      const status = v as string
      const colorMap: Record<string, string> = {
        OPEN: 'bg-status-critical/15 text-status-critical',
        IN_PROGRESS: 'bg-status-medium/15 text-status-medium',
        REMEDIATED: 'bg-status-low/15 text-status-low',
        ACCEPTED: 'bg-bg-hover text-text-secondary',
        FALSE_POSITIVE: 'bg-status-info/15 text-status-info',
      }
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-bg-hover text-text-secondary'}`}>
          {status}
        </span>
      )
    }},
    { key: 'affected_asset', label: 'Asset' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Command Center</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-tour="severity-stats">
        {severityCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${card.color}`}
          >
            <div className="flex items-center gap-2">
              {card.icon}
              <span className="text-sm font-medium">{card.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EventSimulator />
        <AttackPathPanel />
        <BlastRadiusPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2" data-tour="recent-vulnerabilities">
          <div className="cyber-card">
            <div className="border-b border-border-default px-6 py-4">
              <h3 className="text-sm font-semibold text-text-primary">Recent Vulnerabilities</h3>
            </div>
            <DataTable
              columns={columns}
              data={vulns as unknown as Record<string, unknown>[]}
              loading={loading}
              emptyMessage="No vulnerabilities found"
            />
          </div>
        </div>
        <div className="space-y-6">
          <div className="cyber-card p-6" data-tour="severity-distribution">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Severity Distribution</h3>
            <VulnerabilityPieChart />
          </div>
          <div className="cyber-card p-6" data-tour="control-coverage">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">Control Coverage</h3>
            <div className="mb-3 rounded-lg bg-accent-primary/10 p-3 text-center">
              <p className="text-2xl font-bold text-accent-primary">{coverage.toFixed(0)}%</p>
              <p className="text-[11px] text-accent-primary/70">assets with controls</p>
            </div>
            <div className="space-y-3">
              {controls.map((c) => {
                const pct = c.potential > 0 ? (c.achieved / c.potential) * 100 : 0
                return (
                  <div key={c.type}>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>{c.type}</span>
                      <span>{pct.toFixed(0)}% reduction achieved</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-bg-hover">
                      <div
                        className="h-2 rounded-full bg-accent-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
