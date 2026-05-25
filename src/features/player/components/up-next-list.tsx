import { Pause, Play } from 'lucide-react'
import type { Playlist, Track } from '@/entities/track/model/types'
import { formatDuration } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

interface UpNextListProps {
  queue: Playlist | null
  queueIndex: number
  currentTrackId: string
  isPlaying: boolean
  onSelectTrack: (track: Track) => void
}

export function UpNextList({
  queue,
  queueIndex,
  currentTrackId,
  isPlaying,
  onSelectTrack,
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
        {queue.tracks.map((track, index) => {
          const isCurrent = track.id === currentTrackId

          return (
            <button
              key={`${queue.id}-${track.id}-${index}`}
              type="button"
              onClick={() => {
                onSelectTrack(track)
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-[1.4rem] border px-3 py-3 text-left transition-colors',
                isCurrent
                  ? 'border-white/14 bg-white/6'
                  : 'border-transparent bg-black/10 hover:border-white/10 hover:bg-white/5',
              )}
            >
              <img src={track.imageUrl} alt={`${track.name} artwork`} className="size-12 rounded-[0.9rem] object-cover" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="line-clamp-1 font-medium text-text-primary">{track.name}</p>
                  {isCurrent ? <Badge>{isPlaying ? 'Playing' : 'Paused'}</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{track.artistName}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-text-muted sm:block">{formatDuration(track.duration)}</span>
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary">
                  {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
