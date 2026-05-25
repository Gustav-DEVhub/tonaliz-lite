import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrackCard } from '@/entities/track/ui/track-card'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import { DiscoverHero } from '@/features/discover/components/discover-hero'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { TrackListSkeleton } from '@/features/discover/components/track-list-skeleton'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'

export function DiscoverPage() {
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
  const playTrack = usePlayerStore((state) => state.playTrack)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const queue = usePlayerStore((state) => state.queue)
  const isOnline = usePlayerStore((state) => state.isOnline)

  const [draftQuery, setDraftQuery] = useState(query)
  const [isDesktopListInteractive, setIsDesktopListInteractive] = useState(false)
  const scrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearScrollbarTimeout = () => {
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current)
      scrollbarTimeoutRef.current = null
    }
  }

  const activateDesktopScrollbar = () => {
    clearScrollbarTimeout()
    setIsDesktopListInteractive(true)
  }

  const scheduleDesktopScrollbarHide = () => {
    clearScrollbarTimeout()
    scrollbarTimeoutRef.current = setTimeout(() => {
      setIsDesktopListInteractive(false)
    }, 1800)
  }

  const registerDesktopListInteraction = () => {
    activateDesktopScrollbar()
    scheduleDesktopScrollbarHide()
  }

  useEffect(() => {
    return () => {
      clearScrollbarTimeout()
    }
  }, [])

  const handleSearch = async (value: string) => {
    setDraftQuery(value)
    setQuery(value)
    await search(value)
  }

  const activePlaylist = createPlaylist(
    `Search ${lastSearchedQuery || draftQuery || 'results'}`,
    'discover',
    results,
  )

  return (
    <div className="space-y-6">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Discover</p>
            <h2 className="font-heading text-2xl text-text-primary">
              {lastSearchedQuery ? `Results for "${lastSearchedQuery}"` : 'Search independent music'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary xl:max-w-2xl">
              A cleaner catalog view for fast scanning, clear metadata, and playback-first interaction.
            </p>
          </div>
          {results.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraftQuery('')
                clearResults()
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

        {!isLoading && !error && results.length === 0 && !lastSearchedQuery ? (
          <EmptyState
            title="Start with a song, artist, or mood"
            description='Search terms like "ambient", "dream pop", or an independent artist name will surface playable Jamendo tracks.'
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
          <>
            <div
              className="hidden xl:block"
              onMouseEnter={activateDesktopScrollbar}
              onMouseLeave={scheduleDesktopScrollbarHide}
              onFocusCapture={activateDesktopScrollbar}
              onBlurCapture={scheduleDesktopScrollbarHide}
            >
              <div
                className={[
                  'scrollbar-subtle scrollbar-fade space-y-3 overflow-y-auto pr-2',
                  isDesktopListInteractive ? 'is-scrollbar-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ height: 'clamp(21rem, calc(100vh - 24rem), 40rem)' }}
                onScroll={registerDesktopListInteraction}
              >
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
                        if (isCurrent && queue?.id === activePlaylist.id) {
                          togglePlay()
                          return
                        }

                        playTrack(track, activePlaylist)
                      }}
                      onToggleFavorite={() => {
                        void toggleFavorite(track)
                      }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:hidden">
              {results.map((track) => {
                const isCurrent = currentTrack?.id === track.id
                const isFavorite = favorites.some((favorite) => favorite.id === track.id)

                return (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isCurrent={isCurrent}
                    isPlaying={isCurrent && isPlaying}
                    isFavorite={isFavorite}
                    onPlay={() => {
                      if (isCurrent && queue?.id === activePlaylist.id) {
                        togglePlay()
                        return
                      }

                      playTrack(track, activePlaylist)
                    }}
                    onToggleFavorite={() => {
                      void toggleFavorite(track)
                    }}
                  />
                )
              })}
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
