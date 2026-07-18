import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { SearchBar } from '@/features/discover/components/search-bar'
import { TrackListSkeleton } from '@/features/discover/components/track-list-skeleton'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'

const explorationChips = ['dream pop', 'ambient', 'indie rock', 'lofi', 'chillhop', 'electronic']

export function SearchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const query = useDiscoverStore((state) => state.query)
  const lastSearchedQuery = useDiscoverStore((state) => state.lastSearchedQuery)
  const results = useDiscoverStore((state) => state.results)
  const isLoading = useDiscoverStore((state) => state.isLoading)
  const error = useDiscoverStore((state) => state.error)
  const search = useDiscoverStore((state) => state.search)
  const setQuery = useDiscoverStore((state) => state.setQuery)
  const clearResults = useDiscoverStore((state) => state.clearResults)

  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)

  const favoriteTrackIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const q = searchParams.get('q')?.trim()

    if (!q || q === query || q === lastSearchedQuery) {
      return
    }

    setQuery(q)
    void search(q)
  }, [lastSearchedQuery, location.search, query, search, setQuery])

  const handleSearch = async (value: string) => {
    const normalizedValue = value.trim()

    setQuery(value)

    if (!normalizedValue) {
      clearResults()
      navigate('/search')
      return
    }

    await search(normalizedValue)
    navigate(`/search?q=${encodeURIComponent(normalizedValue)}`)
  }

  const handleClear = () => {
    setQuery('')
    clearResults()
    navigate('/search')
  }

  const resolvedQuery = lastSearchedQuery || query
  const hasSearchState = Boolean(lastSearchedQuery || query.trim() || results.length || isLoading || error)
  const searchResultsPlaylist = useMemo(
    () => createPlaylist(resolvedQuery ? `Search: ${resolvedQuery}` : 'Search results', 'discover', results),
    [resolvedQuery, results],
  )
  const shareContext =
    typeof window !== 'undefined' && resolvedQuery
      ? {
          label: 'search link',
          title: `Search results for ${resolvedQuery}`,
          url: `${window.location.origin}/search?q=${encodeURIComponent(resolvedQuery)}`,
        }
      : null

  const openArtistFromTrack = (track: (typeof results)[number]) => {
    const target = getArtistRouteTarget(track)
    navigate(
      {
        pathname: target.pathname,
        search: target.search,
      },
      { state: target.state },
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:gap-6">
      <section className="space-y-3">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Search</p>
          <h1 className="font-heading text-[1.85rem] leading-tight text-text-primary sm:text-[2.2rem]">
            Find your next track.
          </h1>
          <p className="mt-1 max-w-2xl text-[0.95rem] leading-6 text-text-secondary">
            Search independent tracks, artists, or moods.
          </p>
        </div>

        <SearchBar
          query={query}
          onQueryChange={(value) => {
            setQuery(value)
          }}
          onClear={handleClear}
          onSubmit={() => {
            void handleSearch(query)
          }}
          disabled={!isOnline || isLoading}
          className="rounded-[1.75rem]"
        />
      </section>

      {!hasSearchState ? (
        <section className="editorial-panel rounded-[1.75rem] p-4 sm:p-5">
          <p className="font-heading text-lg text-text-primary">Search independent tracks, artists, or moods.</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Start with a mood, genre, or artist. Results are playback-first, so every row can start a queue.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {explorationChips.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-black/18 px-3 text-text-secondary hover:text-text-primary"
                disabled={!isOnline || isLoading}
                onClick={() => {
                  void handleSearch(chip)
                }}
              >
                {chip}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {!isOnline ? (
        <StatusPanel
          title="You're offline. Search needs an internet connection."
          message="Your saved Library remains available locally, but Jamendo search needs the network."
        />
      ) : null}

      {isLoading ? <TrackListSkeleton /> : null}

      {!isLoading && error ? (
        <StatusPanel
          title="We couldn't load results. Try again."
          message={error}
          action={
            isOnline && lastSearchedQuery ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void handleSearch(lastSearchedQuery)
                }}
              >
                Retry search
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && !error && results.length === 0 && lastSearchedQuery ? (
        <EmptyState
          title="No tracks found. Try another keyword."
          description="Try another artist, genre, or mood keyword. Jamendo results can vary depending on track metadata."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!isOnline}
              onClick={() => {
                void handleSearch('ambient')
              }}
            >
              Try "ambient"
            </Button>
          }
        />
      ) : null}

      {!isLoading && !error && results.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Results</p>
            <h2 className="font-heading text-[1.35rem] text-text-primary">
              {lastSearchedQuery ? `"${lastSearchedQuery}"` : 'Tracks'}
            </h2>
          </div>

          <div className="space-y-3">
            {results.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id

              return (
                <TrackListRow
                  key={`${track.id}-${index}`}
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite={favoriteTrackIds.has(track.id)}
                  onOpenContext={() => {
                    openArtistFromTrack(track)
                  }}
                  onPlay={() => {
                    const shouldToggleCurrent = isCurrent && queue?.id === searchResultsPlaylist.id

                    if (shouldToggleCurrent) {
                      togglePlay()
                      return
                    }

                    playTrackFromContext(track, searchResultsPlaylist)
                  }}
                  onToggleFavorite={() => {
                    void toggleFavorite(track)
                  }}
                  onPlayNext={playNextInQueue}
                  onAddToQueue={addToQueue}
                  shareContext={shareContext}
                />
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
