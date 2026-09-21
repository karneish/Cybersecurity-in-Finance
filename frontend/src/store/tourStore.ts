import { create } from 'zustand'
import type { TourStep } from '@/config/tourSteps'

interface TourState {
  open: boolean
  steps: TourStep[]
  active: number
  start: (steps: TourStep[]) => void
  stop: () => void
  next: (max?: number) => void
  prev: (max?: number) => void
}

export const useTourStore = create<TourState>((set) => ({
  open: false,
  steps: [],
  active: 0,

  start: (steps) =>
    set({ open: true, steps, active: 0 }),

  stop: () => set({ open: false }),

  next: (max) =>
    set((state) => ({
      active: Math.min(
        state.active + 1,
        max !== undefined ? Math.max(max - 1, 0) : Math.max(state.steps.length - 1, 0),
      ),
    })),

  prev: () =>
    set((state) => ({ active: Math.max(state.active - 1, 0) })),
}))