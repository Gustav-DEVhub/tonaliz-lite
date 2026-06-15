import { ArrowLeft, ExternalLink, Globe2, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import type { ArtistRouteState } from '@/features/artist/lib/artist-route'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatusPanel } from '@/shared/ui/status-panel'
import { getArtistProfileByIdentity } from '@/lib/jamendo/artist-service'
import { getArtistTracks } from '@/lib/jamendo/artist-tracks-service'

function getValidExternalUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.toString() : null
  } catch {
    return null
  }
}

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

  const [tracks, setTracks] = useState<Track[]>([])
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestedArtistName =
    searchParams.get('name')?.trim() || routeState?.artistName?.trim() || routeState?.sourceTrack.artistName.trim() || ''
  const isMissingArtistReference = !artistId && !requestedArtistName
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])

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
  const hasTracks = tracks.length > 0
  const artistJamendoUrl = getValidExternalUrl(artistProfile?.shareUrl ?? routeState?.sourceTrack.artistShareUrl ?? null)
  const artistWebsiteUrl = getValidExternalUrl(artistProfile?.website ?? routeState?.sourceTrack.artistWebsite ?? null)

  const handlePlayArtistSession = () => {
    if (!tracks[0]) {
      return
    }

    playTrackFromContext(tracks[0], artistPlaylist)
  }

  return (
    <div className="space-y-6 lg:flex lg:min-h-full lg:flex-col lg:space-y-5">
      <section className="editorial-panel rounded-[1.9rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 items-start gap-4">
            {artistProfile?.imageUrl ? (
              <img
                src={artistProfile.imageUrl}
                alt={`${resolvedArtistName} portrait`}
                className="size-18 shrink-0 rounded-[1.2rem] object-cover sm:size-20 lg:size-24"
              />
            ) : (
              <div className="flex size-18 shrink-0 items-center justify-center rounded-[1.2rem] border border-border-subtle bg-black/20 text-text-muted sm:size-20 lg:size-24">
                <Globe2 className="size-7 sm:size-8" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">Artist playlist</p>
              <h1 className="mt-2 font-heading text-[1.75rem] leading-tight text-text-primary sm:text-[2.1rem] lg:text-[2.4rem]">
                {resolvedArtistName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.84rem] text-text-secondary sm:text-sm">
                <span>{tracks.length} {tracks.length === 1 ? 'track loaded' : 'tracks loaded'}</span>
                {isLoadingArtistPage ? <span>Refreshing from Jamendo...</span> : null}
              </div>
              <p className="mt-3 max-w-3xl text-[0.92rem] leading-6 text-text-secondary">
                Explore this artist session, start the full playlist from the top, or jump into any track without losing next and previous continuity.
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button type="button" variant="ghost" asChild className="border border-border-subtle">
                  <Link to="/discover">
                    <ArrowLeft className="size-4" />
                    Back to Discover
                  </Link>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePlayArtistSession}
                  disabled={!hasTracks}
                  className="gap-2"
                >
                  <Play className="size-4" />
                  Play artist session
                </Button>

                {artistJamendoUrl ? (
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <a href={artistJamendoUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Jamendo
                    </a>
                  </Button>
                ) : null}

                {artistWebsiteUrl ? (
                  <Button type="button" variant="ghost" size="sm" asChild className="border border-border-subtle">
                    <a href={artistWebsiteUrl} target="_blank" rel="noreferrer">
                      <Globe2 className="size-4" />
                      Website
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="hidden min-w-[12rem] justify-end lg:flex">
            <div className="rounded-[1.3rem] border border-white/8 bg-black/14 px-4 py-3 text-right">
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-text-muted">Session</p>
              <p className="mt-2 text-[0.94rem] text-text-primary">
                {hasTracks ? `${tracks.length} tracks ready` : isLoadingArtistPage ? 'Loading tracks' : 'No tracks yet'}
              </p>
              <p className="mt-1 text-[0.8rem] text-text-secondary">
                {isCurrentArtistSession ? 'Current player context matches this artist.' : 'Play from any row to start this artist queue.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 lg:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-text-muted">Playlist</p>
            <h2 className="mt-2 font-heading text-[1.35rem] text-text-primary sm:text-[1.7rem]">Artist tracks</h2>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Play any row to start an artist session with next and previous navigation across this list.
            </p>
          </div>

          <p className="hidden font-mono text-xs uppercase tracking-[0.22em] text-text-muted sm:block">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {isLoadingArtistPage ? (
          <StatusPanel title="Loading artist session" message="Fetching the latest artist playlist from Jamendo." />
        ) : null}

        {isMissingArtistReference ? (
          <StatusPanel
            title="Artist details are unavailable"
            message="This card did not provide enough artist data to build a playlist view."
          />
        ) : null}

        {!isLoadingArtistPage && error ? (
          <StatusPanel title="We couldn’t load this artist session." message={error} />
        ) : null}

        {!isMissingArtistReference && !isLoadingArtistPage && !error && tracks.length === 0 ? (
          <EmptyState
            title="No tracks found for this artist."
            description="Jamendo did not return any playable tracks for this artist reference."
          />
        ) : null}

        {!isMissingArtistReference && !isLoadingArtistPage && !error && tracks.length > 0 ? (
          <div className="space-y-3">
            {tracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id
              const isFavorite = favoriteTrackIds.has(track.id)
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
