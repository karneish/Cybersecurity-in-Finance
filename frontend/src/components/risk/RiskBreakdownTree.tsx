import type { RiskDriver } from '@/types/risk'
import { GitBranch } from 'lucide-react'
import { SEVERITY_CLASSES, scoreTextColor } from '@/theme/severity'

interface RiskBreakdownTreeProps {
  drivers: RiskDriver[]
}

export default function RiskBreakdownTree({ drivers }: RiskBreakdownTreeProps) {
  if (drivers.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-tertiary">No risk drivers available</div>
    )
  }

  return (
    <div className="cyber-card p-6" data-tour="risk-breakdown">
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Risk Breakdown</h3>
      </div>
      <div className="space-y-3">
        {drivers.map((d) => (
          <div
            key={d.asset_id}
            className={`rounded-lg border-l-4 p-4 ${SEVERITY_CLASSES[d.risk_category] ?? 'border-border-default bg-bg-elevated'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{d.asset_name}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Category: {d.risk_category} · Open Vulns: {d.open_vulns}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-text-primary">{d.risk_score.toFixed(1)}</p>
                <p className="text-xs text-text-tertiary">
                  EAL: ₹{d.expected_annual_loss.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="mt-2 h-2 w-full flex-1 rounded-full bg-bg-hover">
                <div
                  className={`h-2 rounded-full ${scoreTextColor(d.risk_score)} opacity-60`}
                  style={{ width: `${Math.min(d.risk_score, 100)}%` }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${scoreTextColor(d.risk_score)}`}>
                {d.risk_category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}