import { useEffect, useState } from 'react'
import { assetApi } from '@/api/assetApi'
import { ingestionApi } from '@/api/ingestionApi'
import { useNotificationStore } from '@/store/notificationStore'
import { Radio, Bug, ShieldCheck, Wrench, Loader2 } from 'lucide-react'
import type { Asset } from '@/types/asset'

const CONTROL_TYPES = ['MFA', 'EDR', 'PATCH', 'FW', 'WAF', 'DLP', 'SIEM', 'BACKUP']

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-status-low/15 text-status-low',
  DISABLED: 'bg-status-critical/15 text-status-critical',
}

type SimKind = 'vulnerability' | 'remediate' | 'control'

export default function EventSimulator() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState('')
  const [cvss, setCvss] = useState(8.5)
  const [cveId, setCveId] = useState('CVE-2026-')
  const [controlType, setControlType] = useState('MFA')
  const [status, setStatus] = useState('ACTIVE')
  const [kind, setKind] = useState<SimKind>('vulnerability')
  const [running, setRunning] = useState<SimKind | null>(null)
  const notify = useNotificationStore()

  useEffect(() => {
    assetApi
      .list({ size: 100 })
      .then((res) => setAssets(res.data.data))
      .catch(() => {})
  }, [])

  const run = async (k: SimKind) => {
    if (!assetId) {
      notify.addNotification('warning', 'Select an asset first')
      return
    }
    setRunning(k)
    try {
      if (k === 'vulnerability') {
        await ingestionApi.simulateVulnerability({
          assetId,
          cvss,
          cveId: cveId || undefined,
        })
        notify.addNotification('info', `Ingested simulated vulnerability ${cveId} (CVSS ${cvss})`)
      } else if (k === 'remediate') {
        await ingestionApi.remediateVulnerability({ assetId, cveId: cveId || undefined })
        notify.addNotification('success', `Simulated remediation of ${cveId || 'latest finding'}`)
      } else {
        await ingestionApi.changeControl({ assetId, controlType, status })
        notify.addNotification('success', `Control ${controlType} set to ${status}`)
      }
    } catch {
      notify.addNotification('error', 'Event simulation failed. Is the backend stack up?')
    } finally {
      setRunning(null)
    }
  }

  const assetLabel = (a: Asset) => `${a.name} (${a.asset_type})`

  return (
    <div className="cyber-card p-6" data-tour="event-simulator">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Radio className="h-4 w-4 text-status-critical" />
        Event Simulator (Live Demo Loop)
      </h3>

      <label className="mb-1 block text-xs font-medium text-text-secondary">Target Asset</label>
      <select
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        className="mb-4 w-full cyber-input"
      >
        <option value="">Select asset...</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {assetLabel(a)}
          </option>
        ))}
      </select>

      <div className="mb-3 flex gap-1 rounded-lg bg-bg-hover p-1">
        {(
          [
            { k: 'vulnerability' as const, label: 'Add Vuln', icon: Bug },
            { k: 'remediate' as const, label: 'Remediate', icon: Wrench },
            { k: 'control' as const, label: 'Control', icon: ShieldCheck },
          ]
        ).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              kind === k ? 'bg-bg-surface text-accent-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {kind === 'vulnerability' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">CVE ID</label>
            <input
              value={cveId}
              onChange={(e) => setCveId(e.target.value)}
              className="w-full cyber-input font-mono"
              placeholder="CVE-2026-XXXX"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs font-medium text-text-secondary">
              <span>CVSS Score</span>
              <span>{cvss.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="0.1"
              value={cvss}
              onChange={(e) => setCvss(Number(e.target.value))}
              className="mt-1 w-full accent-accent-primary"
            />
          </div>
        </div>
      )}

      {kind === 'remediate' && (
        <p className="text-xs text-text-tertiary">
          Remediates the given CVE (or the latest finding on the asset). Control-based EAL drops immediately.
        </p>
      )}

      {kind === 'control' && (
        <div className="space-y-3">
          <select
            value={controlType}
            onChange={(e) => setControlType(e.target.value)}
            className="w-full cyber-input"
          >
            {CONTROL_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`w-full rounded-lg border px-2 py-1.5 text-sm ${STATUS_STYLES[status] ?? ''}`}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </div>
      )}

      <button
        onClick={() => run(kind)}
        disabled={running !== null}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
        {running ? 'Sending...' : 'Send Event'}
      </button>
      <p className="mt-2 text-[11px] text-text-tertiary">
        Event flows: ingestion → Redis → risk-engine → re-calc → STOMP push. Watch live EAL/score update.
      </p>
    </div>
  )
}
