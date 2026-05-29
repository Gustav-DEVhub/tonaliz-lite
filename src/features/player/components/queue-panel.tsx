import { ListMusic } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { DesktopRailToggle } from '@/features/player/components/desktop-rail-toggle'
import { QueueTrackRow } from '@/features/player/components/queue-track-row'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { copyTextToClipboard } from '@/shared/lib/share'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function QueuePanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const queue = usePlayerStore((state) => state.queue)
  const queueIndex = usePlayerStore((state) => state.queueIndex)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playTrack = usePlayerStore((state) => state.playTrack)
  const clearUpcomingQueue = usePlayerStore((state) => state.clearUpcomingQueue)
  const closeQueueRailAndRestore = usePlayerStore((state) => state.closeQueueRailAndRestore)
  const removeFromQueueAt = usePlayerStore((state) => state.removeFromQueueAt)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)

  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = setTimeout(() => {
      setFeedback(null)
    }, 1800)

    return () => {
      clearTimeout(timeout)
    }
  }, [feedback])

  if (!queue || !currentTrack) {
    return null
  }

  const currentQueueTrack = queue.tracks[queueIndex] ?? currentTrack
  const upcomingTracks = queue.tracks.slice(queueIndex + 1)

  const goToArtist = (track = currentQueueTrack) => {
    playTrack(track, queue)
    navigate('/now-playing', {
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    })
  }

  const shareTrack = async (shareUrl: string | null | undefined) => {
    if (!shareUrl) {
      setFeedback('No link available')
      return
    }

    try {
      await copyTextToClipboard(shareUrl)
      setFeedback('Song link copied')
    } catch {
      setFeedback('Copy failed')
    }
  }

  return (
    <aside className="relative hidden min-w-0 lg:flex lg:h-full lg:min-h-0 lg:justify-end">
      <DesktopRailToggle variant="open-button" onClick={closeQueueRailAndRestore} />

      <div className="w-full lg:h-full lg:min-h-0">
        <div className="editorial-panel mood-glow overflow-hidden rounded-[2rem] border-white/8 p-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col xl:p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">Queue</p>
              <p className="mt-1 text-sm text-text-secondary">Current listening session</p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-text-muted">
              <ListMusic className="size-3.5" />
              {queue.source ?? 'discover'}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Badge>
              Track {queueIndex + 1} / {queue.tracks.length}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="border border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
              onClick={clearUpcomingQueue}
            >
              Clear queue
            </Button>
          </div>

          <div className="mt-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 scrollbar-subtle">
            <div className="space-y-5">
              <section className="space-y-3">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Now playing</p>
                <QueueTrackRow
                  track={currentQueueTrack}
                  isCurrent
                  isPlaying={isPlaying}
                  onPlay={togglePlay}
                  onFavorite={() => {
                    void toggleFavorite(currentQueueTrack)
                    setFeedback('Saved to favorites')
                  }}
                  onGoToArtist={() => {
                    goToArtist(currentQueueTrack)
                  }}
                  onShare={() => {
                    void shareTrack(currentQueueTrack.shareUrl)
                  }}
                />
              </section>

              <section className="space-y-3">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Up next</p>

                {upcomingTracks.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-white/8 bg-black/10 px-4 py-4 text-sm text-text-secondary">
                    No upcoming tracks in the queue right now.
                  </div>
                ) : (
                  upcomingTracks.map((track, offset) => {
                    const absoluteIndex = queueIndex + offset + 1

                    return (
                      <div
                        key={`${queue.id}-${track.id}-${absoluteIndex}`}
                      >
                        <QueueTrackRow
                          track={track}
                          isCurrent={false}
                          isPlaying={false}
                          canRemove
                          onPlay={() => {
                            playTrack(track, queue)
                          }}
                          onRemove={() => {
                            removeFromQueueAt(absoluteIndex)
                            setFeedback('Removed from queue')
                          }}
                          onFavorite={() => {
                            void toggleFavorite(track)
                            setFeedback('Saved to favorites')
                          }}
                          onGoToArtist={() => {
                            goToArtist(track)
                          }}
                          onShare={() => {
                            void shareTrack(track.shareUrl)
                          }}
                        />
                      </div>
                    )
                  })
                )}
              </section>
            </div>
          </div>

          {feedback ? (
            <div className="pointer-events-none mt-3 rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary">
              {feedback}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
