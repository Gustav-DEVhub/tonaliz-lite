import { Copy, GripVertical, Heart, MoreHorizontal, Move, Pause, Play, Trash2, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import type { Track } from '@/entities/track/model/types'
import { cn, formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

interface QueueRowDragHandleProps {
  attributes: ButtonHTMLAttributes<HTMLButtonElement>
  listeners?: ButtonHTMLAttributes<HTMLButtonElement>
  setActivatorNodeRef: (node: HTMLButtonElement | null) => void
}

function QueueRowMenu({
  canRemove,
  onRemove,
  onFavorite,
  onGoToArtist,
  onShare,
}: {
  canRemove: boolean
  onRemove?: () => void
  onFavorite: () => void
  onGoToArtist: () => void
  onShare: () => void
}) {
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

  const menuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="rounded-full border border-border-subtle p-2 text-text-muted transition-colors hover:text-text-primary"
        onClick={(event) => {
          event.stopPropagation()
          setIsOpen((open) => !open)
        }}
        aria-expanded={isOpen}
        aria-label="Queue item actions"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {isOpen ? (
        <div className="editorial-panel absolute right-0 top-11 z-30 w-52 rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
          {canRemove && onRemove ? (
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                onRemove()
                setIsOpen(false)
              }}
            >
              <Trash2 className="size-4" />
              Remove from queue
            </button>
          ) : null}
          <button
            type="button"
            className={menuItemClassName}
            onClick={() => {
              onFavorite()
              setIsOpen(false)
            }}
          >
            <Heart className="size-4" />
            Save to favorites
          </button>
          <button
            type="button"
            className={menuItemClassName}
            onClick={() => {
              onGoToArtist()
              setIsOpen(false)
            }}
          >
            <UserRound className="size-4" />
            Go to artist
          </button>
          <button
            type="button"
            className={menuItemClassName}
            onClick={() => {
              onShare()
              setIsOpen(false)
            }}
          >
            <Copy className="size-4" />
            Share song link
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function QueueTrackRow({
  track,
  isCurrent,
  isPlaying,
  canRemove = false,
  showReorderHandle = false,
  isReorderDisabled = false,
  dragHandleProps,
  onPlay,
  onRemove,
  onFavorite,
  onGoToArtist,
  onShare,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  canRemove?: boolean
  showReorderHandle?: boolean
  isReorderDisabled?: boolean
  dragHandleProps?: QueueRowDragHandleProps
  onPlay: () => void
  onRemove?: () => void
  onFavorite: () => void
  onGoToArtist: () => void
  onShare: () => void
}) {
  const isDesktopTitleDragActive = showReorderHandle && Boolean(dragHandleProps)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[1.3rem] border px-3 py-3 transition-colors',
        isCurrent ? 'border-white/12 bg-white/6' : 'border-transparent bg-black/10 hover:border-white/10 hover:bg-white/5',
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onPlay()
        }}
        className="group relative size-13 shrink-0 overflow-hidden rounded-[0.95rem]"
      >
        <img src={track.imageUrl} alt={`${track.name} artwork`} className="size-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/24">
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/18 bg-black/58 text-white shadow-[0_8px_22px_rgba(0,0,0,0.3)]">
            {isCurrent && isPlaying ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
          </span>
        </span>
      </button>

      {isDesktopTitleDragActive ? (
        <button
          type="button"
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
          ref={dragHandleProps?.setActivatorNodeRef}
          className={cn(
            'hidden min-w-0 flex-1 touch-none cursor-grab items-center gap-2 rounded-[0.95rem] px-1.5 py-1 text-left transition-colors hover:bg-white/[0.04] active:cursor-grabbing lg:flex',
            isReorderDisabled && 'cursor-not-allowed opacity-55',
            dragHandleProps?.attributes.className,
          )}
          disabled={isReorderDisabled}
          onPointerDown={(event) => {
            event.stopPropagation()
            dragHandleProps?.listeners?.onPointerDown?.(event)
          }}
          onClick={(event) => {
            event.stopPropagation()
            dragHandleProps?.attributes.onClick?.(event)
          }}
          aria-label={`Drag to reorder ${track.name}`}
          title={isReorderDisabled ? 'Reorder unavailable while shuffle is enabled.' : 'Drag this track to reorder.'}
        >
          <Move className="size-4 shrink-0 text-text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-text-primary">{track.name}</span>
            <span className="mt-1 block truncate text-sm text-text-secondary">
              {track.artistName}
              {track.genre ? ` / ${track.genre}` : ''}
            </span>
          </span>
        </button>
      ) : null}

      <div className={cn('min-w-0 flex-1', isDesktopTitleDragActive && 'lg:hidden')}>
        <div className="flex min-w-0 items-center gap-2">
          <p className="line-clamp-1 font-medium text-text-primary">{track.name}</p>
          {isCurrent ? (
            <Badge className="border-white/16 bg-white/[0.08] text-text-primary">
              {isPlaying ? 'Playing' : 'Paused'}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-text-secondary">
          {track.artistName}
          {track.genre ? ` / ${track.genre}` : ''}
        </p>
      </div>

      <span className="hidden text-xs text-text-muted sm:block">{formatDuration(track.duration)}</span>

      {showReorderHandle && !isDesktopTitleDragActive ? (
        <button
          type="button"
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
          ref={dragHandleProps?.setActivatorNodeRef}
          className={cn(
            'inline-flex size-9 touch-none items-center justify-center rounded-full border border-border-subtle text-text-muted transition-colors',
            isDesktopTitleDragActive && 'lg:hidden',
            isReorderDisabled ? 'cursor-not-allowed opacity-35' : 'cursor-grab hover:bg-white/6 hover:text-text-primary active:cursor-grabbing',
            dragHandleProps?.attributes.className,
          )}
          disabled={isReorderDisabled}
          onPointerDown={(event) => {
            event.stopPropagation()
            dragHandleProps?.listeners?.onPointerDown?.(event)
          }}
          onClick={(event) => {
            event.stopPropagation()
            dragHandleProps?.attributes.onClick?.(event)
          }}
          aria-label={`Reorder ${track.name}`}
          title={isReorderDisabled ? 'Reorder unavailable while shuffle is enabled.' : 'Drag to reorder upcoming track.'}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}

      <QueueRowMenu
        canRemove={canRemove}
        onRemove={onRemove}
        onFavorite={onFavorite}
        onGoToArtist={onGoToArtist}
        onShare={onShare}
      />
    </div>
  )
}
