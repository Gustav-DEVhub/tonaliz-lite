import type { Playlist, Track } from '@/entities/track/model/types'
import { QueueTrackRow } from '@/features/player/components/queue-track-row'
import { Badge } from '@/shared/ui/badge'

interface UpNextListProps {
  queue: Playlist | null
  queueIndex: number
  currentTrackId: string
  isPlaying: boolean
  onSelectTrack: (track: Track) => void
  onToggleCurrent: () => void
  onRemoveFromQueue: (index: number) => void
  onToggleFavorite: (track: Track) => void
  onGoToArtist: (track: Track) => void
  onShareTrack: (track: Track) => void
}

export function UpNextList({
  queue,
  queueIndex,
  currentTrackId,
  isPlaying,
  onSelectTrack,
  onToggleCurrent,
  onRemoveFromQueue,
  onToggleFavorite,
  onGoToArtist,
  onShareTrack,
}: UpNextListProps) {
  if (!queue || queue.tracks.length <= 1) {
    return (
      <section className="editorial-panel rounded-[1.8rem] px-5 py-5 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-text-muted">Up next</p>
        <h3 className="mt-3 font-heading text-2xl text-text-primary">Queue is minimal</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
          Start playback from Discover or Library search results to populate a longer queue here.
        </p>
      </section>
    )
  }

  const visibleTracks = queue.tracks.slice(queueIndex)

  return (
    <section className="editorial-panel rounded-[1.8rem] px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-text-muted">Up next</p>
          <h3 className="mt-2 font-heading text-2xl text-text-primary">Current queue</h3>
        </div>
        <Badge>
          Track {queueIndex + 1} / {queue.tracks.length}
        </Badge>
      </div>

      <div className="mt-5 space-y-3">
        {visibleTracks.map((track, offset) => {
          const index = queueIndex + offset
          const isCurrent = track.id === currentTrackId

          return (
            <QueueTrackRow
              key={`${queue.id}-${track.id}-${index}`}
              track={track}
              isCurrent={isCurrent}
              isPlaying={isCurrent && isPlaying}
              canRemove={!isCurrent}
              onPlay={() => {
                if (isCurrent) {
                  onToggleCurrent()
                  return
                }

                onSelectTrack(track)
              }}
              onRemove={() => onRemoveFromQueue(index)}
              onFavorite={() => onToggleFavorite(track)}
              onGoToArtist={() => onGoToArtist(track)}
              onShare={() => onShareTrack(track)}
            />
          )
        })}
      </div>
    </section>
  )
}
