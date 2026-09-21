import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTourStore } from '@/store/tourStore'
import { ChevronLeft, ChevronRight, X, Compass, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import type { TourStep } from '@/config/tourSteps'

interface SpotRect {
  top: number
  left: number
  width: number
  height: number
}

interface TipPos {
  top: number
  left: number
}

type TourItem =
  | { kind: 'page'; step: TourStep }
  | {
      kind: 'section'
      step: TourStep
      selector: string
      label: string
      detail: string
    }

const DISMISS_KEY = 'scro-tour-dismissed'
const GAP = 16
const PAD = 8

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, 'yes')
  } catch {}
}

export default function GuidedTour() {
  const navigate = useNavigate()
  const { open, steps, active, next, prev, stop } = useTourStore()
  const [spot, setSpot] = useState<SpotRect | null>(null)
  const [tip, setTip] = useState<TipPos | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo<TourItem[]>(
    () =>
      steps.flatMap((step) => [
        { kind: 'page', step } as TourItem,
        ...(step.sections ?? []).map(
          (s) =>
            ({
              kind: 'section',
              step,
              selector: s.selector,
              label: s.label,
              detail: s.detail,
            }) as TourItem,
        ),
      ]),
    [steps],
  )

  const safeActive = Math.min(active, Math.max(items.length - 1, 0))
  const item: TourItem | undefined = items[safeActive]
  const isSection = item?.kind === 'section'

  const measure = (selector: string) => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      setSpot({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      })
    }
  }

  useEffect(() => {
    if (!open || items.length === 0 || !item) return

    if (item.kind === 'page') {
      setSpot(null)
      setTip(null)
      navigate(item.step.path)
      return
    }

    const { selector } = item
    const timers: number[] = []
    const delays = [300, 400, 800, 1600, 3200]
    const attempt = (tryNo = 0) => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        timers.push(window.setTimeout(() => measure(selector), 350))
        timers.push(window.setTimeout(() => measure(selector), 700))
        return
      }
      if (tryNo < delays.length) {
        timers.push(window.setTimeout(() => attempt(tryNo + 1), delays[tryNo]))
      } else {
        setSpot(null)
        setTip(null)
      }
    }
    attempt()
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, safeActive, items, navigate])

  useEffect(() => {
    if (!open || !isSection || !item || item.kind !== 'section') return
    const { selector } = item
    const onScroll = () => measure(selector)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, safeActive, isSection])

  useEffect(() => {
    if (!open || !isSection || !item || item.kind !== 'section' || !spot) {
      setTip(null)
      return
    }
    const card = cardRef.current
    const cardW = card ? card.offsetWidth : 340
    const cardH = card ? card.offsetHeight : 320
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = spot.left + spot.width + GAP
    let below = true
    if (left + cardW > vw - PAD) {
      const alt = spot.left - cardW - GAP
      if (alt >= PAD) {
        left = alt
      } else {
        left = Math.round(
          Math.min(Math.max(spot.left + spot.width / 2 - cardW / 2, PAD), vw - cardW - PAD),
        )
        below = false
      }
    }

    let top = below ? spot.top + spot.height + GAP : spot.top - cardH - GAP
    if (below && top + cardH > vh - PAD) {
      top = spot.top - cardH - GAP
    }
    if (!below && top < PAD) {
      top = spot.top + spot.height + GAP
    }
    top = Math.round(Math.max(PAD, Math.min(top, vh - cardH - PAD)))
    left = Math.round(Math.max(PAD, Math.min(left, vw - cardW - PAD)))

    if (tip && Math.abs(tip.top - top) < 1 && Math.abs(tip.left - left) < 1) return
    setTip({ top, left })
  }, [open, safeActive, isSection, spot, item, tip])

  if (!open || items.length === 0 || !item) return null

  const isLast = safeActive === items.length - 1
  const moduleCount = items.reduce((n, i) => n + (i.kind === 'page' ? 1 : 0), 0)
  const moduleIndex = items
    .slice(0, safeActive + 1)
    .reduce((n, i) => n + (i.kind === 'page' ? 1 : 0), 0)

  const finish = () => {
    markDismissed()
    stop()
  }

  const anchored = isSection && spot !== null && tip !== null

  const cardContent = (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-modal">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-surface-2 px-5 py-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-accent-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            Guided tour
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isSection && item.kind === 'section' && (
            <span className="hidden items-center gap-1 rounded-full bg-accent-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-primary sm:flex">
              <Eye className="h-3 w-3" />
              Highlighted on the page
            </span>
          )}
          <span className="text-[11px] font-medium text-text-tertiary">
            Step {safeActive + 1} of {items.length}
          </span>
          <button
            onClick={finish}
            aria-label="End tour"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg',
              'bg-accent-primary/10 text-accent-primary',
            )}
          >
            {isSection && item.kind === 'section' ? (
              <Eye className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <item.step.icon className="h-5 w-5" strokeWidth={1.75} />
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {isSection && item.kind === 'section'
                ? `Section inside ${item.step.label}`
                : 'This is the'}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-text-primary">
                {isSection && item.kind === 'section' ? item.label : item.step.label}
              </h3>
              {isSection && item.kind === 'section' && (
                <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                  {item.step.label}
                </span>
              )}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              {isSection && item.kind === 'section' ? item.detail : item.step.detail}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-text-tertiary">
            {isSection
              ? 'Tip: scroll freely — the highlight follows the section.'
              : `Module ${moduleIndex} of ${moduleCount}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => prev()}
            disabled={safeActive === 0}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {isLast ? (
            <button
              onClick={finish}
              className="flex h-9 items-center gap-1.5 rounded-md bg-accent-primary px-4 text-[13px] font-semibold text-white transition-colors hover:brightness-110"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={() => next(items.length)}
              className="flex h-9 items-center gap-1.5 rounded-md bg-accent-primary px-4 text-[13px] font-semibold text-white transition-colors hover:brightness-110"
            >
              <span className="hidden sm:inline">{isSection ? 'Next section' : 'Next'}</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {spot ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[#0b1b3c]/45" />
          <div
            className="absolute rounded-lg border-2 border-accent-primary shadow-[0_0_0_6px_rgba(28,110,182,0.3)]"
            style={{
              top: spot.top - 4,
              left: spot.left - 4,
              width: spot.width + 8,
              height: spot.height + 8,
            }}
          />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[#0b1b3c]/45" />
      )}

      {anchored ? (
        <div
          ref={cardRef}
          className="pointer-events-auto absolute w-[min(340px,calc(100vw-1rem))]"
          style={{ top: tip.top, left: tip.left }}
        >
          {cardContent}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 px-3 sm:bottom-0 sm:top-1/2 sm:flex sm:-translate-y-1/2 sm:justify-center">
          <div className="pointer-events-auto">{cardContent}</div>
        </div>
      )}
    </div>
  )
}