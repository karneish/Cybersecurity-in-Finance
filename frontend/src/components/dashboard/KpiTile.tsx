import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface KpiTileProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'primary' | 'critical' | 'high' | 'medium' | 'low'
  diff?: number
  positiveIsGood?: boolean
}

export default function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'primary',
  diff,
  positiveIsGood = false,
}: KpiTileProps) {
  const diffGood = diff !== undefined && (positiveIsGood ? diff >= 0 : diff <= 0)
  const colorMap: Record<string, string> = {
    primary: 'text-accent-primary bg-accent-primary/15',
    critical: 'text-status-critical bg-status-critical/10',
    high: 'text-status-high bg-status-high/10',
    medium: 'text-status-medium bg-status-medium/10',
    low: 'text-status-low bg-status-low/10',
  }

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between">
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-md', colorMap[tone])}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        {diff !== undefined && diff !== 0 && (
          <span
            className={clsx(
              'flex items-center gap-1 text-xs font-medium',
              diffGood ? 'text-status-low' : 'text-status-critical'
            )}
          >
            {diff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(diff).toFixed(1)}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="mt-1 text-xs text-text-tertiary">{sub}</p>}
    </div>
  )
}