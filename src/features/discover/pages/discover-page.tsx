import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { DiscoverHero } from '@/features/discover/components/discover-hero'
import { useBrowsePullToRefresh } from '@/features/discover/hooks/use-browse-pull-to-refresh'
import { TrackShelfSection } from '@/features/discover/components/track-shelf-section'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { TrackListSkeleton } from '@/features/discover/components/track-list-skeleton'
import { getDiscoverExplorationConfigs } from '@/features/discover/lib/exploration-shelves'
import { useTrackShelves } from '@/features/discover/hooks/use-track-shelves'
import { useBrowseSessionStore } from '@/features/discover/store/use-browse-session-store'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'
import { cn } from '@/shared/lib/utils'

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
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const browseRevision = useBrowseSessionStore((state) => state.browseRevision)
  const refreshBrowse = useBrowseSessionStore((state) => state.refreshBrowse)
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])

  const [draftQuery, setDraftQuery] = useState(query)
  const [activeDiscoverFilter, setActiveDiscoverFilter] = useState<string | null>(null)
  const [activeDiscoverFilterKey, setActiveDiscoverFilterKey] = useState<string | null>(null)

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

    setDraftQuery(value)
    setQuery(value)

    if (!normalizedValue) {
      clearResults()
      navigate('/discover')
      return
    }

    await search(normalizedValue)
    navigate(`/discover?q=${encodeURIComponent(normalizedValue)}`)
  }

  const hasActiveSearchState = Boolean(lastSearchedQuery || query.trim() || draftQuery.trim() || results.length || isLoading || error)
  const explorationConfigs = useMemo(() => {
    const configs = getDiscoverExplorationConfigs(new Date(), browseRevision)

    if (!activeDiscoverFilter) {
      return configs
    }

    const matchingConfig = configs.find((config) => config.query === activeDiscoverFilter)
    return matchingConfig
      ? [matchingConfig, ...configs.filter((config) => config.id !== matchingConfig.id)]
      : configs
  }, [activeDiscoverFilter, browseRevision])
  const explorationShelves = useTrackShelves(explorationConfigs, !hasActiveSearchState && isOnline, browseRevision)
  const pullToRefresh = useBrowsePullToRefresh({
    enabled: !hasActiveSearchState && isOnline,
    onRefresh: refreshBrowse,
  })
  const resolvedQuery = lastSearchedQuery || draftQuery || query
  const searchShareUrl =
    typeof window !== 'undefined' && resolvedQuery
      ? `${window.location.origin}/discover?q=${encodeURIComponent(resolvedQuery)}`
      : null
  const searchResultsPlaylist = useMemo(
    () => createPlaylist(resolvedQuery ? `Search: ${resolvedQuery}` : 'Search results', 'discover', results),
    [resolvedQuery, results],
  )

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
    <div className="space-y-5 lg:flex lg:min-h-full lg:flex-col lg:space-y-5" {...pullToRefresh.bind}>
      <div className="sticky top-[5.65rem] z-20 -mt-2 flex justify-center md:hidden">
        <div
          className="pointer-events-none inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-text-secondary backdrop-blur-md transition-all duration-200"
          style={{
            opacity: pullToRefresh.pullDistance > 0 || pullToRefresh.isRefreshing ? 1 : 0,
            transform: `translateY(${Math.min(pullToRefresh.pullDistance * 0.35, 22)}px)`,
          }}
        >
          <span
            className={cn(
              'browse-refresh-spinner',
              pullToRefresh.isRefreshing && 'browse-refresh-spinner--active',
              pullToRefresh.isReadyToRefresh && !pullToRefresh.isRefreshing && 'browse-refresh-spinner--ready',
            )}
            aria-hidden="true"
          />
          {pullToRefresh.isRefreshing
            ? 'Refreshing'
            : pullToRefresh.isReadyToRefresh
              ? 'Release to refresh'
              : 'Pull to refresh'}
        </div>
      </div>

      <DiscoverHero
        disabled={!isOnline || isLoading}
        onSuggestionSelect={(value, key) => {
          const nextKey = activeDiscoverFilterKey === key ? null : key
          setActiveDiscoverFilterKey(nextKey)
          setActiveDiscoverFilter(nextKey ? value : null)
        }}
        activeSuggestionKey={activeDiscoverFilterKey}
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

      <section className="space-y-4 lg:flex lg:flex-col lg:space-y-3.5">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Discover</p>
            <h2 className="font-heading text-[1.42rem] leading-tight text-text-primary sm:text-2xl lg:text-[1.85rem]">
              {lastSearchedQuery ? `Results for "${lastSearchedQuery}"` : 'Explore independent music'}
            </h2>
            <p className="mt-1 text-[0.92rem] leading-5 text-text-secondary sm:text-sm sm:leading-6 lg:max-w-[40rem] lg:text-[0.92rem] lg:leading-5 xl:max-w-[43rem]">
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

        {!hasActiveSearchState && isOnline ? (
          <StatusPanel
            title="Search independent tracks, artists, or moods."
            message="Use the search field above to jump straight into a focused result list, then play, favorite, or open the artist context from any result."
            className="py-4"
          />
        ) : null}

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
            title={isOnline ? 'We couldn’t load results. Try again.' : 'You’re offline. Search needs an internet connection.'}
            message={error}
            action={
              isOnline && lastSearchedQuery ? (
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
            title="No tracks found. Try another keyword."
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
                shelfId={shelf.id}
                tracks={shelf.tracks}
                source="discover"
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                favoriteTrackIds={favoriteTrackIds}
                onPlayTrack={(track, playlist) => {
                  const shouldToggleCurrent = currentTrack?.id === track.id && queue?.id === playlist.id

                  if (shouldToggleCurrent) {
                    togglePlay()
                    return
                  }

                  playTrackFromContext(track, playlist)
                }}
                onOpenArtist={(track) => {
                  openArtistFromTrack(track)
                }}
                onToggleFavorite={(track) => {
                  void toggleFavorite(track)
                }}
                onPlayNext={playNextInQueue}
                onAddToQueue={addToQueue}
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

