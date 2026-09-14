import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Activity, Loader2 } from 'lucide-react'
import type { LossDistributionResult } from '@/types/riskInsights'

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function LossDistributionCard() {
  const [loss, setLoss] = useState<LossDistributionResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getLossDistribution()
      .then((res) => setLoss(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running 5,000 simulations...
      </div>
    )
  }

  if (!loss) return null

  const buckets = [
    { label: 'p5 (optimistic)', value: loss.p5_inr, color: 'text-status-low border-status-low/30 bg-status-low/10' },
    { label: 'p50 (median)', value: loss.p50_inr, color: 'text-accent-primary border-accent-primary/30 bg-accent-primary/10' },
    { label: 'p95 (stress)', value: loss.p95_inr, color: 'text-status-high border-status-high/30 bg-status-high/10' },
    { label: 'p99 (tail)', value: loss.p99_inr, color: 'text-status-critical border-status-critical/30 bg-status-critical/10' },
  ]

  return (
    <div className="cyber-card p-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Activity className="h-4 w-4 text-accent-secondary" />
        Monte Carlo Loss Distribution ({loss.simulations.toLocaleString()} sims)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {buckets.map((b) => (
          <div key={b.label} className={`rounded-lg border p-3 ${b.color}`}>
            <p className="text-[11px] font-medium opacity-80">{b.label}</p>
            <p className="mt-1 text-lg font-bold">{formatINR(b.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
