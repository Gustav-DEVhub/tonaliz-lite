import { TrackCard } from '@/entities/track/ui/track-card'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
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
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrack = usePlayerStore((state) => state.playTrack)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const queue = usePlayerStore((state) => state.queue)

  const libraryPlaylist = createPlaylist('Saved favorites', 'library', favorites)

  return (
    <div className="space-y-6">
      <section className="editorial-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Library</p>
        <h1 className="mt-3 font-heading text-4xl text-text-primary">Your saved favorites</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Metadata stays available locally through IndexedDB, so your collection remains visible even when
          the network drops.
        </p>
      </section>

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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((track) => {
            const isCurrent = currentTrack?.id === track.id

            return (
              <TrackCard
                key={track.id}
                track={track}
                isCurrent={isCurrent}
                isPlaying={isCurrent && isPlaying}
                isFavorite
                onPlay={() => {
                  if (isCurrent && queue?.id === libraryPlaylist.id) {
                    togglePlay()
                    return
                  }

                  playTrack(track, libraryPlaylist)
                }}
                onToggleFavorite={() => {
                  void removeFavoriteTrack(track.id)
                }}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
