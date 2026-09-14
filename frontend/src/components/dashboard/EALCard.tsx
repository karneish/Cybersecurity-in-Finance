import { IndianRupee, TrendingDown, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'

interface EALCardProps {
  eal: number
  previousEal?: number
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function EALCard({ eal, previousEal }: EALCardProps) {
  const diff = previousEal ? eal - previousEal : 0
  const improved = diff < 0

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-status-high/10">
          <IndianRupee className="h-4 w-4 text-status-high" strokeWidth={1.75} />
        </div>
        {diff !== 0 && (
          <span
            className={clsx(
              'flex items-center gap-1 text-xs font-medium',
              improved ? 'text-status-low' : 'text-status-critical'
            )}
          >
            {improved ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" />
            )}
            {formatINR(Math.abs(diff))}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
        Expected Annual Loss
      </p>
      <p className="mt-1 text-3xl font-semibold text-status-high">{formatINR(eal)}</p>
    </div>
  )
}