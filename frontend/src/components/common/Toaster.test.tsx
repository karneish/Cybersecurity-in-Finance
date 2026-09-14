import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Toaster from './Toaster'
import { useToastStore } from '@/store/toastStore'

beforeEach(() => {
  useToastStore.getState().clearToasts()
})

describe('Toaster', () => {
  it('renders active toasts with their message', () => {
    useToastStore.getState().addToast('warning', 'Risk spike detected')
    render(<Toaster />)
    expect(screen.getByText('Risk spike detected')).toBeTruthy()
  })

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<Toaster />)
    expect(container.firstChild).toBeNull()
  })

  it('dismisses a toast when the close button is clicked', () => {
    useToastStore.getState().addToast('error', 'Failure alert')
    render(<Toaster />)

    fireEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(screen.queryByText('Failure alert')).toBeNull()
  })

  it('auto-dismisses a toast after the timeout', () => {
    vi.useFakeTimers()
    useToastStore.getState().addToast('info', 'Auto dismiss me')
    render(<Toaster />)
    expect(screen.getByText('Auto dismiss me')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(4600)
    })
    expect(screen.queryByText('Auto dismiss me')).toBeNull()
    vi.useRealTimers()
  })
})

afterEach(() => {
  vi.useRealTimers()
})