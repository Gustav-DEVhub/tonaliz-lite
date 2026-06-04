import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import type { ArtistRouteState } from '@/features/artist/lib/artist-route'
import { ArtistProfileCard } from '@/features/player/components/artist-profile-card'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'
import { getArtistProfileByIdentity } from '@/lib/jamendo/artist-service'
import { getArtistTracks } from '@/lib/jamendo/artist-tracks-service'

export function ArtistProfilePage() {
  const { artistId } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const routeState = (location.state as ArtistRouteState | null) ?? null

  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const isOnline = usePlayerStore((state) => state.isOnline)

  const [tracks, setTracks] = useState<Track[]>([])
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestedArtistName =
    searchParams.get('name')?.trim() || routeState?.artistName?.trim() || routeState?.sourceTrack.artistName.trim() || ''
  const isMissingArtistReference = !artistId && !requestedArtistName

  useEffect(() => {
    let isActive = true

    if (isMissingArtistReference) {
      return () => {
        isActive = false
      }
    }

    void (async () => {
      if (!isActive) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [artistTracks, profile] = await Promise.all([
          getArtistTracks({
            artistId,
            artistName: requestedArtistName,
          }),
          getArtistProfileByIdentity({
            artistId,
            artistName: requestedArtistName || routeState?.sourceTrack.artistName || 'Artist',
            artistShareUrl: routeState?.sourceTrack.artistShareUrl,
            artistWebsite: routeState?.sourceTrack.artistWebsite,
            artistImageUrl: routeState?.sourceTrack.artistImageUrl,
          }),
        ])

        if (!isActive) {
          return
        }

        setTracks(artistTracks)
        setArtistProfile(profile)
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Artist tracks are unavailable right now.')
        setTracks([])
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isActive = false
    }
  }, [artistId, isMissingArtistReference, requestedArtistName, routeState?.sourceTrack])

  const resolvedArtistName = artistProfile?.name || tracks[0]?.artistName || requestedArtistName || 'Artist'
  const artistPlaylist = useMemo(
    () => createPlaylist(`${resolvedArtistName} playlist`, 'artist', tracks),
    [resolvedArtistName, tracks],
  )
  const isCurrentArtistSession = queue?.id === artistPlaylist.id
  const isLoadingArtistPage = !isMissingArtistReference && isLoading

  return (
    <div className="space-y-6 lg:flex lg:min-h-full lg:flex-col lg:space-y-5">
      <section className="editorial-panel rounded-[2rem] px-6 py-7 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Artist playlist</p>
            <h1 className="font-heading text-[1.9rem] leading-tight text-text-primary sm:text-[2.3rem]">
              {resolvedArtistName}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              Explore this artist&apos;s available Jamendo tracks in one ordered playlist and jump straight into a full listening session.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>{tracks.length} tracks</span>
            <Button type="button" variant="ghost" asChild>
              <Link to="/discover">Back to Discover</Link>
            </Button>
          </div>
        </div>
      </section>

      <ArtistProfileCard
        artistName={resolvedArtistName}
        artistProfile={artistProfile}
        isLoading={isLoadingArtistPage}
        isOnline={isOnline}
      />

      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Playlist</p>
          <h2 className="mt-2 font-heading text-2xl text-text-primary">Artist tracks</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Play any row to start an artist session with next and previous navigation across this list.
          </p>
        </div>

        {isLoadingArtistPage ? <StatusPanel title="Loading artist tracks" message="Fetching the latest artist playlist from Jamendo." /> : null}

        {isMissingArtistReference ? (
          <StatusPanel title="Artist details are unavailable" message="This card did not provide enough artist data to build a playlist view." />
        ) : null}

        {!isLoadingArtistPage && error ? <StatusPanel title="Artist tracks are unavailable" message={error} /> : null}

        {!isMissingArtistReference && !isLoadingArtistPage && !error && tracks.length === 0 ? (
          <EmptyState
            title="No artist tracks found"
            description="Jamendo did not return any playable tracks for this artist reference."
          />
        ) : null}

        {!isMissingArtistReference && !isLoadingArtistPage && !error && tracks.length > 0 ? (
          <div className="space-y-3">
            {tracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id
              const isFavorite = favorites.some((favorite) => favorite.id === track.id)
              const artistShareUrl =
                typeof window !== 'undefined'
                  ? `${window.location.origin}${artistId ? `/artist/${artistId}` : '/artist'}?name=${encodeURIComponent(resolvedArtistName)}`
                  : null

              return (
                <TrackListRow
                  key={`artist-${track.id}`}
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite={isFavorite}
                  onPlay={() => {
                    const shouldToggleCurrent = isCurrent && isCurrentArtistSession

                    if (shouldToggleCurrent) {
                      togglePlay()
                      return
                    }

                    playTrackFromContext(track, artistPlaylist)
                  }}
                  onToggleFavorite={() => {
                    void toggleFavorite(track)
                  }}
                  onPlayNext={playNextInQueue}
                  onAddToQueue={addToQueue}
                  shareContext={
                    artistShareUrl
                      ? {
                          label: 'artist playlist link',
                          title: `${resolvedArtistName} on Tonaliz Lite`,
                          url: artistShareUrl,
                        }
                      : null
                  }
                />
              )
            })}
          </div>
        ) : null}
      </section>
    </div>
  )
}
