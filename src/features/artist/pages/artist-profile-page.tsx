import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { ArrowLeft, Bookmark, BookmarkCheck, Globe2, ListPlus, MoreHorizontal, Play, Shuffle, Share2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { DesktopTrackColumnsMenu } from '@/entities/track/ui/desktop-track-columns-menu'
import { DesktopTrackListHeaderRow } from '@/entities/track/ui/desktop-track-list-header-row'
import { resolveDesktopTrackSource } from '@/entities/track/ui/desktop-track-columns'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { useDesktopTrackColumns } from '@/entities/track/ui/use-desktop-track-columns'
import type { ArtistRouteState } from '@/features/artist/lib/artist-route'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { useSavedCollectionsStore } from '@/features/library/store/use-saved-collections-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { canUseNativeShare, shareWithNativeSheet } from '@/shared/lib/share'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { ShareLinkDialog } from '@/shared/ui/share-link-dialog'
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
  const navigate = useNavigate()
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
  const showToast = useToastStore((state) => state.showToast)
  const savedCollections = useSavedCollectionsStore((state) => state.collections)
  const saveSavedCollection = useSavedCollectionsStore((state) => state.saveCollection)
  const removeSavedCollection = useSavedCollectionsStore((state) => state.removeCollection)
  const { columns: desktopColumns, setColumn: setDesktopColumn } = useDesktopTrackColumns()

  const [tracks, setTracks] = useState<Track[]>([])
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isArtistTracksMenuOpen, setIsArtistTracksMenuOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isArtistTracksShareDialogOpen, setIsArtistTracksShareDialogOpen] = useState(false)
  const [isAddToPlaylistDialogOpen, setIsAddToPlaylistDialogOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const artistTracksMenuRef = useRef<HTMLDivElement | null>(null)
  const artistTracksSheetRef = useRef<HTMLDivElement | null>(null)
  const artistTracksSheetDragControls = useDragControls()
  const shouldReduceMotion = useReducedMotion()

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
  const artistSourceId = artistId ?? (requestedArtistName ? requestedArtistName.toLowerCase() : resolvedArtistName.toLowerCase())
  const artistTracksCollectionSourceId = `artist-tracks:${artistSourceId}`
  const artistTracksCollectionTitle = `${resolvedArtistName} Artist tracks`
  const artistRoutePath = `${location.pathname}${location.search}`
  const isArtistSaved = useMemo(
    () => savedCollections.some((collection) => collection.type === 'artist' && collection.sourceId === artistSourceId),
    [artistSourceId, savedCollections],
  )
  const isArtistTracksCollectionSaved = useMemo(
    () => savedCollections.some((collection) => collection.type === 'collection' && collection.sourceId === artistTracksCollectionSourceId),
    [artistTracksCollectionSourceId, savedCollections],
  )
  const artistJamendoUrl = getValidExternalUrl(artistProfile?.shareUrl ?? routeState?.sourceTrack.artistShareUrl ?? null)
  const artistInternalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${location.pathname}${location.search}`
    : null
  const artistHasSourceColumn = useMemo(() => tracks.some((track) => Boolean(resolveDesktopTrackSource(track))), [tracks])
  const visibleDesktopColumns = useMemo(
    () => ({
      artist: desktopColumns.artist,
      source: desktopColumns.source && artistHasSourceColumn,
      duration: desktopColumns.duration,
    }),
    [artistHasSourceColumn, desktopColumns],
  )

  useEffect(() => {
    if (!isArtistTracksMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (!artistTracksMenuRef.current?.contains(target) && !artistTracksSheetRef.current?.contains(target)) {
        setIsArtistTracksMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsArtistTracksMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isArtistTracksMenuOpen])

  const handlePlayArtistSession = () => {
    if (!tracks[0]) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    playTrackFromContext(tracks[0], artistPlaylist)
  }

  const handleShuffleArtistSession = () => {
    if (!tracks[0]) {
      showToast({ title: 'No tracks to shuffle', variant: 'warning' })
      return
    }

    const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5)
    playTrackFromContext(shuffledTracks[0], createPlaylist(`${resolvedArtistName} shuffled`, 'artist', shuffledTracks))
    showToast({ title: 'Shuffle started', variant: 'success' })
  }

  const handleToggleArtistSavedCollection = async () => {
    if (isArtistSaved) {
      setIsRemoveConfirmOpen(true)
      return
    }

    await saveSavedCollection({
      type: 'artist',
      sourceId: artistSourceId,
      title: resolvedArtistName,
      subtitle: 'Saved artist',
      imageUrl: artistProfile?.imageUrl ?? routeState?.sourceTrack.artistImageUrl ?? tracks[0]?.imageUrl ?? null,
      trackCount: tracks.length,
      routePath: artistRoutePath,
      externalUrl: artistJamendoUrl,
    })
    showToast({ title: 'Artist saved', variant: 'success' })
  }

  const handleToggleArtistTracksCollection = async () => {
    if (!hasTracks) {
      showToast({ title: 'No tracks to save', variant: 'warning' })
      return
    }

    if (isArtistTracksCollectionSaved) {
      await removeSavedCollection('collection', artistTracksCollectionSourceId)
      showToast({ title: 'Removed from Library', variant: 'success' })
      setIsArtistTracksMenuOpen(false)
      return
    }

    await saveSavedCollection({
      type: 'collection',
      sourceId: artistTracksCollectionSourceId,
      title: artistTracksCollectionTitle,
      subtitle: 'Artist tracks',
      imageUrl: artistProfile?.imageUrl ?? routeState?.sourceTrack.artistImageUrl ?? tracks[0]?.imageUrl ?? null,
      trackCount: tracks.length,
      routePath: artistRoutePath,
      externalUrl: artistJamendoUrl,
    })
    showToast({ title: 'Saved to Library', variant: 'success' })
    setIsArtistTracksMenuOpen(false)
  }

  const handleAddArtistTracksToQueue = () => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    tracks.forEach((track) => addToQueue(track))
    showToast({ title: 'Added to queue', description: `${tracks.length} tracks added.`, variant: 'success' })
    setIsArtistTracksMenuOpen(false)
  }

  const handleOpenArtistTracksAddToPlaylist = () => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    setIsArtistTracksMenuOpen(false)
    setIsAddToPlaylistDialogOpen(true)
  }

  const handleShareArtist = async () => {
    const link = artistInternalUrl ?? artistJamendoUrl

    if (!link) {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    try {
      if (canUseNativeShare()) {
        const didShare = await shareWithNativeSheet({
          title: `${resolvedArtistName} on Tonaliz Lite`,
          text: `Listen to ${resolvedArtistName} on Tonaliz Lite.`,
          url: link,
        })

        if (didShare) {
          return
        }
      }
    } catch {
      // Fall through to the local share sheet when native share is cancelled or unavailable.
    }

    setIsShareDialogOpen(true)
  }

  const handleShareArtistTracksCollection = async () => {
    const link = artistInternalUrl ?? artistJamendoUrl

    if (!link) {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    try {
      if (canUseNativeShare()) {
        const didShare = await shareWithNativeSheet({
          title: `${artistTracksCollectionTitle} on Tonaliz Lite`,
          text: `Listen to ${artistTracksCollectionTitle} on Tonaliz Lite.`,
          url: link,
        })

        if (didShare) {
          setIsArtistTracksMenuOpen(false)
          return
        }
      }
    } catch {
      // Fall through to the local share sheet when native share is cancelled or unavailable.
    }

    setIsArtistTracksMenuOpen(false)
    setIsArtistTracksShareDialogOpen(true)
  }

  const moreMenuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'

  return (
    <div className="space-y-6 lg:flex lg:min-h-full lg:flex-col lg:space-y-5">
      <section className="editorial-panel overflow-visible rounded-[1.9rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-8">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-6">
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/8 hover:text-text-primary lg:col-span-2"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <div className="flex justify-center lg:block">
            {artistProfile?.imageUrl ? (
              <img
                src={artistProfile.imageUrl}
                alt={`${resolvedArtistName} portrait`}
                className="size-36 shrink-0 rounded-[1.6rem] object-cover shadow-[0_22px_60px_rgba(0,0,0,0.36)] sm:size-44 lg:size-52"
              />
            ) : (
              <div className="flex size-36 shrink-0 items-center justify-center rounded-[1.6rem] border border-border-subtle bg-black/20 text-text-muted shadow-[0_22px_60px_rgba(0,0,0,0.28)] sm:size-44 lg:size-52">
                <Globe2 className="size-10 sm:size-12" />
              </div>
            )}
          </div>

          <div className="min-w-0 text-center lg:text-left">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">Artist</p>
              <h1 className="mt-2 font-heading text-[2.2rem] leading-[0.98] text-text-primary sm:text-[3rem] lg:text-[4.6rem]">
                {resolvedArtistName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.84rem] text-text-secondary sm:text-sm lg:justify-start">
                <span>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
                <span>Artist session</span>
                {isLoadingArtistPage ? <span>Refreshing from Jamendo...</span> : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                <Button type="button" onClick={handlePlayArtistSession} disabled={!hasTracks} className="gap-2" aria-label="Play">
                  <Play className="size-4" />
                  Play
                </Button>

                <Button type="button" variant="secondary" className="gap-2" onClick={handleShuffleArtistSession} aria-label="Shuffle">
                  <Shuffle className="size-4" />
                  Shuffle
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 border border-white/10 bg-white/5"
                  onClick={() => void handleToggleArtistSavedCollection()}
                  aria-label={isArtistSaved ? 'Remove artist' : 'Save artist'}
                  title={isArtistSaved ? 'Remove artist' : 'Save artist'}
                >
                  {isArtistSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  {isArtistSaved ? 'Remove artist' : 'Save artist'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 border border-white/10 bg-white/5"
                  onClick={() => void handleShareArtist()}
                  aria-label="Share artist"
                  title="Share artist"
                >
                  <Share2 className="size-4" />
                  Share
                </Button>
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

          <div className="flex items-center gap-2 sm:justify-end">
            <p className="hidden font-mono text-xs uppercase tracking-[0.22em] text-text-muted sm:block">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </p>
            <div ref={artistTracksMenuRef} className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="border border-white/10 bg-white/5"
                onClick={() => setIsArtistTracksMenuOpen((open) => !open)}
                aria-label="Artist tracks options"
                aria-expanded={isArtistTracksMenuOpen}
                title="Artist tracks options"
              >
                <MoreHorizontal className="size-4" />
              </Button>

              {isArtistTracksMenuOpen ? (
                <div className="editorial-panel absolute right-0 top-12 z-30 hidden w-64 rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)] lg:block">
                  <button type="button" className={moreMenuItemClassName} onClick={() => void handleToggleArtistTracksCollection()}>
                    {isArtistTracksCollectionSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                    {isArtistTracksCollectionSaved ? 'Remove from Library' : 'Save to Library'}
                  </button>
                  <button type="button" className={moreMenuItemClassName} onClick={handleAddArtistTracksToQueue}>
                    <ListPlus className="size-4" />
                    Add to queue
                  </button>
                  <button type="button" className={moreMenuItemClassName} onClick={handleOpenArtistTracksAddToPlaylist}>
                    <ListPlus className="size-4" />
                    Add to playlist
                  </button>
                  <button type="button" className={moreMenuItemClassName} onClick={() => void handleShareArtistTracksCollection()}>
                    <Share2 className="size-4" />
                    Share
                  </button>
                </div>
              ) : null}
            </div>
          </div>
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
          <StatusPanel title="We couldn't load this artist session." message={error} />
        ) : null}

        {!isMissingArtistReference && !isLoadingArtistPage && !error && tracks.length === 0 ? (
          <EmptyState
            title="No tracks found for this artist."
            description="Jamendo did not return any playable tracks for this artist reference."
          />
        ) : null}

        {!isMissingArtistReference && !isLoadingArtistPage && !error && tracks.length > 0 ? (
          <div className="space-y-3">
            <div className="hidden items-center justify-end lg:flex">
              <DesktopTrackColumnsMenu
                columns={desktopColumns}
                hasSourceColumn={artistHasSourceColumn}
                onToggleColumn={setDesktopColumn}
              />
            </div>
            <DesktopTrackListHeaderRow columns={visibleDesktopColumns} />
            {tracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id
              const isFavorite = favoriteTrackIds.has(track.id)
              const desktopSourceText = resolveDesktopTrackSource(track)
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
                  enableDesktopActionsMenu
                  showMoodBadge={false}
                  showTags={false}
                  desktopDetailLayout
                  desktopTrackNumber={index + 1}
                  desktopColumns={visibleDesktopColumns}
                  desktopSourceText={desktopSourceText}
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

      <AnimatePresence>
        {isArtistTracksMenuOpen ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[118] bg-black/55 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.14 }}
              onClick={() => setIsArtistTracksMenuOpen(false)}
              aria-label="Close artist tracks options"
            />
            <motion.div
              ref={artistTracksSheetRef}
              className="fixed inset-x-0 bottom-0 z-[119] rounded-t-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(21,17,28,0.98),rgba(11,9,16,0.98))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-18px_54px_rgba(0,0,0,0.42)] lg:hidden"
              initial={{ y: '100%', opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.9 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.01, ease: 'linear' }
                  : { duration: 0.18, ease: 'easeOut' }
              }
              drag="y"
              dragListener={false}
              dragControls={artistTracksSheetDragControls}
              dragDirectionLock
              dragElastic={0.08}
              dragMomentum={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 620) {
                  setIsArtistTracksMenuOpen(false)
                }
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="mx-auto mb-3 block h-1.5 w-14 touch-none rounded-full bg-white/18"
                onPointerDown={(event) => {
                  event.stopPropagation()
                  artistTracksSheetDragControls.start(event)
                }}
                aria-label="Drag to close artist tracks options"
              />
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-heading text-[1.25rem] text-text-primary">Artist tracks options</h2>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary"
                  onClick={() => setIsArtistTracksMenuOpen(false)}
                  aria-label="Close artist tracks options"
                >
                  <X className="size-4.5" />
                </button>
              </div>
              <div className="space-y-1">
                <button type="button" className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8" onClick={() => void handleToggleArtistTracksCollection()}>
                  {isArtistTracksCollectionSaved ? <BookmarkCheck className="size-4.5" /> : <Bookmark className="size-4.5" />}
                  {isArtistTracksCollectionSaved ? 'Remove from Library' : 'Save to Library'}
                </button>
                <button type="button" className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8" onClick={handleAddArtistTracksToQueue}>
                  <ListPlus className="size-4.5" />
                  Add to queue
                </button>
                <button type="button" className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8" onClick={handleOpenArtistTracksAddToPlaylist}>
                  <ListPlus className="size-4.5" />
                  Add to playlist
                </button>
                <button type="button" className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8" onClick={() => void handleShareArtistTracksCollection()}>
                  <Share2 className="size-4.5" />
                  Share
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <Dialog.Root open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-[2px]" />
          <Dialog.Content className="editorial-panel fixed left-1/2 top-1/2 z-[121] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.4rem] border border-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Dialog.Title className="font-heading text-[1.2rem] text-text-primary">
                  Remove artist?
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-text-secondary">
                  This artist will be removed from your Library.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
                  aria-label="Close confirmation"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" className="border border-white/10 bg-white/5">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                className="bg-primary text-white hover:bg-primary-hover"
                onClick={async () => {
                  setIsRemoveConfirmOpen(false)
                  await removeSavedCollection('artist', artistSourceId)
                  showToast({ title: 'Artist removed', variant: 'success' })
                }}
              >
                Remove
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AddToPlaylistDialog
        tracks={tracks}
        collectionTitle={artistTracksCollectionTitle}
        open={isAddToPlaylistDialogOpen}
        onOpenChange={setIsAddToPlaylistDialogOpen}
      />
      <ShareLinkDialog
        title={`${resolvedArtistName} on Tonaliz Lite`}
        description={`${resolvedArtistName} artist session`}
        url={artistInternalUrl ?? artistJamendoUrl}
        externalHref={artistJamendoUrl}
        externalLabel="View on Jamendo"
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
      <ShareLinkDialog
        title={`${artistTracksCollectionTitle} on Tonaliz Lite`}
        description="Artist tracks collection"
        url={artistInternalUrl ?? artistJamendoUrl}
        externalHref={artistJamendoUrl}
        externalLabel="View on Jamendo"
        open={isArtistTracksShareDialogOpen}
        onOpenChange={setIsArtistTracksShareDialogOpen}
      />
    </div>
  )
}
