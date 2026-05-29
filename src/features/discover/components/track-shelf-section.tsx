import type { PlaylistSource, Track } from '@/entities/track/model/types'
import { TrackCard } from '@/entities/track/ui/track-card'
import { cn } from '@/shared/lib/utils'

export function TrackShelfSection({
  title,
  description,
  tracks,
  source,
  currentTrack,
  isPlaying,
  favoriteTrackIds,
  onPlayTrack,
  onOpenArtist,
  onToggleFavorite,
  className,
}: {
  title: string
  description: string
  tracks: Track[]
  source: PlaylistSource
  currentTrack: Track | null
  isPlaying: boolean
  favoriteTrackIds: Set<string>
  onPlayTrack: (track: Track) => void
  onOpenArtist: (track: Track) => void
  onToggleFavorite: (track: Track) => void
  className?: string
}) {
  const sectionId = `${source}-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="font-heading text-xl text-text-primary sm:text-2xl">{title}</p>
          <p className="max-w-2xl text-sm text-text-secondary">{description}</p>
        </div>
        <p className="hidden font-mono text-xs uppercase tracking-[0.24em] text-text-muted sm:block">
          {tracks.length} picks
        </p>
      </div>

      <div className="scrollbar-subtle overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {tracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id

            return (
              <div key={`${sectionId}-${track.id}`} className="w-[14.75rem] shrink-0 sm:w-[15.5rem] lg:w-[16rem]">
                <TrackCard
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite={favoriteTrackIds.has(track.id)}
                  onPlay={() => {
                    onPlayTrack(track)
                  }}
                  onOpenArtist={() => {
                    onOpenArtist(track)
                  }}
                  onToggleFavorite={() => {
                    onToggleFavorite(track)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
