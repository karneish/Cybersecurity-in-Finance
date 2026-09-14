import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeverityBadge from './SeverityBadge'
import { SEVERITY_CLASSES } from '@/theme/severity'

describe('SeverityBadge', () => {
  it('shows the severity label', () => {
    render(<SeverityBadge severity="CRITICAL" />)
    expect(screen.getByText('CRITICAL')).toBeTruthy()
  })

  it('applies the correct severity colour classes', () => {
    const { container } = render(<SeverityBadge severity="LOW" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-status-low')
    expect(el.className).toContain(SEVERITY_CLASSES.LOW)
  })
})