import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { DiscoverHero } from '@/features/discover/components/discover-hero'
import { TrackShelfSection } from '@/features/discover/components/track-shelf-section'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { TrackListSkeleton } from '@/features/discover/components/track-list-skeleton'
import { getDiscoverExplorationConfigs } from '@/features/discover/lib/exploration-shelves'
import { useTrackShelves } from '@/features/discover/hooks/use-track-shelves'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'

export function DiscoverPage() {
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
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playSingleTrack = usePlayerStore((state) => state.playSingleTrack)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])

  const [draftQuery, setDraftQuery] = useState(query)
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
    setDraftQuery(value)
    setQuery(value)
    await search(value)
  }

  const hasActiveSearchState = Boolean(lastSearchedQuery || query.trim() || draftQuery.trim() || results.length || isLoading || error)
  const explorationConfigs = useMemo(() => getDiscoverExplorationConfigs(), [])
  const explorationShelves = useTrackShelves(explorationConfigs, !hasActiveSearchState && isOnline)
  const resolvedQuery = lastSearchedQuery || draftQuery || query
  const searchShareUrl =
    typeof window !== 'undefined' && resolvedQuery
      ? `${window.location.origin}/discover?q=${encodeURIComponent(resolvedQuery)}`
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
    <div className="space-y-6 lg:flex lg:min-h-full lg:flex-col lg:space-y-5">
      <DiscoverHero
        disabled={!isOnline || isLoading}
        onSuggestionSelect={(value) => {
          void handleSearch(value)
        }}
      />

      {!isOnline ? (
        <StatusPanel
          title="Offline mode"
          message="Jamendo search is paused while you are offline. Your local Library stays available with saved metadata."
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link to="/library">Open Library</Link>
            </Button>
          }
        />
      ) : null}

      <section className="space-y-4 lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Discover</p>
            <h2 className="font-heading text-2xl text-text-primary">
              {lastSearchedQuery ? `Results for "${lastSearchedQuery}"` : 'Explore independent music'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary xl:max-w-2xl">
              {lastSearchedQuery
                ? 'A cleaner catalog view for fast scanning, clear metadata, and playback-first interaction.'
                : 'Browse cover-first shelves, then use search when you want a tighter listening path.'}
            </p>
          </div>
          {hasActiveSearchState ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraftQuery('')
                setQuery('')
                clearResults()
                navigate('/discover')
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <>
            <TrackListSkeleton />
            <div className="xl:hidden">
              <TrackGridSkeleton />
            </div>
          </>
        ) : null}

        {!isLoading && error ? (
          <StatusPanel
            title="Search failed"
            message={error}
            action={
              lastSearchedQuery ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!isOnline}
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
            title="No tracks matched that search"
            description="Try another artist, genre, or mood keyword. Jamendo results can vary depending on track metadata."
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!isOnline}
                onClick={() => {
                  void handleSearch('indie rock')
                }}
              >
                Try "indie rock"
              </Button>
            }
          />
        ) : null}

        {!isLoading && !error && results.length > 0 ? (
          <div className="space-y-3">
            {results.map((track) => {
              const isCurrent = currentTrack?.id === track.id
              const isFavorite = favorites.some((favorite) => favorite.id === track.id)

              return (
                <TrackListRow
                  key={track.id}
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite={isFavorite}
                  onPlay={() => {
                    if (isCurrent) {
                      togglePlay()
                      return
                    }

                    playSingleTrack(track)
                  }}
                  onToggleFavorite={() => {
                    void toggleFavorite(track)
                  }}
                  onPlayNext={playNextInQueue}
                  onAddToQueue={addToQueue}
                  shareContext={
                    searchShareUrl
                      ? {
                          label: 'search link',
                          title: `Search results for ${resolvedQuery}`,
                          url: searchShareUrl,
                        }
                      : null
                  }
                />
              )
            })}
          </div>
        ) : null}

        {!hasActiveSearchState && isOnline && explorationShelves.isLoading ? <TrackGridSkeleton /> : null}

        {!hasActiveSearchState && !explorationShelves.isLoading && explorationShelves.error ? (
          <StatusPanel
            title="Discover shelves are unavailable"
            message={explorationShelves.error}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void handleSearch('ambient')
                }}
              >
                Search "ambient"
              </Button>
            }
          />
        ) : null}

        {!hasActiveSearchState && !explorationShelves.isLoading && explorationShelves.shelves.length > 0 ? (
          <div className="space-y-7">
            {explorationShelves.shelves.map((shelf) => (
              <TrackShelfSection
                key={shelf.id}
                title={shelf.title}
                description={shelf.description}
                tracks={shelf.tracks}
                source="discover"
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                favoriteTrackIds={favoriteTrackIds}
                onPlayTrack={(track) => {
                  const isCurrent = currentTrack?.id === track.id

                  if (isCurrent) {
                    togglePlay()
                    return
                  }

                  playSingleTrack(track)
                }}
                onOpenArtist={(track) => {
                  openArtistFromTrack(track)
                }}
                onToggleFavorite={(track) => {
                  void toggleFavorite(track)
                }}
              />
            ))}
          </div>
        ) : null}

        {!hasActiveSearchState && !explorationShelves.isLoading && !explorationShelves.error && explorationShelves.shelves.length === 0 ? (
          <EmptyState
            title="No exploration shelves are ready"
            description="Try a direct search while Jamendo refreshes the visual shelves for this session."
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
                Search "ambient"
              </Button>
            }
          />
        ) : null}
      </section>
    </div>
  )
}
