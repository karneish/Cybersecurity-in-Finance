import { beforeEach, describe, it, expect } from 'vitest'
import { useToastStore } from './toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts()
  })

  it('adds a toast and returns its id', () => {
    const { addToast } = useToastStore.getState()
    const id = addToast('warning', 'Risk spike detected')

    const s = useToastStore.getState()
    expect(s.toasts).toHaveLength(1)
    expect(s.toasts[0]).toMatchObject({ id, type: 'warning', message: 'Risk spike detected' })
  })

  it('preserves insertion order', () => {
    const { addToast } = useToastStore.getState()
    addToast('info', 'first')
    addToast('error', 'second')

    const s = useToastStore.getState()
    expect(s.toasts.map((t) => t.message)).toEqual(['first', 'second'])
  })

  it('dismisses a single toast by id', () => {
    const { addToast } = useToastStore.getState()
    const keepId = addToast('info', 'keep me')
    const dropId = addToast('info', 'drop me')

    useToastStore.getState().dismissToast(dropId)
    const s = useToastStore.getState()
    expect(s.toasts.map((t) => t.id)).toEqual([keepId])
  })

  it('clears all toasts', () => {
    const { addToast } = useToastStore.getState()
    addToast('info', 'x')
    addToast('success', 'y')
    useToastStore.getState().clearToasts()
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})