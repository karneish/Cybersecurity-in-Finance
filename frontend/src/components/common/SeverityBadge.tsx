import { clsx } from 'clsx'
import type { Severity } from '@/types/vulnerability'
import { SEVERITY_CLASSES } from '@/theme/severity'

interface SeverityBadgeProps {
  severity: Severity
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        SEVERITY_CLASSES[severity]
      )}
    >
      {severity}
    </span>
  )
}