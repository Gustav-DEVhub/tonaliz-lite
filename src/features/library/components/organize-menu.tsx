import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export type OrganizeSort = 'recent' | 'added' | 'alpha' | 'creator'
export type OrganizeLayout = 'compact-list' | 'default-list' | 'compact-grid' | 'default-grid'

interface OrganizeMenuProps {
  sortMode: OrganizeSort
  viewMode: OrganizeLayout
  onSortChange: (value: OrganizeSort) => void
  onViewChange: (value: OrganizeLayout) => void
}

const sortLabels: Record<OrganizeSort, string> = {
  recent: 'Recent',
  added: 'Recently added',
  alpha: 'Alphabetical',
  creator: 'Creator',
}

const layoutLabels: Record<OrganizeLayout, string> = {
  'compact-list': 'Compact List',
  'compact-grid': 'Compact Grid',
  'default-list': 'Default List',
  'default-grid': 'Default Grid',
}

function CompactListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
      <path d="M4.5 7.25h15" />
      <path d="M4.5 10.25h15" />
      <path d="M4.5 13.25h15" />
      <path d="M4.5 16.25h15" />
    </svg>
  )
}

function DefaultListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round">
      <path d="M4.5 6.5h15" />
      <path d="M4.5 11.75h15" />
      <path d="M4.5 17h15" />
    </svg>
  )
}

function CompactGridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <rect x="5" y="5" width="4.2" height="4.2" rx="0.9" />
      <rect x="9.9" y="5" width="4.2" height="4.2" rx="0.9" />
      <rect x="14.8" y="5" width="4.2" height="4.2" rx="0.9" />
      <rect x="5" y="9.9" width="4.2" height="4.2" rx="0.9" />
      <rect x="9.9" y="9.9" width="4.2" height="4.2" rx="0.9" />
      <rect x="14.8" y="9.9" width="4.2" height="4.2" rx="0.9" />
      <rect x="5" y="14.8" width="4.2" height="4.2" rx="0.9" />
      <rect x="9.9" y="14.8" width="4.2" height="4.2" rx="0.9" />
      <rect x="14.8" y="14.8" width="4.2" height="4.2" rx="0.9" />
    </svg>
  )
}

function DefaultGridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <rect x="4.25" y="4.25" width="6" height="6" rx="1.1" />
      <rect x="13.75" y="4.25" width="6" height="6" rx="1.1" />
      <rect x="4.25" y="13.75" width="6" height="6" rx="1.1" />
      <rect x="13.75" y="13.75" width="6" height="6" rx="1.1" />
    </svg>
  )
}

const layoutOptions: Array<{ value: OrganizeLayout; label: string; icon: () => ReactNode }> = [
  { value: 'compact-list', label: layoutLabels['compact-list'], icon: CompactListIcon },
  { value: 'compact-grid', label: layoutLabels['compact-grid'], icon: CompactGridIcon },
  { value: 'default-list', label: layoutLabels['default-list'], icon: DefaultListIcon },
  { value: 'default-grid', label: layoutLabels['default-grid'], icon: DefaultGridIcon },
]

export function OrganizeMenu({ sortMode, viewMode, onSortChange, onViewChange }: OrganizeMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [tooltipLayout, setTooltipLayout] = useState<OrganizeLayout | null>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const width = 212
      const viewportPadding = 12
      const preferredLeft = rect.right - width
      const left = Math.max(viewportPadding, Math.min(preferredLeft, window.innerWidth - width - viewportPadding))

      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const activeLayoutLabel = useMemo(() => layoutLabels[viewMode], [viewMode])

  const showTooltip = (layout: OrganizeLayout) => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
    }

    hoverTimerRef.current = window.setTimeout(() => {
      setTooltipLayout(layout)
      hoverTimerRef.current = null
    }, 200)
  }

  const hideTooltip = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setTooltipLayout(null)
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-3 py-2 text-[0.72rem] font-semibold text-text-secondary transition-colors duration-150 ease-out hover:bg-white/5 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/45"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <SlidersHorizontal className="size-3.5 shrink-0" />
        <span>Organize</span>
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform duration-150 ease-out', isOpen && 'rotate-180')} />
      </button>

      {typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className={cn(
                'z-[90] origin-top-right rounded-[1rem] border border-white/10 bg-[#17121f]/95 p-2.5 shadow-[0_18px_42px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-150 ease-out',
                isOpen ? 'pointer-events-auto translate-y-0 opacity-100 scale-100' : 'pointer-events-none -translate-y-1 opacity-0 scale-[0.98]',
              )}
              role="menu"
              aria-label="Organize Library items"
            >
              <div className="space-y-1">
                <p className="px-2 pb-1 pt-0.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-text-muted">Order</p>
                {(Object.entries(sortLabels) as Array<[OrganizeSort, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortMode === value}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[0.7rem] transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/45',
                      sortMode === value ? 'bg-primary/14 text-text-primary' : 'text-text-muted hover:bg-white/6 hover:text-text-primary',
                    )}
                    onClick={() => {
                      onSortChange(value)
                    }}
                  >
                    <span>{label}</span>
                    {sortMode === value ? <Check className="size-3.5 shrink-0" /> : null}
                  </button>
                ))}
              </div>

              <div className="mt-2 border-t border-white/8 pt-2">
                <div className="flex h-12 items-center justify-center gap-3">
                  {layoutOptions.map((option) => {
                    const Icon = option.icon

                    return (
                      <div key={option.value} className="relative flex items-center justify-center">
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={viewMode === option.value}
                          aria-label={option.label}
                          title={option.label}
                          className={cn(
                            'relative inline-flex size-10 items-center justify-center rounded-[0.9rem] border text-text-secondary transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/45',
                            viewMode === option.value
                              ? 'border-primary/30 bg-primary/16 text-text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.03)]'
                              : 'border-transparent bg-white/[0.035] hover:border-white/10 hover:bg-white/7 hover:text-text-primary',
                          )}
                          onMouseEnter={() => showTooltip(option.value)}
                          onMouseLeave={hideTooltip}
                          onBlur={hideTooltip}
                          onClick={() => {
                            onViewChange(option.value)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onViewChange(option.value)
                            }
                          }}
                        >
                          <Icon />
                        </button>

                        <div
                          className={cn(
                            'pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-[rgba(11,9,16,0.92)] px-2 py-1 text-[0.62rem] font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.36)] transition-all duration-150 ease-out whitespace-nowrap',
                            tooltipLayout === option.value ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
                          )}
                        >
                          {option.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="sr-only">Current layout: {activeLayoutLabel}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
