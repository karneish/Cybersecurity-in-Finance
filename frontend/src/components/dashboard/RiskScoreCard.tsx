import { Shield, TrendingDown, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'

interface RiskScoreCardProps {
  score: number
  previousScore?: number
}

export default function RiskScoreCard({ score, previousScore }: RiskScoreCardProps) {
  const diff = previousScore ? score - previousScore : 0
  const improved = diff < 0

  const getColor = (s: number) => {
    if (s >= 80) return 'text-status-critical'
    if (s >= 60) return 'text-status-high'
    if (s >= 40) return 'text-status-medium'
    return 'text-status-low'
  }

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-primary/15">
          <Shield className="h-4 w-4 text-accent-primary" strokeWidth={1.75} />
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
            {Math.abs(diff).toFixed(1)}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
        Enterprise Risk Score
      </p>
      <p className={clsx('mt-1 text-3xl font-semibold', getColor(score))}>{score.toFixed(1)}</p>
    </div>
  )
}