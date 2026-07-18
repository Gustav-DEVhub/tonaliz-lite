import { MoreVertical, Pause, Play } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { Playlist, Track } from '@/entities/track/model/types'
import { TrackActionMenu } from '@/entities/track/ui/track-action-menu'
import { MobileTrackActionSheet } from '@/entities/track/ui/mobile-track-action-sheet'
import { useMobileLongPress } from '@/entities/track/ui/use-mobile-long-press'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { useBrowsePullToRefresh } from '@/features/discover/hooks/use-browse-pull-to-refresh'
import { TrackShelfSection } from '@/features/discover/components/track-shelf-section'
import {
  getDailyRecommendationConfigs,
  getHomeMoodRecommendationConfigs,
  quickMoodSuggestions,
} from '@/features/discover/lib/exploration-shelves'
import { useTrackShelves } from '@/features/discover/hooks/use-track-shelves'
import { useBrowseSessionStore } from '@/features/discover/store/use-browse-session-store'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useRecentlyPlayedStore } from '@/features/player/store/use-recently-played-store'
import { cn, formatDuration } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'

export function HomePage() {
  const navigate = useNavigate()
  const [activeHomeFilter, setActiveHomeFilter] = useState<string | null>(null)
  const [listenAgainPage, setListenAgainPage] = useState(0)
  const listenAgainScrollerRef = useRef<HTMLDivElement | null>(null)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)

  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const recentlyPlayed = useRecentlyPlayedStore((state) => state.entries)
  const browseRevision = useBrowseSessionStore((state) => state.browseRevision)
  const refreshBrowse = useBrowseSessionStore((state) => state.refreshBrowse)

  const favoriteTrackIds = useMemo(() => new Set(favorites.map((track) => track.id)), [favorites])
  const recommendationConfigs = useMemo(() => {
    if (activeHomeFilter) {
      return getHomeMoodRecommendationConfigs(activeHomeFilter, browseRevision)
    }

    return getDailyRecommendationConfigs(new Date(), browseRevision)
  }, [activeHomeFilter, browseRevision])
  const recommendations = useTrackShelves(recommendationConfigs, isOnline, browseRevision)
  const moodPrimaryShelf = activeHomeFilter ? (recommendations.shelves[0] ?? null) : null
  const discoveryShelves = activeHomeFilter ? recommendations.shelves.slice(1) : recommendations.shelves
  const activeMoodTitle = activeHomeFilter ? toTitleCase(activeHomeFilter) : null
  const listenAgainTracks = useMemo(() => recentlyPlayed.slice(0, 6), [recentlyPlayed])
  const keepListeningTracks = useMemo(() => {
    const recentContinuation = recentlyPlayed.slice(6, 12)
    if (recentContinuation.length >= 4) {
      return recentContinuation
    }

    const recentIds = new Set(recentlyPlayed.map((track) => track.id))
    const favoriteFallback = favorites.filter((track) => !recentIds.has(track.id)).slice(0, Math.max(0, 4 - recentContinuation.length))

    return [...recentContinuation, ...favoriteFallback]
  }, [favorites, recentlyPlayed])
  const listenAgainPlaylist = useMemo(
    () => createPlaylist('Listen to it again', 'home', listenAgainTracks),
    [listenAgainTracks],
  )
  const keepListeningPlaylist = useMemo(
    () => createPlaylist('Keep listening', 'home', keepListeningTracks),
    [keepListeningTracks],
  )
  const listenAgainPages = useMemo(() => chunkTracks(listenAgainTracks, 6), [listenAgainTracks])
  const pullToRefresh = useBrowsePullToRefresh({
    enabled: isOnline,
    onRefresh: refreshBrowse,
  })

  const handlePlayFromShelf = (track: Track, playlist: Playlist) => {
    const shouldToggleCurrent = currentTrack?.id === track.id && queue?.id === playlist.id

    if (shouldToggleCurrent) {
      togglePlay()
      return
    }

    playTrackFromContext(track, playlist)
  }

  const openArtistFromTrack = (track: Track) => {
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
    <div className="space-y-5 lg:space-y-5" {...pullToRefresh.bind}>
      <div className="sticky top-[5.65rem] z-20 -mt-2 flex justify-center md:hidden">
        <div
          className={cn(
            'pointer-events-none inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-text-secondary backdrop-blur-md transition-all duration-200',
            (pullToRefresh.pullDistance > 0 || pullToRefresh.isRefreshing) && 'opacity-100',
            pullToRefresh.pullDistance === 0 && !pullToRefresh.isRefreshing && 'opacity-0',
          )}
          style={{
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

      <section className="editorial-panel overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_8%_0%,rgba(153,92,255,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] px-4 py-3.5 sm:rounded-[2rem] sm:px-6 sm:py-5 lg:px-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-1.5">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Home</p>
            <h1 className="font-heading text-[1.32rem] leading-tight text-text-primary sm:text-[1.85rem]">
              Start with your mood.
            </h1>
            <p className="hidden max-w-xl text-sm leading-6 text-text-secondary sm:block">
              Tap a mood to reshape Home without changing Search.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 lg:max-w-md lg:justify-end" aria-label="Home mood filters">
            {quickMoodSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 rounded-full border px-3 text-[0.78rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:text-text-primary sm:h-9 sm:px-3.5',
                  activeHomeFilter === suggestion
                    ? 'border-primary/45 bg-primary/16 text-text-primary shadow-[0_0_22px_rgba(158,94,255,0.16)]'
                    : 'border-border-subtle bg-black/20 text-text-secondary',
                )}
                aria-pressed={activeHomeFilter === suggestion}
                onClick={() => {
                  setActiveHomeFilter((currentFilter) => currentFilter === suggestion ? null : suggestion)
                  refreshBrowse()
                }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {!isOnline ? (
        <StatusPanel
          title="Recommendations are paused offline"
          message="Home still keeps your recently played tracks and Library available while Jamendo search is offline."
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link to="/library">Open Library</Link>
            </Button>
          }
        />
      ) : null}

      {recommendations.isLoading ? <TrackGridSkeleton /> : null}

      {!recommendations.isLoading && recommendations.error && isOnline ? (
        <StatusPanel title="Recommendations are unavailable" message={recommendations.error} />
      ) : null}

      {!recommendations.isLoading && moodPrimaryShelf ? (
        <TrackShelfSection
          key={`mood-primary-${moodPrimaryShelf.id}`}
          title={`${activeMoodTitle ?? 'Mood'} picks`}
          description="Fresh tracks shaped by your selected mood."
          shelfId={moodPrimaryShelf.id}
          tracks={moodPrimaryShelf.tracks}
          source="home"
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          favoriteTrackIds={favoriteTrackIds}
          onPlayTrack={(track, playlist) => {
            handlePlayFromShelf(track, playlist)
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
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="font-heading text-[1.15rem] text-text-primary sm:text-2xl">
              <span className="lg:hidden">Shortcuts</span>
              <span className="hidden lg:inline">Listen to it again</span>
            </p>
            <p className="hidden max-w-2xl text-sm leading-6 text-text-secondary sm:block">
              Fast shortcuts back into the tracks that already earned another spin.
            </p>
          </div>
        </div>

        {listenAgainTracks.length === 0 ? (
          <EmptyState
            title="No recent listening yet"
            description="Play a few tracks and this shortcut cluster will build itself automatically."
          />
        ) : (
          <>
            <div className="scrollbar-subtle hidden overflow-x-auto overflow-y-hidden pb-2 lg:flex lg:gap-3 lg:[scrollbar-gutter:stable]">
              {listenAgainTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id

                return (
                  <div key={`listen-again-desktop-${track.id}`} className="w-[13.5rem] shrink-0">
                    <QuickResumeCard
                      track={track}
                      isCurrent={isCurrent}
                      isPlaying={isCurrent && isPlaying}
                      isFavorite={favoriteTrackIds.has(track.id)}
                      onPlay={() => {
                        handlePlayFromShelf(track, listenAgainPlaylist)
                      }}
                      onOpenArtist={() => {
                        openArtistFromTrack(track)
                      }}
                      onToggleFavorite={() => {
                        void toggleFavorite(track)
                      }}
                      onPlayNext={playNextInQueue}
                      onAddToQueue={addToQueue}
                    />
                  </div>
                )
              })}
            </div>

            <div
              ref={listenAgainScrollerRef}
              className="scrollbar-none -mx-3.5 overflow-x-auto overflow-y-hidden px-3.5 pb-2 scroll-px-3.5 [scroll-snap-type:x_mandatory] [overscroll-behavior-x:contain] lg:hidden"
              onScroll={(event) => {
                const scroller = event.currentTarget
                const pageElement = scroller.firstElementChild?.firstElementChild as HTMLElement | null
                const pageWidth = pageElement?.offsetWidth ? pageElement.offsetWidth + 12 : scroller.clientWidth || 1
                setListenAgainPage(Math.round(scroller.scrollLeft / pageWidth))
              }}
              aria-label="Shortcuts carousel"
            >
              <div className="flex gap-3">
                {listenAgainPages.map((page, pageIndex) => (
                  <div
                    key={`listen-again-page-${pageIndex}`}
                    className="grid w-[min(21rem,calc(100vw-2.75rem))] shrink-0 snap-center grid-cols-2 gap-3"
                  >
                    {page.map((track) => {
                      const isCurrent = currentTrack?.id === track.id

                      return (
                        <QuickResumeCard
                          key={`listen-again-mobile-${pageIndex}-${track.id}`}
                          track={track}
                          isCurrent={isCurrent}
                          isPlaying={isCurrent && isPlaying}
                          isFavorite={favoriteTrackIds.has(track.id)}
                          compact
                          onPlay={() => {
                            handlePlayFromShelf(track, listenAgainPlaylist)
                          }}
                          onOpenArtist={() => {
                            openArtistFromTrack(track)
                          }}
                          onToggleFavorite={() => {
                            void toggleFavorite(track)
                          }}
                          onPlayNext={playNextInQueue}
                          onAddToQueue={addToQueue}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            {listenAgainPages.length > 1 ? (
              <div className="flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
                {listenAgainPages.map((_, index) => (
                  <span
                    key={`listen-again-indicator-${index}`}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-200',
                      listenAgainPage === index ? 'w-5 bg-primary-soft' : 'w-1.5 bg-white/20',
                    )}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="font-heading text-[1.15rem] text-text-primary sm:text-2xl">Keep listening</p>
            <p className="max-w-2xl text-[0.92rem] leading-5 text-text-secondary sm:text-sm sm:leading-6">
              A denser continuation rail for quick resume without repeating the Discover shelf rhythm.
            </p>
          </div>
        </div>

        {keepListeningTracks.length === 0 ? (
          <EmptyState
            title="Nothing to continue yet"
            description="Favorites and recent sessions will start feeding this lane once you listen a little more."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {keepListeningTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id

              return (
                <KeepListeningRow
                  key={`keep-listening-${track.id}`}
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite={favoriteTrackIds.has(track.id)}
                  onPlay={() => {
                    handlePlayFromShelf(track, keepListeningPlaylist)
                  }}
                  onOpenArtist={() => {
                    openArtistFromTrack(track)
                  }}
                  onToggleFavorite={() => {
                    void toggleFavorite(track)
                  }}
                  onPlayNext={playNextInQueue}
                  onAddToQueue={addToQueue}
                />
              )
            })}
          </div>
        )}
      </section>

      {!recommendations.isLoading && discoveryShelves.length > 0 ? (
        <div className="space-y-6">
          {discoveryShelves.map((shelf) => (
            <TrackShelfSection
              key={shelf.id}
              title={shelf.title}
              description={shelf.description}
              shelfId={shelf.id}
              tracks={shelf.tracks}
              source="home"
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              favoriteTrackIds={favoriteTrackIds}
              onPlayTrack={(track, playlist) => {
                handlePlayFromShelf(track, playlist)
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

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="font-heading text-[1.15rem] text-text-primary sm:text-2xl">Recently played</p>
            <p className="max-w-2xl text-[0.92rem] leading-5 text-text-secondary sm:text-sm sm:leading-6">
              Jump back into your latest sessions without rebuilding the trail from scratch.
            </p>
          </div>
          {recentlyPlayed.length > 0 ? (
            <p className="hidden font-mono text-xs uppercase tracking-[0.24em] text-text-muted sm:block">
              {recentlyPlayed.length} tracks
            </p>
          ) : null}
        </div>

        {recentlyPlayed.length === 0 ? (
          <EmptyState
            title="No recent listening yet"
            description="Play a track from Home, Discover, or Library and it will appear here for a quick return."
          />
        ) : (
          <TrackShelfSection
            title="Recently played"
            description="Your latest listening history stays available locally on this device."
            tracks={recentlyPlayed}
            source="home"
            hideHeader
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            favoriteTrackIds={favoriteTrackIds}
            onPlayTrack={(track, playlist) => {
              handlePlayFromShelf(track, playlist)
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
        )}
      </section>
    </div>
  )
}

function chunkTracks(tracks: Track[], size: number) {
  const pages: Track[][] = []

  for (let index = 0; index < tracks.length; index += size) {
    pages.push(tracks.slice(index, index + size))
  }

  return pages
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function QuickResumeCard({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onOpenArtist,
  onToggleFavorite,
  onPlayNext,
  onAddToQueue,
  compact = false,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onOpenArtist: () => void
  onToggleFavorite: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  compact?: boolean
}) {
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false)
  const longPressBind = useMobileLongPress(() => {
    setIsMobileActionSheetOpen(true)
  })

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpenArtist}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenArtist()
        }
      }}
      {...longPressBind}
      className={cn(
        'track-card-surface group/track-actions cursor-pointer overflow-hidden rounded-[1.45rem] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-[1.04]',
        compact ? 'min-h-[11.75rem]' : 'min-h-[13.5rem]',
        isCurrent && 'mood-glow ring-1 ring-white/10',
      )}
    >
      <div className="relative">
        <img
          src={track.imageUrl}
          alt={`${track.name} artwork`}
          className={cn('w-full rounded-[1.05rem] object-cover', compact ? 'aspect-[1.05/1]' : 'aspect-[1.08/1]')}
        />
        <div className="absolute inset-0 rounded-[1.05rem] bg-gradient-to-t from-black/66 via-transparent to-transparent" />
        <div
          className="absolute left-2 top-2 z-10 hidden lg:block"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <TrackActionMenu
            track={track}
            variant="desktop"
            isFavorite={isFavorite}
            onPlayNext={onPlayNext}
            onAddToQueue={onAddToQueue}
            onToggleFavorite={() => onToggleFavorite()}
            onViewArtist={() => onOpenArtist()}
            triggerClassName="border-white/14 bg-black/58 text-white hover:bg-black/72"
          />
        </div>
        <button
          type="button"
          className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/52 text-white shadow-[0_8px_22px_rgba(0,0,0,0.26)] transition-transform duration-200 hover:scale-[1.03]"
          onClick={(event) => {
            event.stopPropagation()
            onPlay()
          }}
          aria-label={isCurrent && isPlaying ? 'Pause track' : 'Play track'}
        >
          {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className={cn('font-heading leading-tight text-text-primary', compact ? 'line-clamp-2 text-[0.98rem]' : 'line-clamp-1 text-[1.02rem]')}>
          {track.name}
        </p>
        <p className="line-clamp-1 text-[0.84rem] text-text-secondary">{track.artistName}</p>
      </div>

      <MobileTrackActionSheet
        open={isMobileActionSheetOpen}
        track={track}
        isFavorite={isFavorite}
        onOpenChange={setIsMobileActionSheetOpen}
        onPlay={onPlay}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onToggleFavorite={() => onToggleFavorite()}
        onViewArtist={() => onOpenArtist()}
      />
    </article>
  )
}

function KeepListeningRow({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onOpenArtist,
  onToggleFavorite,
  onPlayNext,
  onAddToQueue,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onOpenArtist: () => void
  onToggleFavorite: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
}) {
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false)
  const longPressBind = useMobileLongPress(() => {
    setIsMobileActionSheetOpen(true)
  })

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpenArtist}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenArtist()
        }
      }}
      {...longPressBind}
      className={cn(
        'editorial-panel group/track-actions flex items-center gap-3 rounded-[1.45rem] px-3 py-3 transition-colors hover:bg-white/[0.04] sm:px-4',
        isCurrent && 'mood-glow ring-1 ring-white/10',
      )}
    >
      <img src={track.imageUrl} alt={`${track.name} artwork`} className="size-14 shrink-0 rounded-[1rem] object-cover" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-heading text-[1rem] text-text-primary">{track.name}</p>
        <p className="mt-1 line-clamp-1 text-[0.84rem] text-text-secondary">
          {track.artistName}
          {track.genre ? ` / ${track.genre}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[0.76rem] text-text-muted">{formatDuration(track.duration)}</span>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/28 text-text-secondary transition-colors active:bg-white/8 active:text-text-primary lg:hidden"
          onClick={(event) => {
            event.stopPropagation()
            setIsMobileActionSheetOpen(true)
          }}
          aria-label="More options"
        >
          <MoreVertical className="size-4" />
        </button>
        <div
          className="hidden lg:block"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <TrackActionMenu
            track={track}
            variant="desktop"
            isFavorite={isFavorite}
            onPlayNext={onPlayNext}
            onAddToQueue={onAddToQueue}
            onToggleFavorite={() => onToggleFavorite()}
            onViewArtist={() => onOpenArtist()}
            triggerClassName="border-white/12 bg-black/22"
          />
        </div>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-black/40 text-white transition-transform duration-200 hover:scale-[1.03]"
          onClick={(event) => {
            event.stopPropagation()
            onPlay()
          }}
          aria-label={isCurrent && isPlaying ? 'Pause track' : 'Play track'}
        >
          {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </button>
      </div>

      <MobileTrackActionSheet
        open={isMobileActionSheetOpen}
        track={track}
        isFavorite={isFavorite}
        onOpenChange={setIsMobileActionSheetOpen}
        onPlay={onPlay}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onToggleFavorite={() => onToggleFavorite()}
        onViewArtist={() => onOpenArtist()}
      />
    </article>
  )
}
