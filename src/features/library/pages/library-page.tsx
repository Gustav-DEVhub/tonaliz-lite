import { useMemo } from 'react'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { EmptyState } from '@/shared/ui/empty-state'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { StatusPanel } from '@/shared/ui/status-panel'

export function LibraryPage() {
  const favorites = useFavoritesStore((state) => state.favorites)
  const isHydrating = useFavoritesStore((state) => state.isHydrating)
  const error = useFavoritesStore((state) => state.error)
  const removeFavoriteTrack = useFavoritesStore((state) => state.removeFavoriteTrack)
  const isOnline = usePlayerStore((state) => state.isOnline)

  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const favoritesPlaylist = useMemo(() => createPlaylist('Saved favorites', 'library', favorites), [favorites])
  return (
    <div className="space-y-5 lg:flex lg:min-h-full lg:flex-col lg:space-y-5">
      <section className="editorial-panel rounded-[1.75rem] px-4 py-5 sm:rounded-[2rem] sm:px-8 sm:py-8">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Library</p>
        <h1 className="mt-2 font-heading text-[1.55rem] leading-tight text-text-primary sm:mt-3 sm:text-4xl">Your saved favorites</h1>
        <p className="mt-2 max-w-2xl text-[0.92rem] leading-6 text-text-secondary sm:mt-3 sm:text-sm sm:leading-7">
          Metadata stays available locally through IndexedDB, so your collection remains visible even when
          the network drops.
        </p>
      </section>

      <div className="space-y-4">
        {!isOnline ? (
          <StatusPanel
            title="Offline library ready"
            message="Your saved track metadata is still available locally. Playback depends on the remote audio remaining reachable."
          />
        ) : null}

        {error ? <StatusPanel title="Library sync issue" message={error} /> : null}

        {isHydrating ? <TrackGridSkeleton /> : null}

        {!isHydrating && favorites.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            description="Save tracks from Discover and they will appear here instantly, persisted locally for your next visit."
          />
        ) : null}

        {!isHydrating && favorites.length > 0 ? (
          <div className="space-y-3">
            {favorites.map((track) => {
              const isCurrent = currentTrack?.id === track.id

              return (
                <TrackListRow
                  key={track.id}
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite
                  onPlay={() => {
                    const shouldToggleCurrent = isCurrent && queue?.id === favoritesPlaylist.id

                    if (shouldToggleCurrent) {
                      togglePlay()
                      return
                    }

                    playTrackFromContext(track, favoritesPlaylist)
                  }}
                  onToggleFavorite={() => {
                    void removeFavoriteTrack(track.id)
                  }}
                  onPlayNext={playNextInQueue}
                  onAddToQueue={addToQueue}
                  shareContext={
                    typeof window !== 'undefined'
                      ? {
                          label: 'library link',
                          title: 'Saved favorites on Tonaliz Lite',
                          url: `${window.location.origin}/library`,
                        }
                      : null
                  }
                />
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
