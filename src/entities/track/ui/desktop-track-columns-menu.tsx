import { Check, List } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import type { DesktopTrackColumnsConfig } from '@/entities/track/ui/desktop-track-columns'

interface DesktopTrackColumnsMenuProps {
  columns: DesktopTrackColumnsConfig
  hasSourceColumn: boolean
  onToggleColumn: (column: keyof DesktopTrackColumnsConfig, nextValue: boolean) => void
  className?: string
}

export function DesktopTrackColumnsMenu({
  columns,
  hasSourceColumn,
  onToggleColumn,
  className,
}: DesktopTrackColumnsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const itemClassName =
    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <div ref={rootRef} className={cn('relative hidden lg:block', className)}>
      <button
        type="button"
        className={cn(
          'inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors',
          isOpen
            ? 'border-white/18 bg-white/8 text-text-primary'
            : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/8 hover:text-text-primary',
        )}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Columns"
        aria-expanded={isOpen}
        title="Columns"
      >
        <List className="size-4" />
        Columns
      </button>

      {isOpen ? (
        <div className="editorial-panel absolute right-0 top-12 z-30 w-56 rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
          <p className="px-3 pb-2 pt-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-muted">Columns</p>
          <div className="space-y-1">
            <button type="button" className={itemClassName} onClick={() => onToggleColumn('artist', !columns.artist)}>
              <span>Artist</span>
              {columns.artist ? <Check className="size-4 text-primary-soft" /> : null}
            </button>
            <button
              type="button"
              className={itemClassName}
              onClick={() => onToggleColumn('source', !columns.source)}
              disabled={!hasSourceColumn}
            >
              <span>Source</span>
              {hasSourceColumn && columns.source ? <Check className="size-4 text-primary-soft" /> : null}
            </button>
            <button type="button" className={itemClassName} onClick={() => onToggleColumn('duration', !columns.duration)}>
              <span>Duration</span>
              {columns.duration ? <Check className="size-4 text-primary-soft" /> : null}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
