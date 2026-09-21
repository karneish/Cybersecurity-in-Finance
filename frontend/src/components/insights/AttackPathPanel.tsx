import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { useNotificationStore } from '@/store/notificationStore'
import { GitBranch } from 'lucide-react'
import type { AttackPathResult } from '@/types/riskInsights'

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function AttackPathPanel() {
  const [path, setPath] = useState<AttackPathResult | null>(null)
  const [loading, setLoading] = useState(true)
  const addNotification = useNotificationStore((s) => s.addNotification)

  useEffect(() => {
    riskApi
      .getAttackPath()
      .then((res) => setPath(res.data))
      .catch(() => addNotification('error', 'Failed to load attack path simulation'))
      .finally(() => setLoading(false))
  }, [addNotification])

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-text-tertiary">
        Loading attack path...
      </div>
    )
  }

  if (!path) return null

  return (
    <div className="cyber-card p-6" data-tour="attack-path">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <GitBranch className="h-4 w-4 text-accent-primary" />
        Crown-Jewel Attack Path
      </h3>
      <p className="mb-4 text-xs text-text-tertiary">
        From <span className="font-semibold">{path.stages?.[0]?.asset_name}</span> to{' '}
        <span className="font-semibold">{path.crown_jewel}</span>. Combined likelihood of a
        successful chain: {(path.overall_compromise_probability * 100).toFixed(2)}%.
      </p>

      <div className="space-y-2">
        {(path.stages ?? []).map((step) => (
          <div
            key={`${step.hop_label}-${step.asset_id}`}
            className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {step.hop_label.match(/\d+/)?.[0] ?? '#'}
              </span>
              <div>
                <p className="text-xs font-semibold text-text-primary">{step.asset_name}</p>
                <p className="text-[11px] text-text-tertiary">
                  {step.open_vulnerabilities} open vulns · ~{Math.ceil(step.time_hours / 24)} days to exploit
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-text-primary">
                {(step.stage_probability * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] text-status-high">{formatINR(step.eal_inr)} EAL at risk</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
