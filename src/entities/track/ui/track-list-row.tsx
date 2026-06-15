import { Heart, Pause, Play } from 'lucide-react'
import type { Track } from '@/entities/track/model/types'
import { TrackActionMenu } from '@/entities/track/ui/track-action-menu'
import { detectMood } from '@/lib/mood/detect-mood'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn, formatDuration, truncateText } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

interface ShareContextInfo {
  label: string
  title: string
  url: string | null
}

export function TrackListRow({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onOpenContext,
  onPlayNext,
  onAddToQueue,
  shareContext,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  onOpenContext?: () => void
  onPlayNext?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  shareContext?: ShareContextInfo | null
}) {
  const mood = detectMood(track)
  const moodToken = moodTheme[mood]

  return (
    <article
      role={onOpenContext ? 'button' : undefined}
      tabIndex={onOpenContext ? 0 : undefined}
      className={cn(
        'track-card-surface rounded-[1.3rem] px-3 py-3 transition-all duration-300 sm:rounded-[1.45rem] sm:px-4',
        onOpenContext && 'cursor-pointer hover:border-white/12 hover:bg-card-hover',
        isCurrent && 'mood-glow ring-1 ring-white/10',
      )}
      onClick={onOpenContext}
      onKeyDown={(event) => {
        if (!onOpenContext) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenContext()
        }
      }}
    >
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <img src={track.imageUrl} alt={`${track.name} artwork`} className="size-[4rem] rounded-[0.95rem] object-cover sm:size-[4.8rem] sm:rounded-[1rem]" />

          <button
            type="button"
            className="mood-glow flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.08)),color-mix(in_srgb,var(--mood-accent)_18%,rgba(0,0,0,0.6))] text-white transition-transform duration-200 hover:scale-[1.03] hover:border-white/18 sm:size-10"
            onClick={(event) => {
              event.stopPropagation()
              onPlay()
            }}
            aria-label={isCurrent && isPlaying ? 'Pause track' : 'Play track'}
          >
            {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="border-transparent uppercase tracking-[0.12em]"
                style={{
                  background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0, 0, 0, 0.45))`,
                  color: moodToken.text,
                }}
              >
                {moodToken.label}
              </Badge>
              <p className="font-mono text-[0.64rem] uppercase tracking-[0.12em] text-text-muted">Track</p>
            </div>
            <h3 className="mt-1.5 line-clamp-1 font-heading text-[1.02rem] text-text-primary sm:mt-2 sm:text-xl">
              {truncateText(track.name, 68)}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9rem] leading-5 text-text-secondary sm:text-sm">
              <span className="line-clamp-1">{truncateText(track.artistName, 58)}</span>
              <span className="hidden text-text-muted sm:inline">/</span>
              <span className="truncate text-text-muted">{track.genre ?? 'Independent release'}</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 xl:min-w-[24rem] xl:justify-end xl:gap-4">
          <div className="hidden min-w-0 flex-1 flex-wrap justify-end gap-2 md:flex xl:max-w-[18rem]">
            {track.tags.slice(0, 3).map((tag) => (
              <Badge key={`${track.id}-${tag}`}>{tag}</Badge>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="min-w-9 text-right text-[0.78rem] text-text-secondary sm:text-xs sm:text-text-muted">
              {formatDuration(track.duration)}
            </span>
            <button
              type="button"
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full border transition-colors sm:size-10',
                isFavorite
                  ? 'border-primary/40 bg-primary/14 text-primary-soft'
                  : 'border-border-subtle text-text-muted hover:text-text-primary',
              )}
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite()
              }}
              aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={cn('size-4', isFavorite && 'fill-current')} />
            </button>
            <div
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <TrackActionMenu
                track={track}
                onPlayNext={onPlayNext}
                onAddToQueue={onAddToQueue}
                isFavorite={isFavorite}
                onToggleFavorite={() => {
                  onToggleFavorite()
                }}
                shareContext={shareContext}
              />
            </div>
          </div>
        </div>
      </div>

      {track.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 md:hidden">
          {track.tags.slice(0, 3).map((tag) => (
            <Badge key={`${track.id}-mobile-${tag}`}>{tag}</Badge>
          ))}
        </div>
      ) : null}
    </article>
  )
}
