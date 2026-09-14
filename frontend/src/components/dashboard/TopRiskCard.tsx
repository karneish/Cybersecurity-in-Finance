import { AlertTriangle } from 'lucide-react'
import type { RiskDriver } from '@/types/risk'
import { SEVERITY_CLASSES } from '@/theme/severity'

interface TopRiskCardProps {
  drivers: RiskDriver[]
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function TopRiskCard({ drivers }: TopRiskCardProps) {
  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-status-high" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-text-primary">Top Risk Drivers</h3>
      </div>
      <div className="space-y-3">
        {drivers.length === 0 && (
          <p className="text-sm text-text-tertiary">No risk drivers found.</p>
        )}
        {drivers.slice(0, 5).map((d, i) => (
          <div
            key={d.asset_id}
            className="flex items-center justify-between rounded-lg border border-border-subtle p-3 transition-colors hover:bg-bg-hover"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated border border-border-default text-xs font-bold text-text-secondary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">{d.asset_name}</p>
                <p className="text-xs text-text-tertiary">
                  {d.open_vulns} open vulns · EAL {formatINR(d.expected_annual_loss)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[d.risk_category] ?? 'bg-bg-elevated text-text-secondary'}`}
              >
                {d.risk_category}
              </span>
              <span className="text-sm font-bold text-text-primary">
                {d.risk_score.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}