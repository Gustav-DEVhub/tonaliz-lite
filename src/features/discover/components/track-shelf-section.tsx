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
    <section className={cn('min-w-0 space-y-3.5', className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="font-heading text-[1.15rem] leading-tight text-text-primary sm:text-2xl">{title}</p>
          <p className="max-w-2xl text-[0.92rem] leading-5 text-text-secondary sm:text-sm sm:leading-6">{description}</p>
        </div>
        <p className="hidden font-mono text-xs uppercase tracking-[0.24em] text-text-muted sm:block">
          {tracks.length} picks
        </p>
      </div>

      <div className="scrollbar-subtle -mx-3.5 overflow-x-auto overflow-y-hidden px-3.5 pb-2 scroll-px-3.5 [scrollbar-gutter:stable] [scroll-snap-type:x_mandatory] [overscroll-behavior-x:contain] sm:mx-0 sm:px-0 sm:scroll-px-0">
        <div className="flex min-w-max gap-3.5 sm:gap-4">
          {tracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id

            return (
              <div
                key={`${sectionId}-${track.id}`}
                className="w-[min(15rem,calc(100vw-5.75rem))] shrink-0 snap-start sm:w-[15.5rem] lg:w-[16rem]"
              >
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
