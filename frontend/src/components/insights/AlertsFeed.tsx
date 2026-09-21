import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { riskApi } from '@/api/riskApi'
import { useWebSocket } from '@/hooks/useWebSocket'

interface AlertItem {
  id: string
  ruleName?: string
  metric: string
  observed: number
  threshold: number
  severity: string
  assetId?: string | null
  firedAt?: string
  message?: string
}

const SEVERITY_TONE: Record<string, string> = {
  CRITICAL: 'border-status-critical bg-status-critical/10 text-status-critical',
  HIGH: 'border-status-high bg-status-high/10 text-status-high',
  MEDIUM: 'border-status-medium bg-status-medium/10 text-status-medium',
  LOW: 'border-status-low bg-status-low/10 text-status-low',
  INFO: 'border-line-default bg-surface-card text-text-secondary',
}

function prettyTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function normalizeAlert(raw: Record<string, unknown>): AlertItem {
  return {
    id: String(raw.id ?? ''),
    ruleName: (raw.rule_name ?? raw.ruleName) as string | undefined,
    metric: String(raw.metric ?? ''),
    observed: Number(raw.observed ?? 0),
    threshold: Number(raw.threshold ?? 0),
    severity: String(raw.severity ?? 'INFO').toUpperCase(),
    assetId: (raw.asset_id ?? raw.assetId ?? null) as string | null,
    firedAt: (raw.fired_at ?? raw.firedAt) as string | undefined,
  }
}

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    riskApi
      .getAlertEvents(10)
      .then((res) => setAlerts(((res.data ?? []) as Record<string, unknown>[]).map(normalizeAlert)))
      .catch(() => setAlerts([]))
  }, [])

  useWebSocket((msg) => {
    if (msg.type !== 'alert') return
    const alert = normalizeAlert((msg.payload ?? {}) as Record<string, unknown>)
    if (alert.id) {
      setAlerts((prev) => [alert, ...prev].slice(0, 10))
    }
  })

  return (
    <div className="cyber-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="h-4 w-4 text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Live Alerts</h3>
        <span className="ml-auto rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary">
          {alerts.length}
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          No alerts fired — all thresholds are nominal.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-md border-l-4 px-3 py-2 ${SEVERITY_TONE[alert.severity] ?? SEVERITY_TONE.INFO}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{alert.ruleName ?? alert.metric}</span>
                <span className="opacity-70">{prettyTime(alert.firedAt)}</span>
              </div>
              <p className="mt-0.5 text-xs opacity-90">
                {alert.metric.replace(/_/g, ' ')} @ {alert.observed.toLocaleString('en-IN')} &gt; {alert.threshold.toLocaleString('en-IN')}
                {alert.assetId ? ` · asset ${alert.assetId.slice(0, 8)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}