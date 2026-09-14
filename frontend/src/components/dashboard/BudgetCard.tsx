import { Wallet } from 'lucide-react'

interface BudgetCardProps {
  allocated: number
  total: number
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function BudgetCard({ allocated, total }: BudgetCardProps) {
  const pct = total > 0 ? (allocated / total) * 100 : 0

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-status-low/10">
          <Wallet className="h-4 w-4 text-status-low" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">Security Budget</p>
      <p className="mt-1 text-3xl font-semibold text-status-low">{formatINR(total)}</p>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>Allocated: {formatINR(allocated)}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-bg-hover">
          <div
            className="h-2 rounded-full bg-status-low transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}