import { Heart, MoreVertical, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import type { Track } from '@/entities/track/model/types'
import { MobileTrackActionSheet } from '@/entities/track/ui/mobile-track-action-sheet'
import { cn, formatDuration, truncateText } from '@/shared/lib/utils'

interface CompactTrackCardProps {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  onToggleFavorite: () => void
  onViewArtist: () => void
}

export function CompactTrackCard({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  onViewArtist,
}: CompactTrackCardProps) {
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)

  return (
    <article className={cn('content-visibility-auto track-card-surface flex min-w-0 flex-col gap-3 rounded-[1.2rem] p-2.5', isCurrent && 'mood-glow ring-1 ring-white/10')}>
      <div className="relative aspect-square overflow-hidden rounded-[0.9rem] bg-white/5">
        <img src={track.imageUrl} alt={`${track.name} artwork`} className="size-full object-cover" />
        <button
          type="button"
          className="absolute bottom-2 right-2 inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur-sm"
          onClick={onPlay}
          aria-label={isCurrent && isPlaying ? 'Pause track' : 'Play track'}
        >
          {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </button>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-[0.9rem] text-text-primary" title={track.name}>
              {truncateText(track.name, 42)}
            </h3>
            <p className="mt-1 truncate text-[0.76rem] text-text-secondary" title={track.artistName}>
              {truncateText(track.artistName, 34)}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-text-muted active:bg-white/8 active:text-text-primary"
            onClick={(event) => {
              event.stopPropagation()
              setIsActionSheetOpen(true)
            }}
            aria-label="More track options"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem] text-text-muted">
          <span className="min-w-0 truncate">{track.genre ?? 'Independent release'}</span>
          <span className="shrink-0">{formatDuration(track.duration)}</span>
        </div>

        <button
          type="button"
          className={cn(
            'mt-2 inline-flex size-8 items-center justify-center rounded-full border transition-colors',
            isFavorite
              ? 'border-primary/40 bg-primary/14 text-primary-soft'
              : 'border-white/10 text-text-muted active:bg-white/8 active:text-text-primary',
          )}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
          aria-label={isFavorite ? 'Remove from Music I Like' : 'Add to Music I Like'}
        >
          <Heart className={cn('size-4', isFavorite && 'fill-current')} />
        </button>
      </div>

      {isActionSheetOpen ? (
        <MobileTrackActionSheet
          open
          track={track}
          isFavorite={isFavorite}
          onOpenChange={setIsActionSheetOpen}
          onPlay={onPlay}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
          onToggleFavorite={() => onToggleFavorite()}
          onViewArtist={() => onViewArtist()}
        />
      ) : null}
    </article>
  )
}
