import { Heart, Pause, Play } from 'lucide-react'
import type { Track } from '@/entities/track/model/types'
import { detectMood } from '@/lib/mood/detect-mood'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn, formatDuration, truncateText } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function TrackListRow({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
}) {
  const mood = detectMood(track)
  const moodToken = moodTheme[mood]

  return (
    <article
      className={cn(
        'track-card-surface grid grid-cols-[4.75rem_minmax(0,1.4fr)_8rem_12rem_8.5rem] items-center gap-4 rounded-[1.45rem] px-4 py-3 transition-all duration-300',
        isCurrent && 'mood-glow ring-1 ring-white/10',
      )}
    >
      <img
        src={track.imageUrl}
        alt={`${track.name} artwork`}
        className="size-[4.75rem] rounded-[1rem] object-cover"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge
            className="border-transparent"
            style={{
              background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0, 0, 0, 0.45))`,
              color: moodToken.text,
            }}
          >
            {moodToken.label}
          </Badge>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Track</p>
        </div>
        <h3 className="mt-2 line-clamp-1 font-heading text-xl text-text-primary">
          {truncateText(track.name, 68)}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{truncateText(track.artistName, 58)}</p>
      </div>

      <div className="text-sm text-text-secondary">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Genre</p>
        <p className="mt-1 truncate">{track.genre ?? 'Independent release'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {track.tags.slice(0, 3).map((tag) => (
          <Badge key={`${track.id}-${tag}`}>{tag}</Badge>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-text-muted">{formatDuration(track.duration)}</span>
        <button
          type="button"
          className={cn(
            'rounded-full border p-2 transition-colors',
            isFavorite
              ? 'border-primary/40 bg-primary/14 text-primary-soft'
              : 'border-border-subtle text-text-muted hover:text-text-primary',
          )}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Heart className={cn('size-4', isFavorite && 'fill-current')} />
        </button>
        <Button
          type="button"
          size="icon"
          className="mood-glow border-transparent bg-black/55 text-white hover:bg-black/70"
          onClick={onPlay}
        >
          {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </Button>
      </div>
    </article>
  )
}
