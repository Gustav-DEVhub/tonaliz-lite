import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, ListPlus, Play, Share2, Shuffle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { Track } from '@/entities/track/model/types'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { useSavedCollectionsStore } from '@/features/library/store/use-saved-collections-store'
import {
  getShelfConfigById,
  parseShelfCollectionSourceId,
} from '@/features/discover/lib/exploration-shelves'
import { loadTrackShelves } from '@/features/discover/lib/load-track-shelves'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { ShareLinkDialog } from '@/shared/ui/share-link-dialog'
import { StatusPanel } from '@/shared/ui/status-panel'

function decodeCollectionId(value: string | undefined) {
  if (!value) {
    return null
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function ShelfCollectionPage() {
  const { collectionId } = useParams()
  const navigate = useNavigate()
  const sourceId = decodeCollectionId(collectionId)
  const parsedCollection = sourceId ? parseShelfCollectionSourceId(sourceId) : null
  const shelfConfig = parsedCollection ? getShelfConfigById(parsedCollection.shelfId) : null
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(shelfConfig))
  const [error, setError] = useState<string | null>(null)
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const saveCollection = useSavedCollectionsStore((state) => state.saveCollection)
  const removeCollection = useSavedCollectionsStore((state) => state.removeCollection)
  const isSaved = useSavedCollectionsStore((state) => state.isSaved)
  const showToast = useToastStore((state) => state.showToast)
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((track) => track.id)), [favorites])
  const playlist = createPlaylist(shelfConfig?.title ?? 'Shelf collection', parsedCollection?.source ?? 'discover', tracks)
  const routePath = sourceId ? `/collection/${encodeURIComponent(sourceId)}` : null
  const shareUrl = routePath && typeof window !== 'undefined' ? `${window.location.origin}${routePath}` : routePath
  const isCollectionSaved = sourceId ? isSaved('shelf-collection', sourceId) : false
  const resolvedError = !shelfConfig ? 'Shelf collection was not found.' : error

  useEffect(() => {
    if (!shelfConfig) {
      return
    }

    let isCancelled = false

    void loadTrackShelves([shelfConfig])
      .then((shelves) => {
        if (isCancelled) {
          return
        }

        const shelfTracks = shelves[0]?.tracks ?? []
        setTracks(shelfTracks)
        setError(shelfTracks.length === 0 ? 'No tracks are available for this collection right now.' : null)
      })
      .catch((loadError) => {
        if (isCancelled) {
          return
        }

        setTracks([])
        setError(loadError instanceof Error ? loadError.message : 'Could not load this collection.')
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [shelfConfig])

  const handlePlay = () => {
    if (!tracks[0]) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    playTrackFromContext(tracks[0], playlist)
  }

  const handleShuffle = () => {
    if (!tracks[0]) {
      showToast({ title: 'No tracks to shuffle', variant: 'warning' })
      return
    }

    const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5)
    playTrackFromContext(shuffledTracks[0], createPlaylist(`${shelfConfig?.title ?? 'Collection'} shuffled`, parsedCollection?.source ?? 'discover', shuffledTracks))
    showToast({ title: 'Shuffle started', variant: 'success' })
  }

  const handleAddToQueue = () => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    tracks.forEach((track) => addToQueue(track))
    showToast({ title: 'Added to queue', description: `${tracks.length} tracks added.`, variant: 'success' })
  }

  const handleToggleSaved = async () => {
    if (!sourceId || !shelfConfig || !routePath) {
      return
    }

    if (isCollectionSaved) {
      await removeCollection('shelf-collection', sourceId)
      showToast({ title: 'Removed from Library', variant: 'success' })
      return
    }

    await saveCollection({
      type: 'shelf-collection',
      sourceId,
      title: shelfConfig.title,
      subtitle: shelfConfig.description,
      imageUrl: tracks[0]?.imageUrl ?? null,
      trackCount: tracks.length,
      routePath,
      externalUrl: null,
    })
    showToast({ title: 'Saved to Library', variant: 'success' })
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
    <div className="space-y-5 lg:flex lg:min-h-full lg:flex-col">
      <section className="editorial-panel overflow-visible rounded-[1.75rem] px-4 py-5 sm:rounded-[2rem] sm:px-7 sm:py-7">
        <Button
          type="button"
          variant="ghost"
          className="mb-5 gap-2 border border-white/10 bg-white/5"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-6">
          <div className="flex size-36 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/6 text-primary-soft shadow-[0_22px_60px_rgba(0,0,0,0.32)] sm:size-44 lg:size-52">
            {tracks[0] ? (
              <img src={tracks[0].imageUrl} alt={`${shelfConfig?.title ?? 'Collection'} cover`} className="size-full object-cover" />
            ) : (
              <Bookmark className="size-12" />
            )}
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-text-muted">Shelf collection</p>
            <h1 className="mt-2 font-heading text-[2.35rem] leading-none text-text-primary sm:text-[3rem] lg:text-[4.2rem]">
              {shelfConfig?.title ?? 'Collection'}
            </h1>
            {shelfConfig?.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{shelfConfig.description}</p>
            ) : null}
            <p className="mt-3 text-sm text-text-secondary">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button type="button" className="gap-2" onClick={handlePlay} disabled={tracks.length === 0} aria-label="Play">
                <Play className="size-4" />
                Play
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={handleShuffle} disabled={tracks.length === 0} aria-label="Shuffle">
                <Shuffle className="size-4" />
                Shuffle
              </Button>
              <Button type="button" variant="ghost" className="gap-2 border border-white/10 bg-white/5" onClick={() => void handleToggleSaved()} aria-label={isCollectionSaved ? 'Remove collection from Library' : 'Save collection to Library'}>
                {isCollectionSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                {isCollectionSaved ? 'Remove from Library' : 'Save to Library'}
              </Button>
              <Button type="button" variant="ghost" className="gap-2 border border-white/10 bg-white/5" onClick={handleAddToQueue} aria-label="Add collection to queue">
                <ListPlus className="size-4" />
                Add to queue
              </Button>
              <Button type="button" variant="ghost" className="gap-2 border border-white/10 bg-white/5" onClick={() => setIsAddToPlaylistOpen(true)} disabled={tracks.length === 0} aria-label="Add collection to playlist">
                <ListPlus className="size-4" />
                Add to playlist
              </Button>
              <Button type="button" variant="ghost" className="gap-2 border border-white/10 bg-white/5" onClick={() => setIsShareOpen(true)} aria-label="Share collection">
                <Share2 className="size-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? <StatusPanel title="Loading collection" message="Fetching tracks for this shelf." /> : null}
      {!isLoading && resolvedError ? <StatusPanel title="Collection unavailable" message={resolvedError} /> : null}
      {!isLoading && !resolvedError && tracks.length === 0 ? (
        <EmptyState title="No tracks in this collection" description="This shelf did not return playable tracks right now." />
      ) : null}

      {tracks.length > 0 ? (
        <section className="space-y-3">
          {tracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id

            return (
              <TrackListRow
                key={track.id}
                track={track}
                isCurrent={isCurrent}
                isPlaying={isCurrent && isPlaying}
                isFavorite={favoriteTrackIds.has(track.id)}
                onOpenContext={() => openArtistFromTrack(track)}
                onPlay={() => {
                  const shouldToggleCurrent = isCurrent && queue?.id === playlist.id

                  if (shouldToggleCurrent) {
                    togglePlay()
                    return
                  }

                  playTrackFromContext(track, playlist)
                }}
                onToggleFavorite={() => void toggleFavorite(track)}
                onPlayNext={playNextInQueue}
                onAddToQueue={addToQueue}
                onViewArtist={() => openArtistFromTrack(track)}
                enableDesktopActionsMenu
                showMobileMoreButton
                showMoodBadge={false}
                showTags={false}
              />
            )
          })}
        </section>
      ) : null}

      <AddToPlaylistDialog
        tracks={tracks}
        collectionTitle={shelfConfig?.title ?? 'Collection'}
        open={isAddToPlaylistOpen}
        onOpenChange={setIsAddToPlaylistOpen}
      />
      <ShareLinkDialog
        title={`${shelfConfig?.title ?? 'Collection'} on Tonaliz Lite`}
        description={`Shelf collection - ${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
        url={shareUrl}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
      />
    </div>
  )
}
