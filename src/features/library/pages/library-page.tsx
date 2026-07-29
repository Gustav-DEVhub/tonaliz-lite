import * as Dialog from '@radix-ui/react-dialog'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { ArrowLeft, Bookmark, BookmarkCheck, Check, ChevronDown, Clock3, ExternalLink, Grid2X2, Heart, List, ListMusic, ListPlus, MoreHorizontal, MoreVertical, Play, Plus, Search, Share2, Shuffle, UserRound, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { SavedCollection, Track } from '@/entities/track/model/types'
import {
  resolveDesktopTrackSource,
} from '@/entities/track/ui/desktop-track-columns'
import { DesktopTrackColumnsMenu } from '@/entities/track/ui/desktop-track-columns-menu'
import { DesktopTrackListHeaderRow } from '@/entities/track/ui/desktop-track-list-header-row'
import { TrackCard } from '@/entities/track/ui/track-card'
import { TrackListRow } from '@/entities/track/ui/track-list-row'
import { useMobileLongPress } from '@/entities/track/ui/use-mobile-long-press'
import { useDesktopTrackColumns } from '@/entities/track/ui/use-desktop-track-columns'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import {
  getShelfConfigById,
  parseShelfCollectionSourceId,
} from '@/features/discover/lib/exploration-shelves'
import { loadTrackShelves } from '@/features/discover/lib/load-track-shelves'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { OrganizeMenu, type OrganizeLayout, type OrganizeSort } from '@/features/library/components/organize-menu'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlaylistsStore } from '@/features/library/store/use-playlists-store'
import { useSavedCollectionsStore } from '@/features/library/store/use-saved-collections-store'
import { useSavedTracksStore } from '@/features/library/store/use-saved-tracks-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useRecentlyPlayedStore } from '@/features/player/store/use-recently-played-store'
import { canUseNativeShare, shareWithNativeSheet } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { ShareLinkDialog } from '@/shared/ui/share-link-dialog'
import { TrackGridSkeleton } from '@/features/discover/components/track-grid-skeleton'
import { StatusPanel } from '@/shared/ui/status-panel'
import { CompactTrackCard } from '@/entities/track/ui/compact-track-card'
import { getArtistTracks } from '@/lib/jamendo/artist-tracks-service'

type SortOption = 'recently-played' | 'recently-added' | 'title' | 'artist'
type MobileLibraryCategory = 'all' | 'songs' | 'artists' | 'playlists'
type MobileLibraryViewMode = 'list' | 'grid'
type DesktopLibraryCategory = 'all' | 'playlists' | 'artists' | 'songs'
type SavedArtistEntry = {
  sourceId: string
  name: string
  imageUrl: string | null
  count: number
  sampleTrack: Track | null
  routePath: string | null
  externalUrl: string | null
}
type MobileLibraryItemMenuTarget =
  | { type: 'local-playlist'; id: string }
  | { type: 'saved-collection'; id: string }
  | { type: 'artist'; sourceId: string }
type DesktopLibraryItemMenuTarget =
  | { type: 'liked' }
  | { type: 'local-playlist'; id: string }
  | { type: 'saved-collection'; id: string }
  | { type: 'artist'; sourceId: string }
type ConfirmDialogState =
  | null
  | {
      title: string
      description: string
      confirmLabel: string
      action: () => void | Promise<void>
    }

const sortLabels: Record<SortOption, string> = {
  'recently-played': 'Recently played',
  'recently-added': 'Recently added',
  title: 'Title',
  artist: 'Artist',
}

function SavedArtistArtwork({ artist, className }: { artist: SavedArtistEntry; className: string }) {
  const imageUrl = artist.imageUrl ?? artist.sampleTrack?.artistImageUrl ?? artist.sampleTrack?.imageUrl

  return imageUrl ? (
    <img src={imageUrl} alt={`${artist.name} artwork`} className={className} />
  ) : (
    <span className={cn('flex items-center justify-center bg-white/5 text-text-muted ring-1 ring-white/10', className)} aria-label={`${artist.name} artwork unavailable`}>
      <UserRound className="size-5" />
    </span>
  )
}

function MobileLongPressCard({
  onLongPress,
  ...articleProps
}: ComponentPropsWithoutRef<'article'> & {
  onLongPress: () => void
}) {
  const longPressBind = useMobileLongPress(onLongPress)

  return <article {...longPressBind} {...articleProps} />
}

export function LibraryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [libraryView, setLibraryView] = useState<'library' | 'history' | 'playlist' | 'liked'>('library')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window === 'undefined') {
      return 'recently-played'
    }

    const storedValue = window.localStorage.getItem('libraryOrder')
    return storedValue === 'recently-added' || storedValue === 'title' || storedValue === 'artist' || storedValue === 'recently-played'
      ? storedValue
      : 'recently-played'
  })
  const [isMobileSortSheetOpen, setIsMobileSortSheetOpen] = useState(false)
  const [isNewPlaylistDialogOpen, setIsNewPlaylistDialogOpen] = useState(false)
  const [mobileViewMode, setMobileViewMode] = useState<MobileLibraryViewMode>('grid')
  const [activeMobileCategory, setActiveMobileCategory] = useState<MobileLibraryCategory>('all')
  const [isMobileLibraryFabCompact, setIsMobileLibraryFabCompact] = useState(false)
  const [desktopCollectionQuery, setDesktopCollectionQuery] = useState('')
  const [desktopCategory, setDesktopCategory] = useState<DesktopLibraryCategory>('all')
  const [detailMoreMenu, setDetailMoreMenu] = useState<null | 'liked' | 'playlist'>(null)
  const [mobileItemMenuTarget, setMobileItemMenuTarget] = useState<MobileLibraryItemMenuTarget | null>(null)
  const [desktopItemMenuTarget, setDesktopItemMenuTarget] = useState<DesktopLibraryItemMenuTarget | null>(null)
  const [desktopItemMenuStyle, setDesktopItemMenuStyle] = useState<CSSProperties>({})
  const [shareDialogTarget, setShareDialogTarget] = useState<null | 'liked' | 'playlist'>(null)
  const [shareSavedCollectionTarget, setShareSavedCollectionTarget] = useState<SavedCollection | null>(null)
  const [shareArtistTarget, setShareArtistTarget] = useState<SavedArtistEntry | null>(null)
  const [isAddCollectionToPlaylistOpen, setIsAddCollectionToPlaylistOpen] = useState(false)
  const [collectionTracksForDialog, setCollectionTracksForDialog] = useState<Track[]>([])
  const [collectionTitleForDialog, setCollectionTitleForDialog] = useState('Playlist')
  const [confirmDialogState, setConfirmDialogState] = useState<ConfirmDialogState>(null)
  const collectionTracksCacheRef = useRef(new Map<string, Track[]>())
  const [desktopLayout, setDesktopLayout] = useState<OrganizeLayout>(() => {
    if (typeof window === 'undefined') {
      return 'default-list'
    }

    const storedValue = window.localStorage.getItem('libraryLayout')
    return storedValue === 'compact-list' || storedValue === 'default-list' || storedValue === 'compact-grid' || storedValue === 'default-grid'
      ? storedValue
      : 'default-list'
  })
  const [relativeTimeBase] = useState(() => Date.now())
  const mobileSortDragControls = useDragControls()
  const detailMoreDragControls = useDragControls()
  const mobileItemMenuDragControls = useDragControls()
  const detailMoreMenuRef = useRef<HTMLDivElement | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const favorites = useFavoritesStore((state) => state.favorites)
  const favoritesHydrating = useFavoritesStore((state) => state.isHydrating)
  const favoritesError = useFavoritesStore((state) => state.error)
  const removeFavoriteTrack = useFavoritesStore((state) => state.removeFavoriteTrack)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const savedTrackEntries = useSavedTracksStore((state) => state.savedTracks)
  const savedTracksHydrating = useSavedTracksStore((state) => state.isHydrating)
  const savedTracksError = useSavedTracksStore((state) => state.error)
  const savedCollections = useSavedCollectionsStore((state) => state.collections)
  const saveSavedCollection = useSavedCollectionsStore((state) => state.saveCollection)
  const removeSavedCollection = useSavedCollectionsStore((state) => state.removeCollection)
  const isSavedCollection = useSavedCollectionsStore((state) => state.isSaved)
  const historyEntries = useRecentlyPlayedStore((state) => state.entries)
  const removeFromHistory = useRecentlyPlayedStore((state) => state.removeFromHistory)
  const userPlaylists = usePlaylistsStore((state) => state.playlists)
  const playlistTracksById = usePlaylistsStore((state) => state.playlistTracksById)
  const removeTrackFromPlaylist = usePlaylistsStore((state) => state.removeTrackFromPlaylist)
  const deletePlaylist = usePlaylistsStore((state) => state.deletePlaylist)
  const isOnline = usePlayerStore((state) => state.isOnline)

  const isHydrating = favoritesHydrating || savedTracksHydrating
  const error = favoritesError ?? savedTracksError
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const showToast = useToastStore((state) => state.showToast)
  const { columns: desktopTrackColumns, setColumn: setDesktopTrackColumn } = useDesktopTrackColumns()
  const favoritesPlaylist = useMemo(() => createPlaylist('Music I Like', 'library', favorites), [favorites])
  const historyPlaylist = useMemo(() => createPlaylist('Listening history', 'library', historyEntries), [historyEntries])
  const savedTracks = useMemo(() => savedTrackEntries.map((entry) => entry.track), [savedTrackEntries])
  const selectedPlaylist = useMemo(
    () => userPlaylists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [selectedPlaylistId, userPlaylists],
  )
  const selectedPlaylistTracks = useMemo(
    () => (selectedPlaylistId ? (playlistTracksById[selectedPlaylistId] ?? []).map((playlistTrack) => playlistTrack.track) : []),
    [playlistTracksById, selectedPlaylistId],
  )
  const selectedRuntimePlaylist = useMemo(
    () => selectedPlaylist ? createPlaylist(selectedPlaylist.title, 'library', selectedPlaylistTracks) : null,
    [selectedPlaylist, selectedPlaylistTracks],
  )
  const isSelectedPlaylistSaved = selectedPlaylist ? isSavedCollection('playlist', selectedPlaylist.id) : false
  const localPlaylistIds = useMemo(() => new Set(userPlaylists.map((playlist) => playlist.id)), [userPlaylists])
  const savedPlaylistCollections = useMemo(() => savedCollections.filter((collection) => (
    collection.type === 'collection'
    || collection.type === 'shelf-collection'
    || (collection.type === 'playlist' && !localPlaylistIds.has(collection.sourceId))
  )), [localPlaylistIds, savedCollections])
  const savedArtistCollections = useMemo(
    () => savedCollections.filter((collection) => collection.type === 'artist'),
    [savedCollections],
  )
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((track) => track.id)), [favorites])
  const playedAtByTrackId = useMemo(() => new Map(historyEntries.map((entry) => [entry.id, entry.playedAt])), [historyEntries])
  const sortedFavorites = useMemo(() => [...favorites].sort((left, right) => {
    if (sortOption === 'recently-added') return right.savedAt.localeCompare(left.savedAt)
    if (sortOption === 'title') return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    if (sortOption === 'artist') return left.artistName.localeCompare(right.artistName, undefined, { sensitivity: 'base' })
    const leftPlayed = playedAtByTrackId.get(left.id)
    const rightPlayed = playedAtByTrackId.get(right.id)
    if (leftPlayed && rightPlayed) return rightPlayed.localeCompare(leftPlayed)
    if (leftPlayed) return -1
    if (rightPlayed) return 1
    return right.savedAt.localeCompare(left.savedAt)
  }), [favorites, playedAtByTrackId, sortOption])
  const sortedSavedTrackEntries = useMemo(() => [...savedTrackEntries].sort((left, right) => {
    if (sortOption === 'artist') {
      return left.track.artistName.localeCompare(right.track.artistName, undefined, { sensitivity: 'base' })
    }

    if (sortOption === 'title') {
      return left.track.name.localeCompare(right.track.name, undefined, { sensitivity: 'base' })
    }

    const leftTimestamp = left.manualSavedAt ?? left.favoritedAt ?? left.updatedAt
    const rightTimestamp = right.manualSavedAt ?? right.favoritedAt ?? right.updatedAt
    return rightTimestamp - leftTimestamp
  }), [savedTrackEntries, sortOption])
  const sortedSavedTracks = useMemo(
    () => sortedSavedTrackEntries.map((entry) => entry.track),
    [sortedSavedTrackEntries],
  )
  const savedTracksPlaylist = useMemo(() => createPlaylist('Songs', 'library', sortedSavedTracks), [sortedSavedTracks])
  const likedHasSourceColumn = useMemo(
    () => sortedFavorites.some((track) => Boolean(resolveDesktopTrackSource(track))),
    [sortedFavorites],
  )
  const playlistHasSourceColumn = useMemo(
    () => selectedPlaylistTracks.some((track) => Boolean(resolveDesktopTrackSource(track))),
    [selectedPlaylistTracks],
  )
  const visibleLikedDesktopColumns = useMemo(
    () => ({
      artist: desktopTrackColumns.artist,
      source: desktopTrackColumns.source && likedHasSourceColumn,
      duration: desktopTrackColumns.duration,
    }),
    [desktopTrackColumns, likedHasSourceColumn],
  )
  const savedTracksHasSourceColumn = useMemo(
    () => sortedSavedTracks.some((track) => Boolean(resolveDesktopTrackSource(track))),
    [sortedSavedTracks],
  )
  const visibleSavedTracksDesktopColumns = useMemo(
    () => ({
      artist: desktopTrackColumns.artist,
      source: desktopTrackColumns.source && savedTracksHasSourceColumn,
      duration: desktopTrackColumns.duration,
    }),
    [desktopTrackColumns, savedTracksHasSourceColumn],
  )
  const visiblePlaylistDesktopColumns = useMemo(
    () => ({
      artist: desktopTrackColumns.artist,
      source: desktopTrackColumns.source && playlistHasSourceColumn,
      duration: desktopTrackColumns.duration,
    }),
    [desktopTrackColumns, playlistHasSourceColumn],
  )
  const sortedMobilePlaylists = useMemo(() => [...userPlaylists].sort((left, right) => {
    if (sortOption === 'title' || sortOption === 'artist') {
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
    }

    if (sortOption === 'recently-added') {
      return right.createdAt.localeCompare(left.createdAt)
    }

    return right.updatedAt.localeCompare(left.updatedAt)
  }), [sortOption, userPlaylists])
  const sortedMobileSavedPlaylistCollections = useMemo(() => [...savedPlaylistCollections].sort((left, right) => {
    if (sortOption === 'title' || sortOption === 'artist') {
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
    }

    if (sortOption === 'recently-added') {
      return right.createdAt.localeCompare(left.createdAt)
    }

    return right.updatedAt.localeCompare(left.updatedAt)
  }), [savedPlaylistCollections, sortOption])
  const todayHistory = useMemo(() => historyEntries.filter((entry) => new Date(entry.playedAt).toDateString() === new Date().toDateString()), [historyEntries])
  const earlierHistory = useMemo(() => historyEntries.filter((entry) => new Date(entry.playedAt).toDateString() !== new Date().toDateString()), [historyEntries])
  const artistTracksByKey = useMemo(() => {
    const tracksMap = new Map<string, Map<string, Track>>()

    for (const track of [...favorites, ...savedTracks]) {
      for (const artistKey of [track.artistId, track.artistName.toLowerCase()].filter((artistKey): artistKey is string => Boolean(artistKey))) {
        const nextArtistTracks = tracksMap.get(artistKey) ?? new Map<string, Track>()
        nextArtistTracks.set(track.id, track)
        tracksMap.set(artistKey, nextArtistTracks)
      }
    }

    return new Map([...tracksMap.entries()].map(([artistKey, artistTracks]) => [artistKey, [...artistTracks.values()]]))
  }, [favorites, savedTracks])
  const savedArtists = useMemo(() => savedArtistCollections.map((collection) => {
    const artistTracks = artistTracksByKey.get(collection.sourceId)
      ?? artistTracksByKey.get(collection.title.toLowerCase())
      ?? []

    return {
      sourceId: collection.sourceId,
      name: collection.title,
      imageUrl: collection.imageUrl,
      count: Math.max(collection.trackCount ?? 0, artistTracks.length),
      sampleTrack: artistTracks[0] ?? null,
      routePath: collection.routePath,
      externalUrl: collection.externalUrl,
    }
  }).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })), [artistTracksByKey, savedArtistCollections])
  const sortedMobileArtists = useMemo(() => [...savedArtists].sort((left, right) => {
    if (sortOption === 'recently-added' || sortOption === 'recently-played') {
      return right.count - left.count || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  }), [savedArtists, sortOption])
  const mobileCategories = useMemo<Array<{ id: MobileLibraryCategory; label: string }>>(
    () => [
      { id: 'all', label: 'All' },
      { id: 'playlists', label: 'Playlists' },
      { id: 'artists', label: 'Artists' },
      { id: 'songs', label: 'Songs' },
    ],
    [],
  )

  const resolvedMobileCategory = mobileCategories.some((category) => category.id === activeMobileCategory)
    ? activeMobileCategory
    : mobileCategories[0]?.id
  const canToggleMobileView = Boolean(resolvedMobileCategory)
  const desktopCollectionQueryNormalized = desktopCollectionQuery.trim().toLowerCase()
  const desktopCategories = useMemo<Array<{ id: DesktopLibraryCategory; label: string }>>(
    () => [
      { id: 'all', label: 'All' },
      { id: 'playlists', label: 'Playlists' },
      { id: 'artists', label: 'Artists' },
      { id: 'songs', label: 'Songs' },
    ],
    [],
  )
  const resolvedDesktopCategory = desktopCategories.some((category) => category.id === desktopCategory)
    ? desktopCategory
    : 'all'
  const desktopViewMode: 'list' | 'grid' =
    desktopLayout === 'compact-grid' || desktopLayout === 'default-grid' ? 'grid' : 'list'

  useEffect(() => {
    let previousScrollY = window.scrollY

    const handleMobileScroll = () => {
      if (window.innerWidth >= 1024) {
        return
      }

      const nextScrollY = window.scrollY
      const scrollDelta = nextScrollY - previousScrollY

      if (nextScrollY <= 24) {
        setIsMobileLibraryFabCompact(false)
      } else if (scrollDelta > 8) {
        setIsMobileLibraryFabCompact(true)
      } else if (scrollDelta < -8) {
        setIsMobileLibraryFabCompact(false)
      }

      previousScrollY = nextScrollY
    }

    window.addEventListener('scroll', handleMobileScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleMobileScroll)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('libraryLayout', desktopLayout)
  }, [desktopLayout])

  useEffect(() => {
    window.localStorage.setItem('libraryOrder', sortOption)
  }, [sortOption])

  useEffect(() => {
    if (!desktopItemMenuTarget) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-library-card-menu-root]')) {
        setDesktopItemMenuTarget(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopItemMenuTarget(null)
      }
    }

    const handleViewportChange = () => {
      setDesktopItemMenuTarget(null)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [desktopItemMenuTarget])

  useEffect(() => {
    const state = location.state as
      | {
          libraryView?: 'library' | 'history' | 'playlist' | 'liked'
          selectedPlaylistId?: string
          libraryAction?: 'new-playlist'
          desktopCategory?: DesktopLibraryCategory
          libraryOrder?: SortOption
        }
      | null

    if (!state) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (state.libraryAction === 'new-playlist') {
        setIsNewPlaylistDialogOpen(true)
      }

      if (state.libraryView === 'playlist' && state.selectedPlaylistId) {
        setSelectedPlaylistId(state.selectedPlaylistId)
        setLibraryView('playlist')
        return
      }

      if (state.desktopCategory) {
        setDesktopCategory(state.desktopCategory)
      }

      if (state.libraryOrder) {
        setSortOption(state.libraryOrder)
      }

      if (state.libraryView) {
        setSelectedPlaylistId(null)
        setLibraryView(state.libraryView)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [location.state])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const view = params.get('view')
    const playlistId = params.get('id')

    const timeoutId = window.setTimeout(() => {
      if (view === 'liked') {
        setLibraryView('liked')
        setSelectedPlaylistId(null)
        return
      }

      if (view === 'playlist' && playlistId) {
        setLibraryView('playlist')
        setSelectedPlaylistId(playlistId)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [location.search])

  useEffect(() => {
    if (!detailMoreMenu) {
      return
    }

    if (!window.matchMedia('(min-width: 1024px)').matches) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!detailMoreMenuRef.current?.contains(event.target as Node)) {
        setDetailMoreMenu(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailMoreMenu(null)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [detailMoreMenu])

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

  const playFromContext = (track: Track, playlist: ReturnType<typeof createPlaylist>) => {
    if (currentTrack?.id === track.id && queue?.id === playlist.id) {
      togglePlay()
      return
    }
    playTrackFromContext(track, playlist)
  }

  const playCollection = (tracks: Track[], playlist: ReturnType<typeof createPlaylist>) => {
    if (!tracks[0]) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    playTrackFromContext(tracks[0], playlist)
  }

  const shuffleCollection = (title: string, tracks: Track[]) => {
    if (!tracks[0]) {
      showToast({ title: 'No tracks to shuffle', variant: 'warning' })
      return
    }

    const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5)
    playTrackFromContext(shuffledTracks[0], createPlaylist(`${title} shuffled`, 'library', shuffledTracks))
    showToast({ title: 'Shuffle started', variant: 'success' })
  }

  const addCollectionToQueue = (tracks: Track[]) => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    tracks.forEach((track) => addToQueue(track))
    showToast({ title: 'Added to queue', description: `${tracks.length} tracks added.`, variant: 'success' })
    setDetailMoreMenu(null)
  }

  const playCollectionNext = (title: string, tracks: Track[]) => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    if (!currentTrack) {
      setDetailMoreMenu(null)
      playCollection(tracks, createPlaylist(title, 'library', tracks))
      return
    }

    // Insert in reverse because each public queue action inserts directly after the current track.
    for (const track of [...tracks].reverse()) {
      playNextInQueue(track)
    }
    showToast({ title: 'Added to queue', description: `${tracks.length} tracks will play next.`, variant: 'success' })
    setDetailMoreMenu(null)
  }

  const getLibraryShareUrl = (target: 'liked' | 'playlist') => {
    if (typeof window === 'undefined') {
      return null
    }

    if (target === 'liked') {
      return `${window.location.origin}/library?view=liked`
    }

    if (!selectedPlaylist) {
      return null
    }

    return `${window.location.origin}/library?view=playlist&id=${encodeURIComponent(selectedPlaylist.id)}`
  }

  const handleShareCollection = async (target: 'liked' | 'playlist') => {
    const link = getLibraryShareUrl(target)

    if (!link) {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches

    if (isMobileViewport && canUseNativeShare()) {
      try {
        const didShare = await shareWithNativeSheet({
          title: target === 'liked' ? 'Music I Like on Tonaliz Lite' : `${selectedPlaylist?.title ?? 'Playlist'} on Tonaliz Lite`,
          text: target === 'liked' ? 'Listen to this saved collection on Tonaliz Lite.' : 'Listen to this playlist on Tonaliz Lite.',
          url: link,
        })

        if (didShare) {
          return
        }
      } catch {
        // Fall back to the local share dialog if native share is cancelled or unavailable.
      }
    }

    setShareDialogTarget(target)
  }

  const handleShareLocalPlaylist = async (playlist: (typeof userPlaylists)[number]) => {
    if (typeof window === 'undefined') {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    const link = `${window.location.origin}/library?view=playlist&id=${encodeURIComponent(playlist.id)}`
    const isMobileViewport = window.matchMedia('(max-width: 1023px)').matches

    if (isMobileViewport && canUseNativeShare()) {
      try {
        const didShare = await shareWithNativeSheet({
          title: `${playlist.title} on Tonaliz Lite`,
          text: playlist.description ?? 'Local playlist',
          url: link,
        })

        if (didShare) {
          return
        }
      } catch {
        // Fall back to clipboard feedback below.
      }
    }

    try {
      await navigator.clipboard.writeText(link)
      showToast({ title: 'Link copied', variant: 'success' })
    } catch {
      showToast({ title: "Couldn't share", variant: 'error' })
    }
  }

  const requestDeletePlaylist = (playlist: (typeof userPlaylists)[number]) => {
    setDesktopItemMenuTarget(null)
    setMobileItemMenuTarget(null)
    setConfirmDialogState({
      title: 'Delete playlist?',
      description: 'This will remove the playlist from your Library.',
      confirmLabel: 'Delete',
      action: async () => {
        await deletePlaylist(playlist.id)
        if (selectedPlaylistId === playlist.id) {
          setSelectedPlaylistId(null)
          setLibraryView('library')
        }
        showToast({ title: 'Playlist deleted', variant: 'success' })
      },
    })
  }

  const requestRemoveSavedCollection = (collection: SavedCollection) => {
    setDesktopItemMenuTarget(null)
    setMobileItemMenuTarget(null)
    setConfirmDialogState({
      title: 'Remove from Library?',
      description: 'This saved item will be removed from your Library.',
      confirmLabel: 'Remove',
      action: async () => {
        await removeSavedCollection(collection.type, collection.sourceId)
        showToast({ title: 'Removed from Library', variant: 'success' })
      },
    })
  }

  const requestRemoveArtistFromLibrary = (sourceId: string) => {
    setDesktopItemMenuTarget(null)
    setMobileItemMenuTarget(null)
    setConfirmDialogState({
      title: 'Remove artist?',
      description: 'This artist will be removed from your Library.',
      confirmLabel: 'Remove',
      action: async () => {
        await removeSavedCollection('artist', sourceId)
        showToast({ title: 'Artist removed', variant: 'success' })
      },
    })
  }

  const getArtistTracksForCollection = (artist: SavedArtistEntry) => artistTracksByKey.get(artist.sourceId)
    ?? artistTracksByKey.get(artist.name.toLowerCase())
    ?? []

  const loadArtistTracksForCollection = async (artist: SavedArtistEntry) => {
    const cacheKey = `artist:${artist.sourceId}`
    const cachedTracks = collectionTracksCacheRef.current.get(cacheKey)

    if (cachedTracks) {
      return cachedTracks
    }

    const availableTracks = getArtistTracksForCollection(artist)
    if (availableTracks.length > 0) {
      collectionTracksCacheRef.current.set(cacheKey, availableTracks)
      return availableTracks
    }

    try {
      const routeUrl = artist.routePath
        ? new URL(artist.routePath, window.location.origin)
        : null
      const routeArtistId = routeUrl?.pathname.match(/^\/artist\/([^/]+)$/)?.[1]
      const artistId = routeArtistId ? decodeURIComponent(routeArtistId) : (/^\d+$/.test(artist.sourceId) ? artist.sourceId : undefined)
      const artistName = routeUrl?.searchParams.get('name')?.trim() || artist.name
      const loadedTracks = await getArtistTracks({ artistId, artistName })

      if (loadedTracks.length > 0) {
        collectionTracksCacheRef.current.set(cacheKey, loadedTracks)
      }
      return loadedTracks
    } catch {
      return []
    }
  }

  const loadSavedCollectionTracks = async (collection: SavedCollection) => {
    const cacheKey = `collection:${collection.id}`
    const cachedTracks = collectionTracksCacheRef.current.get(cacheKey)

    if (cachedTracks) {
      return cachedTracks
    }

    if (collection.type === 'shelf-collection') {
      const parsedCollection = parseShelfCollectionSourceId(collection.sourceId)
      const shelfConfig = parsedCollection ? getShelfConfigById(parsedCollection.shelfId) : null

      if (!shelfConfig) {
        return []
      }

      try {
        const shelves = await loadTrackShelves([shelfConfig])
        const loadedTracks = shelves[0]?.tracks ?? []
        if (loadedTracks.length > 0) {
          collectionTracksCacheRef.current.set(cacheKey, loadedTracks)
        }
        return loadedTracks
      } catch {
        return []
      }
    }

    if (collection.type === 'collection' && collection.sourceId.startsWith('artist-tracks:')) {
      const artistSourceId = collection.sourceId.slice('artist-tracks:'.length)
      const routeUrl = collection.routePath
        ? new URL(collection.routePath, window.location.origin)
        : null
      const routeArtistId = routeUrl?.pathname.match(/^\/artist\/([^/]+)$/)?.[1]
      const artistId = routeArtistId ? decodeURIComponent(routeArtistId) : (/^\d+$/.test(artistSourceId) ? artistSourceId : undefined)
      const artistName = routeUrl?.searchParams.get('name')?.trim()
        || collection.title.replace(/\s+Artist tracks$/i, '')

      try {
        const loadedTracks = await getArtistTracks({ artistId, artistName })
        if (loadedTracks.length > 0) {
          collectionTracksCacheRef.current.set(cacheKey, loadedTracks)
        }
        return loadedTracks
      } catch {
        return []
      }
    }

    return []
  }

  const getArtistRoutePath = (artist: SavedArtistEntry) => {
    if (artist.routePath) {
      return artist.routePath
    }

    if (!artist.sampleTrack) {
      return null
    }

    const routeTarget = getArtistRouteTarget(artist.sampleTrack)
    return `${routeTarget.pathname}${routeTarget.search}`
  }

  const openSavedArtist = (artist: SavedArtistEntry) => {
    const routePath = getArtistRoutePath(artist)

    if (!routePath) {
      showToast({ title: 'Artist details are unavailable', variant: 'warning' })
      return
    }

    navigate(routePath)
  }

  const getArtistShareUrl = (artist: SavedArtistEntry) => {
    if (typeof window === 'undefined') {
      return artist.externalUrl
    }

    const routePath = getArtistRoutePath(artist)
    return routePath ? `${window.location.origin}${routePath}` : artist.externalUrl
  }

  const playArtistCollection = async (artist: SavedArtistEntry) => {
    const artistTracks = await loadArtistTracksForCollection(artist)

    if (artistTracks.length === 0) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    playCollection(artistTracks, createPlaylist(`${artist.name} playlist`, 'library', artistTracks))
  }

  const shuffleArtistCollection = async (artist: SavedArtistEntry) => {
    const artistTracks = await loadArtistTracksForCollection(artist)
    shuffleCollection(artist.name, artistTracks)
  }

  const addArtistToQueue = async (artist: SavedArtistEntry) => {
    addCollectionToQueue(await loadArtistTracksForCollection(artist))
  }

  const openArtistPlaylistDialog = async (artist: SavedArtistEntry) => {
    const artistTracks = await loadArtistTracksForCollection(artist)

    if (artistTracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    openCollectionPlaylistDialog(artistTracks, artist.name)
  }

  const handleShareArtistCollection = async (artist: SavedArtistEntry) => {
    const link = getArtistShareUrl(artist)

    if (!link) {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches

    if (isMobileViewport && canUseNativeShare()) {
      try {
        const didShare = await shareWithNativeSheet({
          title: `${artist.name} on Tonaliz Lite`,
          text: `Artist · ${artist.count} saved ${artist.count === 1 ? 'song' : 'songs'}`,
          url: link,
        })

        if (didShare) {
          return
        }
      } catch {
        // Fall back to the local share dialog.
      }
    }

    setShareArtistTarget(artist)
  }

  const openSavedCollection = (collection: SavedCollection) => {
    if (collection.routePath) {
      navigate(collection.routePath)
      return
    }

    if (collection.externalUrl && typeof window !== 'undefined') {
      window.open(collection.externalUrl, '_blank', 'noreferrer')
    }
  }

  const playSavedCollection = async (collection: SavedCollection) => {
    const tracks = await loadSavedCollectionTracks(collection)

    if (tracks.length === 0) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    playCollection(tracks, createPlaylist(collection.title, 'library', tracks))
  }

  const shuffleSavedCollection = async (collection: SavedCollection) => {
    const tracks = await loadSavedCollectionTracks(collection)
    shuffleCollection(collection.title, tracks)
  }

  const addSavedCollectionToQueue = async (collection: SavedCollection) => {
    addCollectionToQueue(await loadSavedCollectionTracks(collection))
  }

  const openSavedCollectionPlaylistDialog = async (collection: SavedCollection) => {
    const tracks = await loadSavedCollectionTracks(collection)

    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    openCollectionPlaylistDialog(tracks, collection.title)
  }

  const getSavedCollectionSubtitle = (collection: SavedCollection) => {
    const countLabel = collection.trackCount == null
      ? null
      : `${collection.trackCount} ${collection.trackCount === 1 ? 'track' : 'tracks'}`

    if (collection.type === 'artist') {
      return countLabel ? `Artist · ${countLabel}` : 'Saved artist'
    }

    if (collection.type === 'playlist') {
      return countLabel ? `Playlist · ${countLabel}` : 'Playlist'
    }

    if (collection.type === 'shelf-collection') {
      return countLabel ? `Shelf collection · ${countLabel}` : 'Shelf collection'
    }

    return countLabel ? `Saved collection · ${countLabel}` : (collection.subtitle ?? 'Saved collection')
  }

  const getSavedCollectionShareUrl = (collection: SavedCollection) => {
    if (typeof window === 'undefined') {
      return collection.externalUrl
    }

    return collection.routePath ? `${window.location.origin}${collection.routePath}` : collection.externalUrl
  }

  const handleShareSavedCollection = async (collection: SavedCollection) => {
    const link = getSavedCollectionShareUrl(collection)

    if (!link) {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches

    if (isMobileViewport && canUseNativeShare()) {
      try {
        const didShare = await shareWithNativeSheet({
          title: `${collection.title} on Tonaliz Lite`,
          text: getSavedCollectionSubtitle(collection),
          url: link,
        })

        if (didShare) {
          return
        }
      } catch {
        // Fall back to the reusable share dialog.
      }
    }

    setShareSavedCollectionTarget(collection)
  }

  const handleTogglePlaylistSavedCollection = async () => {
    if (!selectedPlaylist) {
      return
    }

    if (isSelectedPlaylistSaved) {
      setDetailMoreMenu(null)
      setConfirmDialogState({
        title: 'Remove from Library?',
        description: 'This saved item will be removed from your Library.',
        confirmLabel: 'Remove',
        action: async () => {
          await removeSavedCollection('playlist', selectedPlaylist.id)
          showToast({ title: 'Removed from Library', variant: 'success' })
        },
      })
      return
    }

    await saveSavedCollection({
      type: 'playlist',
      sourceId: selectedPlaylist.id,
      title: selectedPlaylist.title,
      subtitle: 'Local playlist',
      imageUrl: selectedPlaylistTracks[0]?.imageUrl ?? null,
      trackCount: selectedPlaylistTracks.length,
      routePath: `/library?view=playlist&id=${encodeURIComponent(selectedPlaylist.id)}`,
    })
    showToast({ title: 'Saved to Library', variant: 'success' })
  }

  const openCollectionPlaylistDialog = (tracks: Track[], title: string) => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    setCollectionTracksForDialog(tracks)
    setCollectionTitleForDialog(title)
    setDetailMoreMenu(null)
    setMobileItemMenuTarget(null)
    setIsAddCollectionToPlaylistOpen(true)
  }

  const relativeTime = (playedAt: string) => {
    const minutes = Math.max(0, Math.floor((relativeTimeBase - new Date(playedAt).getTime()) / 60_000))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
  }

  const organizeSortValue: OrganizeSort =
    sortOption === 'recently-played'
      ? 'recent'
      : sortOption === 'recently-added'
        ? 'added'
        : sortOption === 'title'
          ? 'alpha'
          : 'creator'

  const applyOrganizeSort = (value: OrganizeSort) => {
    setSortOption(
      value === 'recent'
        ? 'recently-played'
        : value === 'added'
          ? 'recently-added'
          : value === 'alpha'
            ? 'title'
            : 'artist',
    )
  }

  const filteredDesktopSavedTracks = useMemo(() => sortedSavedTracks.filter((track) => {
    if (!desktopCollectionQueryNormalized) {
      return true
    }

    return `${track.name} ${track.artistName} ${track.genre ?? ''}`
      .toLowerCase()
      .includes(desktopCollectionQueryNormalized)
  }), [desktopCollectionQueryNormalized, sortedSavedTracks])

  const filteredDesktopPlaylists = useMemo(() => userPlaylists.filter((playlist) => {
    if (!desktopCollectionQueryNormalized) {
      return true
    }

    const playlistTracks = playlistTracksById[playlist.id] ?? []
    return [
      playlist.title,
      playlist.description ?? '',
      ...playlistTracks.flatMap((playlistTrack) => [playlistTrack.track.name, playlistTrack.track.artistName]),
    ]
      .join(' ')
      .toLowerCase()
      .includes(desktopCollectionQueryNormalized)
  }), [desktopCollectionQueryNormalized, playlistTracksById, userPlaylists])

  const filteredDesktopSavedPlaylistCollections = useMemo(() => savedPlaylistCollections.filter((collection) => {
    if (!desktopCollectionQueryNormalized) {
      return true
    }

    return [collection.title, collection.subtitle]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(desktopCollectionQueryNormalized)
  }), [desktopCollectionQueryNormalized, savedPlaylistCollections])

  const filteredDesktopArtists = useMemo(() => savedArtists.filter((artist) => {
    if (!desktopCollectionQueryNormalized) {
      return true
    }

    return artist.name.toLowerCase().includes(desktopCollectionQueryNormalized)
  }), [desktopCollectionQueryNormalized, savedArtists])
  const desktopAllCollectionCount = 1
    + filteredDesktopPlaylists.length
    + filteredDesktopSavedPlaylistCollections.length
    + filteredDesktopArtists.length
  const mobileAllCollectionCount = 1
    + sortedMobilePlaylists.length
    + sortedMobileSavedPlaylistCollections.length
    + sortedMobileArtists.length
  const desktopGridClassName = desktopLayout === 'compact-grid'
    ? 'grid grid-cols-[repeat(auto-fill,minmax(7.5rem,8.5rem))] justify-start gap-2'
    : 'grid grid-cols-[repeat(auto-fill,minmax(8.75rem,10rem))] justify-start gap-3'
  const desktopListSpacingClassName = desktopLayout === 'compact-list' ? 'space-y-2' : 'space-y-3'

  const renderHistoryGroup = (title: string, tracks: typeof historyEntries, mode: 'mobile' | 'desktop' = 'desktop') => tracks.length > 0 ? (
    <section className="space-y-3">
      <h2 className={cn('font-heading text-text-primary', mode === 'mobile' ? 'text-[1.65rem]' : 'text-xl')}>{title}</h2>
      {tracks.map((track) => {
        const isCurrent = currentTrack?.id === track.id
        return (
          <TrackListRow
            key={track.id}
            track={track}
            isCurrent={isCurrent}
            isPlaying={isCurrent && isPlaying}
            isFavorite={favoriteTrackIds.has(track.id)}
            contextLabel={relativeTime(track.playedAt)}
            onPlay={() => playFromContext(track, historyPlaylist)}
            onToggleFavorite={() => void toggleFavorite(track)}
            onPlayNext={playNextInQueue}
            onAddToQueue={addToQueue}
            enableDesktopActionsMenu={mode === 'desktop'}
            onViewArtist={() => openArtistFromTrack(track)}
            onRemoveFromHistory={() => removeFromHistory(track.id)}
            showMobileMoreButton={mode === 'mobile'}
          />
        )
      })}
    </section>
  ) : null

  const renderFavoriteRow = (track: (typeof favorites)[number], cleanDetail = false, index?: number) => {
    const isCurrent = currentTrack?.id === track.id
    const desktopSourceText = resolveDesktopTrackSource(track)
    return (
      <TrackListRow
        key={track.id}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite
        onPlay={() => playFromContext(track, favoritesPlaylist)}
        onToggleFavorite={() => void removeFavoriteTrack(track.id)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
        enableDesktopActionsMenu
        onViewArtist={() => openArtistFromTrack(track)}
        showMobileMoreButton
        showMoodBadge={!cleanDetail}
        showTags={!cleanDetail}
        desktopDetailLayout={cleanDetail}
        desktopTrackNumber={cleanDetail ? index : undefined}
        desktopColumns={visibleLikedDesktopColumns}
        desktopSourceText={desktopSourceText}
        shareContext={typeof window !== 'undefined' ? { label: 'library link', title: 'Saved favorites on Tonaliz Lite', url: `${window.location.origin}/library` } : null}
      />
    )
  }

  const renderSavedTrackRow = (track: Track, index?: number) => {
    const isCurrent = currentTrack?.id === track.id
    const desktopSourceText = resolveDesktopTrackSource(track)

    return (
      <TrackListRow
        key={`saved-track-${track.id}`}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite={favoriteTrackIds.has(track.id)}
        onPlay={() => playFromContext(track, savedTracksPlaylist)}
        onToggleFavorite={() => void toggleFavorite(track)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
        enableDesktopActionsMenu
        onViewArtist={() => openArtistFromTrack(track)}
        showMobileMoreButton
        showMoodBadge={false}
        showTags={false}
        desktopDetailLayout
        desktopTrackNumber={index}
        desktopColumns={visibleSavedTracksDesktopColumns}
        desktopSourceText={desktopSourceText}
      />
    )
  }

  const renderDesktopSavedTrackCard = (track: Track) => {
    const isCurrent = currentTrack?.id === track.id

    return (
      <TrackCard
        key={`desktop-saved-track-card-${track.id}`}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite={favoriteTrackIds.has(track.id)}
        onPlay={() => playFromContext(track, savedTracksPlaylist)}
        onOpenArtist={() => openArtistFromTrack(track)}
        onToggleFavorite={() => void toggleFavorite(track)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
      />
    )
  }

  const renderMobileSavedTrackRow = (track: Track) => {
    const isCurrent = currentTrack?.id === track.id

    return (
      <TrackListRow
        key={`mobile-saved-track-${track.id}`}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite={favoriteTrackIds.has(track.id)}
        onPlay={() => playFromContext(track, savedTracksPlaylist)}
        onToggleFavorite={() => void toggleFavorite(track)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
        onViewArtist={() => openArtistFromTrack(track)}
        showMoodBadge={false}
        showTags={false}
      />
    )
  }

  const renderMobileSavedTrackCard = (track: Track) => {
    const isCurrent = currentTrack?.id === track.id

    return (
      <CompactTrackCard
        key={`mobile-saved-track-card-${track.id}`}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite={favoriteTrackIds.has(track.id)}
        onPlay={() => playFromContext(track, savedTracksPlaylist)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
        onToggleFavorite={() => void toggleFavorite(track)}
        onViewArtist={() => openArtistFromTrack(track)}
      />
    )
  }

  const renderMobileFavoriteRow = (track: (typeof favorites)[number], cleanDetail = false) => {
    const isCurrent = currentTrack?.id === track.id

    return (
      <TrackListRow
        key={`mobile-${track.id}`}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite
        onPlay={() => playFromContext(track, favoritesPlaylist)}
        onToggleFavorite={() => void removeFavoriteTrack(track.id)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
        onViewArtist={() => openArtistFromTrack(track)}
        showMoodBadge={!cleanDetail}
        showTags={!cleanDetail}
        shareContext={typeof window !== 'undefined' ? { label: 'library link', title: 'Saved favorites on Tonaliz Lite', url: `${window.location.origin}/library` } : null}
      />
    )
  }

  const renderMobileArtistRow = (artist: (typeof savedArtists)[number]) => (
    <MobileLongPressCard
      key={artist.name}
      onLongPress={() => setMobileItemMenuTarget({ type: 'artist', sourceId: artist.sourceId })}
      role="button"
      tabIndex={0}
      className="track-card-surface flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-3 text-left transition-colors active:bg-white/8"
      onClick={() => openSavedArtist(artist)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openSavedArtist(artist)
        }
      }}
    >
      <SavedArtistArtwork artist={artist} className="size-13 shrink-0 rounded-full object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-[1rem] text-text-primary">{artist.name}</span>
        <span className="mt-1 block text-[0.84rem] text-text-secondary">
          {artist.count > 0 ? `Artist · ${artist.count} saved ${artist.count === 1 ? 'song' : 'songs'}` : 'Saved artist'}
        </span>
      </span>
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-text-muted transition-colors active:bg-white/8 active:text-text-primary"
        onClick={(event) => {
          event.stopPropagation()
          setMobileItemMenuTarget({ type: 'artist', sourceId: artist.sourceId })
        }}
        aria-label="More artist options"
      >
        <MoreVertical className="size-4" />
      </button>
    </MobileLongPressCard>
  )

  const renderMobileArtistCard = (artist: (typeof savedArtists)[number]) => (
    <MobileLongPressCard
      key={`artist-grid-${artist.name}`}
      onLongPress={() => setMobileItemMenuTarget({ type: 'artist', sourceId: artist.sourceId })}
      role="button"
      tabIndex={0}
      className="track-card-surface min-w-0 h-full rounded-[1.35rem] p-2.5 text-left transition-colors active:bg-white/8"
      onClick={() => openSavedArtist(artist)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openSavedArtist(artist)
        }
      }}
    >
      <SavedArtistArtwork artist={artist} className="aspect-square w-full rounded-full object-cover p-1" />
      <span className="mt-2.5 block truncate font-heading text-[0.95rem] leading-tight text-text-primary">
        {artist.name}
      </span>
      <span className="mt-1 block truncate text-[0.78rem] text-text-secondary">
        {artist.count > 0 ? `Artist · ${artist.count} saved ${artist.count === 1 ? 'song' : 'songs'}` : 'Saved artist'}
      </span>
    </MobileLongPressCard>
  )

  const renderDesktopArtistItem = (artist: (typeof savedArtists)[number]) => (
    <article
      key={`desktop-artist-${artist.name}`}
      role="button"
      tabIndex={0}
      className={cn(
        'group/library-card track-card-surface relative w-full text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-white/12 hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
        desktopViewMode === 'grid'
          ? 'h-full rounded-lg p-2.5 hover:scale-[1.02]'
          : 'flex min-h-20 items-center gap-3 rounded-lg px-3 py-2.5',
      )}
      onClick={() => openSavedArtist(artist)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openSavedArtist(artist)
        }
      }}
    >
      {renderDesktopCardMenu(
        <>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/30 text-text-muted transition-colors hover:text-text-primary"
              onClick={(event) => openDesktopCardMenu(event, { type: 'artist', sourceId: artist.sourceId })}
              aria-label="More artist options"
              title="More artist options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          {renderDesktopItemPopover(
            { type: 'artist', sourceId: artist.sourceId },
            <>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  void playArtistCollection(artist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Play className="size-4" />
                Play
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  void shuffleArtistCollection(artist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Shuffle className="size-4" />
                Shuffle
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  void addArtistToQueue(artist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ListPlus className="size-4" />
                Add top tracks to queue
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  void openArtistPlaylistDialog(artist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ListPlus className="size-4" />
                Add top tracks to playlist
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  openSavedArtist(artist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ChevronDown className="-rotate-90 size-4" />
                Open artist
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleShareArtistCollection(artist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Share2 className="size-4" />
                Share
              </button>
              {artist.externalUrl ? (
                <a
                  href={artist.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={() => setDesktopItemMenuTarget(null)}
                >
                  <ExternalLink className="size-4" />
                  Open on Jamendo
                </a>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  requestRemoveArtistFromLibrary(artist.sourceId)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <BookmarkCheck className="size-4" />
                Remove artist
              </button>
            </>,
          )}
        </>,
      )}
      <span
        className={cn(
          'block shrink-0 overflow-hidden bg-white/5 ring-1 ring-white/10',
          desktopViewMode === 'grid' ? 'mx-auto mb-2.5 aspect-square w-full rounded-full p-1' : 'size-12 rounded-full',
        )}
      >
      <SavedArtistArtwork artist={artist} className="size-full object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 font-heading text-[0.92rem] leading-snug text-text-primary">{artist.name}</span>
        <span className="mt-1 block truncate text-[0.76rem] text-text-secondary">
          {artist.count > 0 ? `Artist · ${artist.count} saved ${artist.count === 1 ? 'song' : 'songs'}` : 'Saved artist'}
        </span>
      </span>
    </article>
  )

  const openPlaylistDetail = (playlistId: string) => {
    setSelectedPlaylistId(playlistId)
    setLibraryView('playlist')
  }

  const openLikedSongs = () => {
    setLibraryView('liked')
  }

  const renderLikedSongsCollection = (mode: 'list' | 'grid' = 'list') => (
    <MobileLongPressCard
      onLongPress={() => setDetailMoreMenu('liked')}
      role="button"
      tabIndex={0}
      className={cn(
        'group/library-card track-card-surface relative w-full text-left transition-colors active:bg-white/8',
        mode === 'grid' ? 'rounded-[1.35rem] p-2.5' : 'flex items-center gap-3 rounded-[1.25rem] px-3 py-3',
      )}
      onClick={openLikedSongs}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openLikedSongs()
        }
      }}
    >
      <span
        className={cn(
          'mood-glow inline-flex shrink-0 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(56,189,248,0.72))] text-white',
          mode === 'grid' ? 'mb-2.5 aspect-square w-full rounded-[1.05rem]' : 'size-13 rounded-[0.95rem]',
        )}
      >
        <Heart className={cn(mode === 'grid' ? 'size-9' : 'size-5', 'fill-current')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-heading text-text-primary', mode === 'grid' ? 'text-[0.95rem]' : 'text-[1rem]')}>
          Music I Like
        </span>
        <span className="mt-1 block text-[0.84rem] text-text-secondary">
          {`${favorites.length} ${favorites.length === 1 ? 'track' : 'tracks'}`}
        </span>
      </span>
      {mode === 'list' ? (
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-text-muted transition-colors active:bg-white/8 active:text-text-primary lg:hidden"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDetailMoreMenu('liked')
          }}
          aria-label="More options"
        >
          <MoreVertical className="size-4" />
        </button>
      ) : null}
      {renderDesktopCardMenu(
        <>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/30 text-text-muted transition-colors hover:text-text-primary"
            onClick={(event) => openDesktopCardMenu(event, { type: 'liked' })}
            aria-label="More options"
            title="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {renderDesktopItemPopover(
            { type: 'liked' },
            <>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  openLikedSongs()
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ChevronDown className="-rotate-90 size-4" />
                Open
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  playCollection(favorites, favoritesPlaylist)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Play className="size-4" />
                Play
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  shuffleCollection('Music I Like', favorites)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Shuffle className="size-4" />
                Shuffle
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  addCollectionToQueue(favorites)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ListPlus className="size-4" />
                Add to queue
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  playCollectionNext('Music I Like', favorites)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Play className="size-4" />
                Play next
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  openCollectionPlaylistDialog(favorites, 'Music I Like')
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ListPlus className="size-4" />
                Add to playlist
              </button>
            </>,
          )}
        </>,
      )}
    </MobileLongPressCard>
  )

  const renderSavedCollectionCard = (
    collection: SavedCollection,
    mode: 'mobile-list' | 'mobile-grid' | 'desktop' = 'desktop',
  ) => (
    <MobileLongPressCard
      key={collection.id}
      onLongPress={() => setMobileItemMenuTarget({ type: 'saved-collection', id: collection.id })}
      role="button"
      tabIndex={0}
      className={cn(
        'group/library-card track-card-surface relative w-full text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-white/12 hover:bg-card-hover',
        mode === 'mobile-list'
          ? 'flex min-h-20 items-center gap-3 rounded-[1.25rem] px-3 py-3'
          : mode === 'mobile-grid'
            ? 'h-full rounded-[1.35rem] p-2.5'
            : desktopViewMode === 'grid'
              ? 'h-full rounded-lg p-3 hover:scale-[1.02]'
              : 'flex min-h-20 items-center gap-3 rounded-lg px-3 py-2.5',
      )}
      onClick={() => openSavedCollection(collection)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openSavedCollection(collection)
        }
      }}
    >
      {mode === 'desktop' ? renderDesktopCardMenu(
        <>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/30 text-text-muted transition-colors hover:text-text-primary"
            onClick={(event) => openDesktopCardMenu(event, { type: 'saved-collection', id: collection.id })}
            aria-label="More options"
            title="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {renderDesktopItemPopover(
            { type: 'saved-collection', id: collection.id },
            <>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  setDesktopItemMenuTarget(null)
                  void playSavedCollection(collection)
                }}
              >
                <Play className="size-4" />
                Play
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  setDesktopItemMenuTarget(null)
                  void shuffleSavedCollection(collection)
                }}
              >
                <Shuffle className="size-4" />
                Shuffle
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  setDesktopItemMenuTarget(null)
                  void addSavedCollectionToQueue(collection)
                }}
              >
                <ListPlus className="size-4" />
                Add to queue
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  setDesktopItemMenuTarget(null)
                  void openSavedCollectionPlaylistDialog(collection)
                }}
              >
                <ListPlus className="size-4" />
                Add to playlist
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  openSavedCollection(collection)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <ChevronDown className="-rotate-90 size-4" />
                Open
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleShareSavedCollection(collection)
                  setDesktopItemMenuTarget(null)
                }}
              >
                <Share2 className="size-4" />
                Share
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                onClick={(event) => {
                  event.stopPropagation()
                  requestRemoveSavedCollection(collection)
                }}
              >
                <BookmarkCheck className="size-4" />
                Remove from Library
              </button>
            </>,
          )}
        </>,
      ) : null}
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-primary/12 text-primary-soft',
          mode === 'mobile-list'
            ? 'size-13 rounded-[0.95rem]'
            : mode === 'mobile-grid' || desktopViewMode === 'grid'
              ? 'mb-2.5 aspect-square w-full'
              : 'size-12 rounded-lg',
        )}
      >
        {collection.imageUrl ? (
          <img src={collection.imageUrl} alt={`${collection.title} cover`} className="size-full object-cover" />
        ) : (
          <Bookmark className={mode === 'mobile-grid' || desktopViewMode === 'grid' ? 'size-8' : 'size-5'} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-heading leading-snug text-text-primary', mode === 'mobile-grid' || desktopViewMode === 'grid' ? 'line-clamp-2 text-[0.9rem]' : 'line-clamp-2 text-[0.95rem]')}>
          {collection.title}
        </span>
        <span className="mt-1 block truncate text-[0.8rem] text-text-secondary">
          {getSavedCollectionSubtitle(collection)}
        </span>
      </span>
      {mode === 'mobile-list' ? (
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-text-muted transition-colors active:bg-white/8 active:text-text-primary"
          onClick={(event) => {
            event.stopPropagation()
            setMobileItemMenuTarget({ type: 'saved-collection', id: collection.id })
          }}
          aria-label="More options"
        >
          <MoreVertical className="size-4" />
        </button>
      ) : null}
    </MobileLongPressCard>
  )

  const playSelectedPlaylist = () => {
    if (!selectedRuntimePlaylist || selectedPlaylistTracks.length === 0) {
      showToast({ title: 'No tracks to play', variant: 'warning' })
      return
    }

    playTrackFromContext(selectedPlaylistTracks[0], selectedRuntimePlaylist)
  }

  const renderPlaylistItem = (playlist: (typeof userPlaylists)[number], mode: 'mobile' | 'mobile-grid' | 'desktop' = 'desktop') => {
    const playlistTracks = playlistTracksById[playlist.id] ?? []
    const coverTrack = playlistTracks[0]?.track
    const isMobileGrid = mode === 'mobile-grid'
    const isDesktopCompactGrid = mode === 'desktop' && desktopLayout === 'compact-grid'
    const isDesktopList = mode === 'desktop' && (desktopLayout === 'compact-list' || desktopLayout === 'default-list')

    return (
      <MobileLongPressCard
        key={playlist.id}
        onLongPress={() => setMobileItemMenuTarget({ type: 'local-playlist', id: playlist.id })}
        role="button"
        tabIndex={0}
        className={cn(
          'group/library-card track-card-surface relative w-full text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-white/12 hover:bg-card-hover',
          mode === 'mobile'
            ? 'flex items-center gap-3 rounded-[1.25rem] px-3 py-3'
            : isMobileGrid
              ? 'rounded-[1.35rem] p-2.5'
              : isDesktopList
                ? desktopLayout === 'compact-list'
                  ? 'flex min-h-20 items-center gap-3 rounded-lg px-3 py-2.5'
                  : 'flex min-h-20 items-center gap-3 rounded-lg px-3.5 py-3'
                : isDesktopCompactGrid
                  ? 'rounded-lg p-2.5 hover:scale-[1.02]'
                  : 'rounded-lg p-3 hover:scale-[1.02]',
        )}
        onClick={() => openPlaylistDetail(playlist.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPlaylistDetail(playlist.id)
          }
        }}
      >
        {mode === 'desktop' ? renderDesktopCardMenu(
          <>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/30 text-text-muted transition-colors hover:text-text-primary"
              onClick={(event) => openDesktopCardMenu(event, { type: 'local-playlist', id: playlist.id })}
              aria-label="More options"
              title="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {renderDesktopItemPopover(
              { type: 'local-playlist', id: playlist.id },
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    const playlistTrackList = playlistTracks.map((item) => item.track)
                    if (playlistTrackList[0]) {
                      playTrackFromContext(playlistTrackList[0], createPlaylist(playlist.title, 'library', playlistTrackList))
                    }
                    setDesktopItemMenuTarget(null)
                  }}
                >
                  <Play className="size-4" />
                  Play
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    shuffleCollection(playlist.title, playlistTracks.map((item) => item.track))
                    setDesktopItemMenuTarget(null)
                  }}
                >
                  <Shuffle className="size-4" />
                  Shuffle
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    addCollectionToQueue(playlistTracks.map((item) => item.track))
                    setDesktopItemMenuTarget(null)
                  }}
                >
                  <ListPlus className="size-4" />
                  Add to queue
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    openCollectionPlaylistDialog(playlistTracks.map((item) => item.track), playlist.title)
                    setDesktopItemMenuTarget(null)
                  }}
                >
                  <ListPlus className="size-4" />
                  Add to playlist
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleShareLocalPlaylist(playlist)
                    setDesktopItemMenuTarget(null)
                  }}
                >
                  <Share2 className="size-4" />
                  Share
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    requestDeletePlaylist(playlist)
                  }}
                >
                  <X className="size-4" />
                  Delete playlist
                </button>
              </>,
            )}
          </>,
        ) : null}
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center overflow-hidden bg-primary/12 text-primary-soft',
            mode === 'mobile'
              ? 'size-13 rounded-[0.95rem]'
              : isMobileGrid
                ? 'mb-2.5 aspect-square w-full rounded-[1.05rem]'
                : isDesktopList
                  ? desktopLayout === 'compact-list'
                    ? 'size-12 rounded-lg'
                    : 'size-14 rounded-lg'
                  : isDesktopCompactGrid
                    ? 'mb-2 aspect-square w-full rounded-lg'
                    : 'mb-3 aspect-square w-full rounded-lg',
          )}
        >
          {coverTrack ? (
            <img src={coverTrack.imageUrl} alt={`${playlist.title} cover`} className="size-full object-cover" />
          ) : (
            <ListMusic className={mode === 'mobile' ? 'size-5' : 'size-8'} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block font-heading leading-snug text-text-primary', isMobileGrid || isDesktopCompactGrid ? 'line-clamp-2 text-[0.88rem]' : 'line-clamp-2 text-[0.95rem]')}>
            {playlist.title}
          </span>
          <span className={cn('mt-1 block truncate text-text-secondary', isDesktopCompactGrid ? 'text-[0.74rem]' : 'text-[0.8rem]')}>
            Playlist · {playlistTracks.length} {playlistTracks.length === 1 ? 'track' : 'tracks'}
          </span>
          {playlist.description ? (
            <span className={cn('mt-1 hidden line-clamp-2 text-text-muted lg:block', isDesktopCompactGrid ? 'text-[0.68rem]' : 'text-xs')}>{playlist.description}</span>
          ) : null}
        </span>
        {mode === 'mobile' ? (
          <button
            type="button"
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-text-muted transition-colors active:bg-white/8 active:text-text-primary',
              isMobileGrid && 'mt-2',
            )}
            onClick={(event) => {
              event.stopPropagation()
              setMobileItemMenuTarget({ type: 'local-playlist', id: playlist.id })
            }}
            aria-label="More options"
          >
            <MoreVertical className="size-4" />
          </button>
        ) : null}
      </MobileLongPressCard>
    )
  }

  const desktopMenuTargetMatches = (target: DesktopLibraryItemMenuTarget) => {
    if (!desktopItemMenuTarget || desktopItemMenuTarget.type !== target.type) {
      return false
    }

    if (target.type === 'liked') {
      return true
    }

    if (target.type === 'artist') {
      return desktopItemMenuTarget.type === 'artist' && desktopItemMenuTarget.sourceId === target.sourceId
    }

    return desktopItemMenuTarget.type === target.type && desktopItemMenuTarget.id === target.id
  }

  const openDesktopCardMenu = (event: ReactMouseEvent<HTMLButtonElement>, target: DesktopLibraryItemMenuTarget) => {
    event.stopPropagation()

    if (desktopMenuTargetMatches(target)) {
      setDesktopItemMenuTarget(null)
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const width = 224
    const estimatedHeight = 360
    const viewportPadding = 12
    const left = Math.max(viewportPadding, Math.min(rect.right - width, window.innerWidth - width - viewportPadding))
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const opensAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight + viewportPadding
    const top = opensAbove
      ? Math.max(viewportPadding, rect.top - estimatedHeight - 8)
      : Math.min(rect.bottom + 8, window.innerHeight - estimatedHeight - viewportPadding)

    setDesktopItemMenuStyle({
      position: 'fixed',
      left,
      top,
      width,
    })
    setDesktopItemMenuTarget(target)
  }

  const renderDesktopCardMenu = (content: ReactNode) => (
    <div className="absolute right-3 top-3 z-20 hidden group-hover/library-card:flex group-focus-within/library-card:flex">
      <div className="relative" data-library-card-menu-root>
        {content}
      </div>
    </div>
  )

  const renderDesktopItemPopover = (target: DesktopLibraryItemMenuTarget, content: ReactNode) => {
    if (!desktopMenuTargetMatches(target) || typeof document === 'undefined') {
      return null
    }

    return createPortal(
      <div
        data-library-card-menu-root
        style={desktopItemMenuStyle}
        className="editorial-panel z-[120] max-h-[min(28rem,calc(100vh-1.5rem))] overflow-y-auto rounded-[1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.38)]"
        onClick={(event) => event.stopPropagation()}
        role="menu"
      >
        {content}
      </div>,
      document.body,
    )
  }

  const renderPlaylistTrackRow = (track: Track, index: number) => {
    if (!selectedRuntimePlaylist || !selectedPlaylist) {
      return null
    }

    const isCurrent = currentTrack?.id === track.id
    const desktopSourceText = resolveDesktopTrackSource(track)

    return (
      <TrackListRow
        key={`${selectedPlaylist.id}-${track.id}`}
        track={track}
        isCurrent={isCurrent}
        isPlaying={isCurrent && isPlaying}
        isFavorite={favoriteTrackIds.has(track.id)}
        onPlay={() => playFromContext(track, selectedRuntimePlaylist)}
        onToggleFavorite={() => void toggleFavorite(track)}
        onPlayNext={playNextInQueue}
        onAddToQueue={addToQueue}
        enableDesktopActionsMenu
        onViewArtist={() => openArtistFromTrack(track)}
        onRemoveFromPlaylist={() => void removeTrackFromPlaylist(selectedPlaylist.id, track.id)}
        showMobileMoreButton
        showMoodBadge={false}
        showTags={false}
        desktopDetailLayout
        desktopTrackNumber={index + 1}
        desktopColumns={visiblePlaylistDesktopColumns}
        desktopSourceText={desktopSourceText}
      />
    )
  }

  const mobileMenuLocalPlaylist = mobileItemMenuTarget?.type === 'local-playlist'
    ? userPlaylists.find((playlist) => playlist.id === mobileItemMenuTarget.id) ?? null
    : null
  const mobileMenuLocalPlaylistTracks = mobileMenuLocalPlaylist ? (playlistTracksById[mobileMenuLocalPlaylist.id] ?? []).map((playlistTrack) => playlistTrack.track) : []
  const mobileMenuLocalRuntimePlaylist = mobileMenuLocalPlaylist ? createPlaylist(mobileMenuLocalPlaylist.title, 'library', mobileMenuLocalPlaylistTracks) : null
  const mobileMenuSavedCollection = mobileItemMenuTarget?.type === 'saved-collection'
    ? savedCollections.find((collection) => collection.id === mobileItemMenuTarget.id) ?? null
    : null
  const mobileMenuArtist = mobileItemMenuTarget?.type === 'artist'
    ? savedArtists.find((artist) => artist.sourceId === mobileItemMenuTarget.sourceId) ?? null
    : null

  return (
    <>
    <div className={cn('space-y-5 lg:flex lg:min-h-full lg:flex-col lg:space-y-5', libraryView !== 'library' && 'hidden lg:hidden')}>
      <section className="space-y-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-[2rem] leading-none text-text-primary">Library</h1>
          </div>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary transition-colors active:bg-white/10"
            onClick={() => setLibraryView('history')}
            aria-label="Open History"
          >
            <Clock3 className="size-5" />
          </button>
        </div>

        {mobileCategories.length > 0 ? (
          <div className="scrollbar-none -mx-3.5 flex gap-2 overflow-x-auto px-3.5 sm:-mx-5 sm:px-5">
            {mobileCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2.5 text-[0.82rem] font-semibold transition-colors',
                  resolvedMobileCategory === category.id
                    ? 'border-primary/35 bg-primary/14 text-text-primary shadow-[0_0_18px_rgba(168,85,247,0.12)]'
                    : 'border-white/8 bg-black/18 text-text-secondary',
                )}
                onClick={() => setActiveMobileCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="hidden space-y-4 lg:block">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-[2rem] leading-tight text-text-primary">Library</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="gap-2 border border-white/12 bg-white/5" onClick={() => setLibraryView('history')}>
              <Clock3 className="size-4" />
              History
            </Button>
            <OrganizeMenu
              sortMode={organizeSortValue}
              viewMode={desktopLayout}
              onSortChange={applyOrganizeSort}
              onViewChange={setDesktopLayout}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[18rem] flex-1 items-center rounded-full border border-white/10 bg-black/18 px-3">
            <Search className="size-4 shrink-0 text-text-muted" />
            <input
              value={desktopCollectionQuery}
              onChange={(event) => setDesktopCollectionQuery(event.target.value)}
              placeholder="Search in Library"
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            {desktopCollectionQuery ? (
              <button
                type="button"
                aria-label="Clear Library search"
                className="inline-flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary"
                onClick={() => setDesktopCollectionQuery('')}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {desktopCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={cn(
                'rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold transition-colors',
                resolvedDesktopCategory === category.id
                  ? 'border-primary/28 bg-primary/14 text-text-primary'
                  : 'border-white/8 bg-black/18 text-text-secondary hover:bg-white/6 hover:text-text-primary',
              )}
              onClick={() => setDesktopCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {favorites.length > 0 || savedTracks.length > 0 || savedArtists.length > 0 || userPlaylists.length > 0 || savedPlaylistCollections.length > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/8 bg-black/16 p-2 lg:hidden">
            <button
              type="button"
              className="inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-sm text-text-primary transition-colors active:bg-white/8"
              onClick={() => setIsMobileSortSheetOpen(true)}
              aria-label="Open sort options"
            >
              <span className="text-text-muted">Sort</span>
              <span className="truncate">{sortLabels[sortOption]}</span>
              <ChevronDown className="size-4 shrink-0 text-text-muted" />
            </button>

            {canToggleMobileView ? (
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-primary transition-colors active:bg-white/10"
                onClick={() => setMobileViewMode((viewMode) => (viewMode === 'list' ? 'grid' : 'list'))}
                aria-label={mobileViewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
              >
                {mobileViewMode === 'list' ? <Grid2X2 className="size-4.5" /> : <List className="size-4.5" />}
              </button>
            ) : null}
          </div>
        ) : null}

        {!isOnline ? (
          <StatusPanel
            title="Offline library ready"
            message="Your saved track metadata is still available locally. Playback depends on the remote audio remaining reachable."
          />
        ) : null}

        {error ? <StatusPanel title="Library sync issue" message={error} /> : null}

        {isHydrating ? <TrackGridSkeleton /> : null}

        {!isHydrating ? (
          <>
            <div className="space-y-3 lg:hidden">
              {resolvedMobileCategory === 'all' ? (
                mobileAllCollectionCount > 0 ? (
                  mobileViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {renderLikedSongsCollection('grid')}
                      {sortedMobilePlaylists.map((playlist) => renderPlaylistItem(playlist, 'mobile-grid'))}
                      {sortedMobileSavedPlaylistCollections.map((collection) => renderSavedCollectionCard(collection, 'mobile-grid'))}
                      {sortedMobileArtists.map(renderMobileArtistCard)}
                    </div>
                  ) : (
                    <>
                      {renderLikedSongsCollection('list')}
                      {sortedMobilePlaylists.map((playlist) => renderPlaylistItem(playlist, 'mobile'))}
                      {sortedMobileSavedPlaylistCollections.map((collection) => renderSavedCollectionCard(collection, 'mobile-list'))}
                      {sortedMobileArtists.map(renderMobileArtistRow)}
                    </>
                  )
                ) : (
                  <EmptyState
                    title="No collections yet"
                    description="Create a playlist or save a collection to build your Library."
                    className="min-h-44"
                  />
                )
              ) : resolvedMobileCategory === 'artists' ? (
                savedArtists.length > 0 ? (
                  mobileViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-3">{sortedMobileArtists.map(renderMobileArtistCard)}</div>
                  ) : (
                    sortedMobileArtists.map(renderMobileArtistRow)
                  )
                ) : (
                  <EmptyState
                    title="No saved artists yet"
                    description="Save artists you want to follow and they will appear here."
                    className="min-h-44"
                  />
                )
              ) : resolvedMobileCategory === 'playlists' ? (
                sortedMobilePlaylists.length > 0 || sortedMobileSavedPlaylistCollections.length > 0 ? (
                  mobileViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {sortedMobilePlaylists.map((playlist) => renderPlaylistItem(playlist, 'mobile-grid'))}
                      {sortedMobileSavedPlaylistCollections.map((collection) => renderSavedCollectionCard(collection, 'mobile-grid'))}
                    </div>
                  ) : (
                    <>
                      {sortedMobilePlaylists.map((playlist) => renderPlaylistItem(playlist, 'mobile'))}
                      {sortedMobileSavedPlaylistCollections.map((collection) => renderSavedCollectionCard(collection, 'mobile-list'))}
                    </>
                  )
                ) : (
                  <EmptyState
                    title="No playlists yet"
                    description="Create a playlist and it will appear here."
                    className="min-h-44"
                  />
                )
              ) : resolvedMobileCategory === 'songs' ? (
                sortedSavedTracks.length > 0 ? (
                  mobileViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {sortedSavedTracks.map((track) => renderMobileSavedTrackCard(track))}
                    </div>
                  ) : (
                    sortedSavedTracks.map((track) => renderMobileSavedTrackRow(track))
                  )
                ) : (
                  <EmptyState
                    title="No songs yet"
                    description="Save or like tracks and they will appear here."
                    className="min-h-44"
                  />
                )
              ) : null}
            </div>
            <div className="hidden lg:block">
              {resolvedDesktopCategory === 'all' && desktopAllCollectionCount > 0 ? (
                <section className="mb-8 space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-2xl text-text-primary">Collections</h2>
                      <p className="mt-1 text-sm text-text-secondary">Saved collections, playlists, artists, and Music I Like.</p>
                    </div>
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">
                      {desktopAllCollectionCount} items
                    </span>
                  </div>
                  <div className={cn(desktopViewMode === 'grid' ? desktopGridClassName : desktopListSpacingClassName)}>
                    {renderLikedSongsCollection(desktopViewMode === 'grid' ? 'grid' : 'list')}
                    {filteredDesktopPlaylists.map((playlist) => renderPlaylistItem(playlist))}
                    {filteredDesktopSavedPlaylistCollections.map((collection) => renderSavedCollectionCard(collection))}
                    {filteredDesktopArtists.map(renderDesktopArtistItem)}
                  </div>
                </section>
              ) : null}

              {resolvedDesktopCategory === 'songs' ? (
                <section className="mb-8 space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-2xl text-text-primary">Songs</h2>
                      <p className="mt-1 text-sm text-text-secondary">Tracks saved or liked in your Library.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">
                        {filteredDesktopSavedTracks.length} {filteredDesktopSavedTracks.length === 1 ? 'song' : 'songs'}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => shuffleCollection('Songs', filteredDesktopSavedTracks)}
                        aria-label="Play everything randomly"
                      >
                        <Shuffle className="size-4" />
                        Play everything randomly
                      </Button>
                    </div>
                  </div>
                  {filteredDesktopSavedTracks.length > 0 ? (
                    <div className={desktopViewMode === 'grid' ? desktopGridClassName : desktopListSpacingClassName}>
                      {desktopViewMode === 'grid'
                        ? filteredDesktopSavedTracks.map(renderDesktopSavedTrackCard)
                        : filteredDesktopSavedTracks.map((track, index) => renderSavedTrackRow(track, index + 1))}
                    </div>
                  ) : (
                    <EmptyState title="No songs yet" description="Save or like tracks and they will appear here." className="min-h-44" />
                  )}
                </section>
              ) : null}

              {resolvedDesktopCategory === 'artists' && filteredDesktopArtists.length > 0 ? (
                <section className="mb-8 space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-2xl text-text-primary">Artists</h2>
                      <p className="mt-1 text-sm text-text-secondary">Artists you saved to follow in your Library.</p>
                    </div>
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">
                      {filteredDesktopArtists.length} {filteredDesktopArtists.length === 1 ? 'artist' : 'artists'}
                    </span>
                  </div>
                  <div className={cn(desktopViewMode === 'grid' ? desktopGridClassName : desktopListSpacingClassName)}>
                    {filteredDesktopArtists.map(renderDesktopArtistItem)}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        ) : null}

        {!isHydrating && resolvedDesktopCategory === 'playlists' && (filteredDesktopPlaylists.length > 0 || filteredDesktopSavedPlaylistCollections.length > 0) ? (
          <section className="mb-8 hidden space-y-3 lg:block">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl text-text-primary">Playlists</h2>
                <p className="mt-1 text-sm text-text-secondary">Local playlists and saved playlist-style collections.</p>
              </div>
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">
                {filteredDesktopPlaylists.length + filteredDesktopSavedPlaylistCollections.length} items
              </span>
            </div>
            <div className={desktopGridClassName}>
              {filteredDesktopPlaylists.map((playlist) => renderPlaylistItem(playlist))}
              {filteredDesktopSavedPlaylistCollections.map((collection) => renderSavedCollectionCard(collection))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
    {libraryView === 'library' && (resolvedMobileCategory === 'all' || resolvedMobileCategory === 'playlists') ? (
      <button
        type="button"
        className={cn(
          'fixed bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-4 z-[80] inline-flex h-12 items-center overflow-hidden rounded-full border border-primary/35 bg-primary font-heading text-sm text-white shadow-[0_16px_36px_rgba(0,0,0,0.38)] transition-[gap,padding] duration-150 ease-out active:scale-[0.98] lg:hidden',
          isMobileLibraryFabCompact ? 'gap-0 px-3.5' : 'gap-2 px-4',
        )}
        onClick={() => setIsNewPlaylistDialogOpen(true)}
        aria-label="Create new playlist"
      >
        <Plus className="size-4 shrink-0" />
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out',
            isMobileLibraryFabCompact ? 'max-w-0 opacity-0' : 'max-w-16 opacity-100',
          )}
        >
          New
        </span>
      </button>
    ) : null}
    {libraryView === 'library' && resolvedMobileCategory === 'songs' ? (
      <button
        type="button"
        className={cn(
          'fixed bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-4 z-[80] inline-flex h-12 items-center overflow-hidden rounded-full border border-primary/35 bg-primary font-heading text-sm text-white shadow-[0_16px_36px_rgba(0,0,0,0.38)] transition-[gap,padding] duration-150 ease-out active:scale-[0.98] lg:hidden',
          isMobileLibraryFabCompact ? 'gap-0 px-3.5' : 'gap-2 px-4',
        )}
        onClick={() => shuffleCollection('Songs', sortedSavedTracks)}
        aria-label="Play everything randomly"
      >
        <Shuffle className="size-4 shrink-0" />
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out',
            isMobileLibraryFabCompact ? 'max-w-0 opacity-0' : 'max-w-[13rem] opacity-100',
          )}
        >
          Play everything randomly
        </span>
      </button>
    ) : null}
    {libraryView === 'liked' ? (
      <div className="space-y-5 lg:space-y-6">
        <section className="editorial-panel overflow-visible rounded-[1.75rem] px-4 py-5 sm:rounded-[2rem] sm:px-8 sm:py-7">
          <Button
            type="button"
            variant="ghost"
            className="mb-5 gap-2 border border-white/10 bg-white/5"
            onClick={() => setLibraryView('library')}
            aria-label="Back to Library"
          >
            <ArrowLeft className="size-4" />
            Back to Library
          </Button>

          <div className="flex flex-col gap-5 text-center lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-6 lg:text-left">
            <div className="mx-auto flex size-36 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(56,189,248,0.72))] text-white shadow-[0_22px_60px_rgba(0,0,0,0.36)] sm:size-44 lg:mx-0 lg:size-52">
              <Heart className="size-14 fill-current sm:size-16" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-muted">Auto collection</p>
              <h1 className="mt-2 font-heading text-[2.2rem] leading-[0.98] text-text-primary sm:text-[3rem] lg:text-[4.6rem]">
                Music I Like
              </h1>
              <p className="mt-3 text-sm text-text-secondary">
                {favorites.length} {favorites.length === 1 ? 'track' : 'tracks'} • Auto collection
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                <Button type="button" className="gap-2" onClick={() => playCollection(favorites, favoritesPlaylist)} aria-label="Play">
                  <Play className="size-4" />
                  Play
                </Button>
                <Button type="button" variant="secondary" className="gap-2" onClick={() => shuffleCollection('Music I Like', favorites)} aria-label="Shuffle">
                  <Shuffle className="size-4" />
                  Shuffle
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 border border-white/10 bg-white/5"
                  onClick={() => void handleShareCollection('liked')}
                  aria-label="Share"
                  title="Share"
                >
                  <Share2 className="size-4" />
                  Share
                </Button>
                <div ref={detailMoreMenu === 'liked' ? detailMoreMenuRef : undefined} className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="border border-white/10 bg-white/5"
                    onClick={() => setDetailMoreMenu((menu) => (menu === 'liked' ? null : 'liked'))}
                    aria-label="More options"
                    aria-expanded={detailMoreMenu === 'liked'}
                    title="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                  {detailMoreMenu === 'liked' ? (
                    <div className="editorial-panel absolute right-0 top-12 z-30 hidden w-60 rounded-[1.1rem] p-2 text-left shadow-[0_18px_46px_rgba(0,0,0,0.34)] lg:block">
                      <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary" onClick={() => addCollectionToQueue(favorites)}>
                        <ListPlus className="size-4" />
                        Add to queue
                      </button>
                      <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary" onClick={() => openCollectionPlaylistDialog(favorites, 'Music I Like')}>
                        <ListPlus className="size-4" />
                        Add to playlist
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {favorites.length === 0 ? (
          <EmptyState
            title="No liked music yet"
            description="Tap the heart on tracks you love and they will appear here."
          />
        ) : (
          <>
            <section className="space-y-3 lg:hidden">
              <h2 className="font-heading text-[1.2rem] text-text-primary">Favorite tracks</h2>
              <div className="space-y-3">{sortedFavorites.map((track) => renderMobileFavoriteRow(track, true))}</div>
            </section>
            <div className="hidden space-y-3 lg:block">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-text-primary">Favorite tracks</h2>
                <DesktopTrackColumnsMenu columns={desktopTrackColumns} hasSourceColumn={likedHasSourceColumn} onToggleColumn={setDesktopTrackColumn} />
              </div>
              <DesktopTrackListHeaderRow columns={visibleLikedDesktopColumns} />
              <div className="space-y-2.5">
                {sortedFavorites.map((track, index) => renderFavoriteRow(track, true, index + 1))}
              </div>
            </div>
          </>
        )}
      </div>
    ) : null}
    {libraryView === 'history' ? (
      <>
      <div className="space-y-5 lg:hidden">
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-primary transition-colors active:bg-white/10"
              onClick={() => setLibraryView('library')}
              aria-label="Back to Library"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">Library</p>
              <h1 className="font-heading text-[2rem] leading-tight text-text-primary">History</h1>
            </div>
          </div>
        </section>

        {historyEntries.length === 0 ? (
          <EmptyState
            title="No listening history yet."
            description="Play tracks and they'll appear here."
            className="min-h-52"
          />
        ) : (
          <div className="space-y-7">
            {renderHistoryGroup('Today', todayHistory, 'mobile')}
            {renderHistoryGroup('Earlier', earlierHistory, 'mobile')}
          </div>
        )}
      </div>

      <div className="hidden space-y-6 lg:block">
        <section className="editorial-panel rounded-[2rem] px-8 py-7">
          <Button type="button" variant="ghost" className="mb-5 gap-2 border border-white/10 bg-white/5" onClick={() => setLibraryView('library')}>
            <ArrowLeft className="size-4" /> Back to Library
          </Button>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-muted">Library</p>
          <div className="mt-2 flex items-end justify-between">
            <div><h1 className="font-heading text-4xl text-text-primary">History</h1><p className="mt-2 text-sm text-text-secondary">Tracks you actually played, ordered by latest playback.</p></div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-primary-soft">Music</span>
          </div>
        </section>
        {historyEntries.length === 0 ? <EmptyState title="No listening history yet" description="Play a track and it will appear here." /> : (
          <div className="space-y-7">{renderHistoryGroup('Today', todayHistory)}{renderHistoryGroup('Earlier', earlierHistory)}</div>
        )}
      </div>
      </>
    ) : null}
    {libraryView === 'playlist' && selectedPlaylist ? (
      <div className="space-y-5 lg:space-y-6">
        <section className="editorial-panel overflow-visible rounded-[1.75rem] px-4 py-5 sm:rounded-[2rem] sm:px-8 sm:py-7">
          <Button
            type="button"
            variant="ghost"
            className="mb-5 gap-2 border border-white/10 bg-white/5"
            onClick={() => {
              setLibraryView('library')
              setSelectedPlaylistId(null)
            }}
            aria-label="Back to Library"
          >
            <ArrowLeft className="size-4" />
            Back to Library
          </Button>

          <div className="flex flex-col gap-5 text-center lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-6 lg:text-left">
            <div className="mx-auto flex size-36 items-center justify-center overflow-hidden rounded-[1.6rem] bg-primary/12 text-primary-soft shadow-[0_22px_60px_rgba(0,0,0,0.36)] sm:size-44 lg:mx-0 lg:size-52">
              {selectedPlaylistTracks[0] ? (
                <img src={selectedPlaylistTracks[0].imageUrl} alt={`${selectedPlaylist.title} cover`} className="size-full object-cover" />
              ) : (
                <ListMusic className="size-14 sm:size-16" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-muted">Playlist</p>
              <h1 className="mt-2 font-heading text-[2.2rem] leading-[0.98] text-text-primary sm:text-[3rem] lg:text-[4.6rem]">
                {selectedPlaylist.title}
              </h1>
              {selectedPlaylist.description ? (
                <p className="mx-auto mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-text-secondary lg:mx-0">{selectedPlaylist.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-text-secondary">
                {selectedPlaylistTracks.length} {selectedPlaylistTracks.length === 1 ? 'track' : 'tracks'} • Local playlist
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                <Button type="button" className="gap-2" onClick={playSelectedPlaylist} aria-label="Play">
                  <Play className="size-4" />
                  Play
                </Button>
                <Button type="button" variant="secondary" className="gap-2" onClick={() => shuffleCollection(selectedPlaylist.title, selectedPlaylistTracks)} aria-label="Shuffle">
                  <Shuffle className="size-4" />
                  Shuffle
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 border border-white/10 bg-white/5"
                  onClick={() => void handleTogglePlaylistSavedCollection()}
                  aria-label={isSelectedPlaylistSaved ? 'Remove from Library' : 'Save to Library'}
                  title={isSelectedPlaylistSaved ? 'Remove from Library' : 'Save to Library'}
                >
                  {isSelectedPlaylistSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  {isSelectedPlaylistSaved ? 'Remove from Library' : 'Save to Library'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 border border-white/10 bg-white/5"
                  onClick={() => void handleShareCollection('playlist')}
                  aria-label="Share"
                  title="Share"
                >
                  <Share2 className="size-4" />
                  Share
                </Button>
                <div ref={detailMoreMenu === 'playlist' ? detailMoreMenuRef : undefined} className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="border border-white/10 bg-white/5"
                    onClick={() => setDetailMoreMenu((menu) => (menu === 'playlist' ? null : 'playlist'))}
                    aria-label="More options"
                    aria-expanded={detailMoreMenu === 'playlist'}
                    title="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                  {detailMoreMenu === 'playlist' ? (
                    <div className="editorial-panel absolute right-0 top-12 z-30 hidden w-60 rounded-[1.1rem] p-2 text-left shadow-[0_18px_46px_rgba(0,0,0,0.34)] lg:block">
                      <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary" onClick={() => addCollectionToQueue(selectedPlaylistTracks)}>
                        <ListPlus className="size-4" />
                        Add to queue
                      </button>
                      <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary" onClick={() => openCollectionPlaylistDialog(selectedPlaylistTracks, selectedPlaylist.title)}>
                        <ListPlus className="size-4" />
                        Add to playlist
                      </button>
                      <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary" onClick={() => void handleTogglePlaylistSavedCollection()}>
                        {isSelectedPlaylistSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                        {isSelectedPlaylistSaved ? 'Remove from Library' : 'Save to Library'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {selectedPlaylistTracks.length === 0 ? (
          <EmptyState
            title="No tracks in this playlist yet"
            description="Use Add to playlist from any track menu to build this playlist."
          />
        ) : (
          <div className="space-y-3">
            <div className="hidden items-center justify-end lg:flex">
              <DesktopTrackColumnsMenu
                columns={desktopTrackColumns}
                hasSourceColumn={playlistHasSourceColumn}
                onToggleColumn={setDesktopTrackColumn}
              />
            </div>
            <DesktopTrackListHeaderRow columns={visiblePlaylistDesktopColumns} />
            <div className="space-y-2.5">{selectedPlaylistTracks.map(renderPlaylistTrackRow)}</div>
          </div>
        )}
      </div>
    ) : null}
    <AnimatePresence>
      {isMobileSortSheetOpen ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[118] bg-black/62 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.14 }}
            onClick={() => setIsMobileSortSheetOpen(false)}
            aria-label="Close sort options"
          />
          <motion.div
            className="mobile-sheet-surface fixed inset-x-0 bottom-0 z-[119] rounded-t-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,29,0.98),rgba(10,8,16,0.99))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_58px_rgba(0,0,0,0.44)] lg:hidden"
            initial={{ opacity: 0, y: 96 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 96 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.01, ease: 'linear' }
                : { duration: 0.18, ease: 'easeOut' }
            }
            drag="y"
            dragListener={false}
            dragControls={mobileSortDragControls}
            dragDirectionLock
            dragElastic={0.08}
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 620) {
                setIsMobileSortSheetOpen(false)
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mx-auto mb-3 block h-1.5 w-14 touch-none rounded-full bg-white/18"
              onPointerDown={(event) => {
                event.stopPropagation()
                mobileSortDragControls.start(event)
              }}
              aria-label="Drag to close sort options"
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-heading text-[1.25rem] text-text-primary">Sort by</h2>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary"
                onClick={() => setIsMobileSortSheetOpen(false)}
                aria-label="Close sort options"
              >
                <X className="size-4.5" />
              </button>
            </div>
            <div className="space-y-1">
              {(Object.entries(sortLabels) as Array<[SortOption, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                  onClick={() => {
                    setSortOption(value)
                    setIsMobileSortSheetOpen(false)
                  }}
                >
                  <span>{label}</span>
                  {sortOption === value ? <Check className="size-5 text-primary-soft" /> : null}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
    <AnimatePresence>
      {mobileItemMenuTarget ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[118] bg-black/62 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.14 }}
            onClick={() => setMobileItemMenuTarget(null)}
            aria-label="Close more options"
          />
          <motion.div
            className="mobile-sheet-surface fixed inset-x-0 bottom-0 z-[119] rounded-t-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,29,0.98),rgba(10,8,16,0.99))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_58px_rgba(0,0,0,0.44)] lg:hidden"
            initial={{ opacity: 0, y: 96 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 96 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.01, ease: 'linear' }
                : { duration: 0.18, ease: 'easeOut' }
            }
            drag="y"
            dragListener={false}
            dragControls={mobileItemMenuDragControls}
            dragDirectionLock
            dragElastic={0.08}
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 620) {
                setMobileItemMenuTarget(null)
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mx-auto mb-3 block h-1.5 w-14 touch-none rounded-full bg-white/18"
              onPointerDown={(event) => {
                event.stopPropagation()
                mobileItemMenuDragControls.start(event)
              }}
              aria-label="Drag to close more options"
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-heading text-[1.25rem] text-text-primary">
                  {mobileMenuLocalPlaylist?.title ?? mobileMenuSavedCollection?.title ?? mobileMenuArtist?.name ?? 'More options'}
                </h2>
                <p className="mt-1 truncate text-[0.82rem] text-text-secondary">
                  {mobileMenuLocalPlaylist
                    ? `Playlist · ${mobileMenuLocalPlaylistTracks.length} ${mobileMenuLocalPlaylistTracks.length === 1 ? 'track' : 'tracks'}`
                    : mobileMenuSavedCollection
                      ? getSavedCollectionSubtitle(mobileMenuSavedCollection)
                      : mobileMenuArtist
                        ? `${mobileMenuArtist.count} saved ${mobileMenuArtist.count === 1 ? 'song' : 'songs'}`
                        : 'Library item'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary"
                onClick={() => setMobileItemMenuTarget(null)}
                aria-label="Close more options"
              >
                <X className="size-4.5" />
              </button>
            </div>
            <div className="space-y-1">
              {mobileMenuLocalPlaylist && mobileMenuLocalRuntimePlaylist ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      playCollection(mobileMenuLocalPlaylistTracks, mobileMenuLocalRuntimePlaylist)
                    }}
                  >
                    <Play className="size-4.5" />
                    Play
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      shuffleCollection(mobileMenuLocalPlaylist.title, mobileMenuLocalPlaylistTracks)
                    }}
                  >
                    <Shuffle className="size-4.5" />
                    Shuffle
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      addCollectionToQueue(mobileMenuLocalPlaylistTracks)
                    }}
                  >
                    <ListPlus className="size-4.5" />
                    Add to queue
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      openCollectionPlaylistDialog(mobileMenuLocalPlaylistTracks, mobileMenuLocalPlaylist.title)
                    }}
                  >
                    <ListPlus className="size-4.5" />
                    Add to playlist
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void handleShareLocalPlaylist(mobileMenuLocalPlaylist)
                    }}
                  >
                    <Share2 className="size-4.5" />
                    Share
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => requestDeletePlaylist(mobileMenuLocalPlaylist)}
                  >
                    <X className="size-4.5" />
                    Delete playlist
                  </button>
                </>
              ) : null}
              {mobileMenuSavedCollection ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void playSavedCollection(mobileMenuSavedCollection)
                    }}
                  >
                    <Play className="size-4.5" />
                    Play
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void shuffleSavedCollection(mobileMenuSavedCollection)
                    }}
                  >
                    <Shuffle className="size-4.5" />
                    Shuffle
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void addSavedCollectionToQueue(mobileMenuSavedCollection)
                    }}
                  >
                    <ListPlus className="size-4.5" />
                    Add to queue
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void openSavedCollectionPlaylistDialog(mobileMenuSavedCollection)
                    }}
                  >
                    <ListPlus className="size-4.5" />
                    Add to playlist
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      openSavedCollection(mobileMenuSavedCollection)
                    }}
                  >
                    <ChevronDown className="-rotate-90 size-4.5" />
                    Open
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void handleShareSavedCollection(mobileMenuSavedCollection)
                    }}
                  >
                    <Share2 className="size-4.5" />
                    Share
                  </button>
                  {mobileMenuSavedCollection.externalUrl ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                      onClick={() => {
                        setMobileItemMenuTarget(null)
                        window.open(mobileMenuSavedCollection.externalUrl ?? undefined, '_blank', 'noreferrer')
                      }}
                    >
                      <ExternalLink className="size-4.5" />
                      Open on Jamendo
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      requestRemoveSavedCollection(mobileMenuSavedCollection)
                    }}
                  >
                    <BookmarkCheck className="size-4.5" />
                    Remove from Library
                  </button>
                </>
              ) : null}
              {mobileMenuArtist ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                       void playArtistCollection(mobileMenuArtist)
                    }}
                  >
                    <Play className="size-4.5" />
                    Play
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                       void shuffleArtistCollection(mobileMenuArtist)
                    }}
                  >
                    <Shuffle className="size-4.5" />
                    Shuffle
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                       void addArtistToQueue(mobileMenuArtist)
                    }}
                  >
                    <ListPlus className="size-4.5" />
                    Add top tracks to queue
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                       void openArtistPlaylistDialog(mobileMenuArtist)
                    }}
                  >
                    <ListPlus className="size-4.5" />
                    Add top tracks to playlist
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      openSavedArtist(mobileMenuArtist)
                    }}
                  >
                    <ChevronDown className="-rotate-90 size-4.5" />
                    Open artist
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      void handleShareArtistCollection(mobileMenuArtist)
                    }}
                  >
                    <Share2 className="size-4.5" />
                    Share
                  </button>
                  {mobileMenuArtist.externalUrl ? (
                    <a
                      href={mobileMenuArtist.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                      onClick={() => setMobileItemMenuTarget(null)}
                    >
                      <ExternalLink className="size-4.5" />
                      View on Jamendo
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setMobileItemMenuTarget(null)
                      requestRemoveArtistFromLibrary(mobileMenuArtist.sourceId)
                    }}
                  >
                    <BookmarkCheck className="size-4.5" />
                    Remove artist
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
    <AddToPlaylistDialog
      open={isNewPlaylistDialogOpen}
      onOpenChange={setIsNewPlaylistDialogOpen}
      onCreated={(playlistId) => {
        setSelectedPlaylistId(playlistId)
        setLibraryView('playlist')
      }}
    />
    <AnimatePresence>
      {detailMoreMenu ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[118] bg-black/62 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.14 }}
            onClick={() => setDetailMoreMenu(null)}
            aria-label="Close more options"
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[119] rounded-t-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,29,0.98),rgba(10,8,16,0.99))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_58px_rgba(0,0,0,0.44)] lg:hidden"
            initial={{ opacity: 0, y: 96 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 96 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.01, ease: 'linear' }
                : { duration: 0.18, ease: 'easeOut' }
            }
            drag="y"
            dragListener={false}
            dragControls={detailMoreDragControls}
            dragDirectionLock
            dragElastic={0.08}
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 620) {
                setDetailMoreMenu(null)
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mx-auto mb-3 block h-1.5 w-14 touch-none rounded-full bg-white/18"
              onPointerDown={(event) => {
                event.stopPropagation()
                detailMoreDragControls.start(event)
              }}
              aria-label="Drag to close more options"
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-heading text-[1.25rem] text-text-primary">More options</h2>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary"
                onClick={() => setDetailMoreMenu(null)}
                aria-label="Close more options"
              >
                <X className="size-4.5" />
              </button>
            </div>
            <div className="space-y-1">
              {detailMoreMenu === 'liked' ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setDetailMoreMenu(null)
                      playCollection(favorites, favoritesPlaylist)
                    }}
                  >
                    <Play className="size-4.5" />
                    Play
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => {
                      setDetailMoreMenu(null)
                      shuffleCollection('Music I Like', favorites)
                    }}
                  >
                    <Shuffle className="size-4.5" />
                    Shuffle
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                onClick={() => addCollectionToQueue(detailMoreMenu === 'liked' ? favorites : selectedPlaylistTracks)}
              >
                <ListPlus className="size-4.5" />
                Add to queue
              </button>
              {detailMoreMenu === 'liked' ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                  onClick={() => playCollectionNext('Music I Like', favorites)}
                >
                  <Play className="size-4.5" />
                  Play next
                </button>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                onClick={() => openCollectionPlaylistDialog(detailMoreMenu === 'liked' ? favorites : selectedPlaylistTracks, detailMoreMenu === 'liked' ? 'Music I Like' : selectedPlaylist?.title ?? 'Playlist')}
              >
                <ListPlus className="size-4.5" />
                Add to playlist
              </button>
              {detailMoreMenu === 'playlist' ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                  onClick={() => void handleTogglePlaylistSavedCollection()}
                >
                  {isSelectedPlaylistSaved ? <BookmarkCheck className="size-4.5" /> : <Bookmark className="size-4.5" />}
                  {isSelectedPlaylistSaved ? 'Remove from Library' : 'Save to Library'}
                </button>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
    <Dialog.Root
      open={confirmDialogState !== null}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmDialogState(null)
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="editorial-panel fixed left-1/2 top-1/2 z-[121] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.4rem] border border-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-[1.2rem] text-text-primary">
                {confirmDialogState?.title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-text-secondary">
                {confirmDialogState?.description}
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
                const action = confirmDialogState?.action
                setConfirmDialogState(null)
                await action?.()
              }}
            >
              {confirmDialogState?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <AddToPlaylistDialog
      tracks={collectionTracksForDialog}
      collectionTitle={collectionTitleForDialog}
      open={isAddCollectionToPlaylistOpen}
      onOpenChange={(open) => {
        setIsAddCollectionToPlaylistOpen(open)
        if (!open) {
          setCollectionTracksForDialog([])
          setCollectionTitleForDialog('Playlist')
        }
      }}
    />
    <ShareLinkDialog
      title={shareDialogTarget === 'liked' ? 'Music I Like on Tonaliz Lite' : `${selectedPlaylist?.title ?? 'Playlist'} on Tonaliz Lite`}
      description={shareDialogTarget === 'liked' ? 'Saved collection' : selectedPlaylist?.description ?? 'Local playlist'}
      url={shareDialogTarget ? getLibraryShareUrl(shareDialogTarget) : null}
      open={shareDialogTarget !== null}
      onOpenChange={(open) => {
        if (!open) {
          setShareDialogTarget(null)
        }
      }}
    />
    <ShareLinkDialog
      title={shareSavedCollectionTarget ? `${shareSavedCollectionTarget.title} on Tonaliz Lite` : 'Saved collection on Tonaliz Lite'}
      description={shareSavedCollectionTarget ? getSavedCollectionSubtitle(shareSavedCollectionTarget) : 'Saved collection'}
      url={shareSavedCollectionTarget ? getSavedCollectionShareUrl(shareSavedCollectionTarget) : null}
      open={shareSavedCollectionTarget !== null}
      onOpenChange={(open) => {
        if (!open) {
          setShareSavedCollectionTarget(null)
        }
      }}
    />
    <ShareLinkDialog
      title={shareArtistTarget ? `${shareArtistTarget.name} on Tonaliz Lite` : 'Artist on Tonaliz Lite'}
      description={shareArtistTarget ? `Artist · ${shareArtistTarget.count} saved ${shareArtistTarget.count === 1 ? 'song' : 'songs'}` : 'Artist'}
      url={shareArtistTarget ? getArtistShareUrl(shareArtistTarget) : null}
      open={shareArtistTarget !== null}
      onOpenChange={(open) => {
        if (!open) {
          setShareArtistTarget(null)
        }
      }}
    />
    </>
  )
}
