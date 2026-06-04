import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Playlist, Track } from '@/entities/track/model/types'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { TrackShelfSection } from '@/features/discover/components/track-shelf-section'
import {
  getDailyRecommendationConfigs,
  quickMoodSuggestions,
} from '@/features/discover/lib/exploration-shelves'
import { useTrackShelves } from '@/features/discover/hooks/use-track-shelves'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useRecentlyPlayedStore } from '@/features/player/store/use-recently-played-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'

export function HomePage() {
  const navigate = useNavigate()
  const isOnline = usePlayerStore((state) => state.isOnline)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)

  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const recentlyPlayed = useRecentlyPlayedStore((state) => state.entries)

  const favoriteTrackIds = useMemo(() => new Set(favorites.map((track) => track.id)), [favorites])
  const recommendationConfigs = useMemo(() => getDailyRecommendationConfigs(), [])
  const recommendations = useTrackShelves(recommendationConfigs, isOnline)

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
    <div className="space-y-5 lg:space-y-5">
      <section className="editorial-panel rounded-[1.75rem] px-4 py-4 sm:rounded-[2rem] sm:px-6 sm:py-5 lg:px-7">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Home</p>
            <h1 className="font-heading text-[1.38rem] leading-tight text-text-primary sm:text-[1.85rem]">
              Start with what fits today.
            </h1>
            <p className="max-w-xl text-[0.92rem] leading-5 text-text-secondary sm:text-sm sm:leading-6">
              Daily recommendation shelves, quick mood shortcuts, and the tracks you played most recently.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 lg:max-w-md lg:justify-end">
            {quickMoodSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full border border-border-subtle bg-black/15 px-3 text-[0.78rem] text-text-secondary hover:text-text-primary"
                onClick={() => {
                  navigate(`/discover?q=${encodeURIComponent(suggestion)}`)
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

      {!recommendations.isLoading && recommendations.shelves.length > 0 ? (
        <div className="space-y-6">
          {recommendations.shelves.map((shelf) => (
            <TrackShelfSection
              key={shelf.id}
              title={shelf.title}
              description={shelf.description}
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
          />
        )}
      </section>
    </div>
  )
}
