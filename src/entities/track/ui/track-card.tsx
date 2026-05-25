import { Heart, Pause, Play } from 'lucide-react'
import type { Track } from '@/entities/track/model/types'
import { detectMood } from '@/lib/mood/detect-mood'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn, formatDuration, truncateText } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function TrackCard({
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
        'track-card-surface group flex h-full flex-col gap-4 overflow-hidden rounded-[1.6rem] p-4 transition-all duration-300 hover:-translate-y-1',
        isCurrent && 'mood-glow ring-1 ring-white/10',
      )}
    >
      <div className="relative overflow-hidden rounded-[1.3rem]">
        <img
          src={track.imageUrl}
          alt={`${track.name} artwork`}
          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <Badge
            className="border-transparent"
            style={{
              background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0, 0, 0, 0.45))`,
              color: moodToken.text,
            }}
          >
            {moodToken.label}
          </Badge>
          <Button
            type="button"
            size="icon"
            className="mood-glow border-transparent bg-black/55 text-white hover:bg-black/70"
            onClick={onPlay}
          >
            {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 font-heading text-lg leading-tight text-text-primary">
              {truncateText(track.name, 38)}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
              {truncateText(track.artistName, 44)}
            </p>
          </div>
          <button
            type="button"
            className={cn(
              'mt-1 rounded-full border p-2 transition-colors',
              isFavorite
                ? 'border-primary/40 bg-primary/14 text-primary-soft'
                : 'border-border-subtle text-text-muted hover:text-text-primary',
            )}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Heart className={cn('size-4', isFavorite && 'fill-current')} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
          <span className="min-w-0 truncate">{track.genre ?? 'Independent release'}</span>
          <span>{formatDuration(track.duration)}</span>
        </div>
      </div>

      {track.tags.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-2">
          {track.tags.slice(0, 3).map((tag) => (
            <Badge key={`${track.id}-${tag}`}>{tag}</Badge>
          ))}
        </div>
      ) : null}
    </article>
  )
}
