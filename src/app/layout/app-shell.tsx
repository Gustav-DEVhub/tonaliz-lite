import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, Heart, Home, Library, ListMusic, Music2, PanelRightOpen, Play, Plus, Radio, Search, Wifi, WifiOff } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { Track } from '@/entities/track/model/types'
import { SearchBar } from '@/features/discover/components/search-bar'
import { useBrowseSessionStore } from '@/features/discover/store/use-browse-session-store'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlaylistsStore } from '@/features/library/store/use-playlists-store'
import { useSavedCollectionsStore } from '@/features/library/store/use-saved-collections-store'
import { BottomPlayer } from '@/features/player/components/bottom-player'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useRecentlyPlayedStore } from '@/features/player/store/use-recently-played-store'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { ToastViewport } from '@/shared/ui/toast-viewport'

const HomePage = lazy(async () => import('@/features/home/pages/home-page').then((module) => ({ default: module.HomePage })))
const DiscoverPage = lazy(async () =>
  import('@/features/discover/pages/discover-page').then((module) => ({ default: module.DiscoverPage })),
)
const SearchPage = lazy(async () =>
  import('@/features/discover/pages/search-page').then((module) => ({ default: module.SearchPage })),
)
const ShelfCollectionPage = lazy(async () =>
  import('@/features/discover/pages/shelf-collection-page').then((module) => ({ default: module.ShelfCollectionPage })),
)
const ArtistProfilePage = lazy(async () =>
  import('@/features/artist/pages/artist-profile-page').then((module) => ({ default: module.ArtistProfilePage })),
)
const LibraryPage = lazy(async () =>
  import('@/features/library/pages/library-page').then((module) => ({ default: module.LibraryPage })),
)
const ExpandedPlayerPage = lazy(async () =>
  import('@/features/player/pages/expanded-player-page').then((module) => ({ default: module.ExpandedPlayerPage })),
)
const QueuePanel = lazy(async () =>
  import('@/features/player/components/queue-panel').then((module) => ({ default: module.QueuePanel })),
)
const NowPlayingPanel = lazy(async () =>
  import('@/features/player/components/now-playing-panel').then((module) => ({ default: module.NowPlayingPanel })),
)

const desktopNavigationItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Radio },
  { to: '/library', label: 'Library', icon: Library },
]

const mobileNavigationItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Library', icon: Library },
]

const routeScrollPositions = new Map<string, number>()
const LEFT_SIDEBAR_DEFAULT_WIDTH = 280
const LEFT_SIDEBAR_COMPACT_WIDTH = 60
const RIGHT_PANEL_DEFAULT_WIDTH = 360
const RIGHT_PANEL_COMPACT_WIDTH = 72
const RIGHT_PANEL_MIN_DRAG_WIDTH = 300
const RIGHT_PANEL_MAX_DRAG_WIDTH = 480
const RIGHT_PANEL_COMPACT_THRESHOLD = 220

type SidebarMode = 'expanded' | 'compact'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function readStoredNumber(key: string, fallback: number, min: number, max: number) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)
  const parsedValue = rawValue ? Number(rawValue) : Number.NaN

  return Number.isFinite(parsedValue) ? clamp(parsedValue, min, max) : fallback
}

function readStoredSidebarMode(key: string, fallback: SidebarMode) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)
  return rawValue === 'compact' || rawValue === 'expanded' ? rawValue : fallback
}

function RouteFallback() {
  return (
    <div className="editorial-panel flex min-h-[18rem] items-center justify-center rounded-[1.75rem] px-6 py-10">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-text-muted">Loading view</p>
    </div>
  )
}

function RailFallback() {
  return (
    <aside className="relative hidden min-w-0 lg:flex lg:h-full lg:min-h-0 lg:justify-end">
      <div className="w-full lg:h-full lg:min-h-0">
        <div className="editorial-panel mood-glow h-full rounded-[1.8rem] border-white/8 p-3 lg:flex lg:min-h-0 lg:items-center lg:justify-center xl:p-3.5">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Loading panel</p>
        </div>
      </div>
    </aside>
  )
}

interface DesktopLibrarySidebarModuleProps {
  isCollapsed: boolean
}

function SidebarHamburgerIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      initial={{ opacity: 0.88, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      <path d="M4.5 7.5h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 16.5h15" />
    </motion.svg>
  )
}

function SidebarArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.86 }}
      transition={{ duration: 0.18 }}
    >
      {direction === 'left' ? <path d="M14.5 6.5 8.5 12l6 5.5" /> : <path d="m9.5 6.5 6 5.5-6 5.5" />}
    </motion.svg>
  )
}

export function DesktopLibrarySidebarModule({ isCollapsed }: DesktopLibrarySidebarModuleProps) {
  const navigate = useNavigate()
  const favorites = useFavoritesStore((state) => state.favorites)
  const userPlaylists = usePlaylistsStore((state) => state.playlists)
  const playlistTracksById = usePlaylistsStore((state) => state.playlistTracksById)
  const savedCollections = useSavedCollectionsStore((state) => state.collections)
  const historyEntries = useRecentlyPlayedStore((state) => state.entries)
  const playTrackFromContext = usePlayerStore((state) => state.playTrackFromContext)
  const topTracksCount = historyEntries.length
  const playlistShortcuts = useMemo(
    () => [...userPlaylists].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 8),
    [userPlaylists],
  )

  const shortcuts = useMemo(() => {
    const items: Array<{
      id: string
      label: string
      meta: string
      icon: ReactNode
      tracks: Track[]
      onClick: () => void
    }> = []

    if (favorites.length > 0) {
      items.push({
        id: 'liked-songs',
        label: 'Music I Like',
        meta: `${favorites.length} ${favorites.length === 1 ? 'track' : 'tracks'}`,
        icon: <Heart className="size-3.5 fill-current" />,
        tracks: favorites,
        onClick: () => navigate('/library', { state: { libraryView: 'liked' } }),
      })
    }

    if (topTracksCount > 0) {
      items.push({
        id: 'top-tracks',
        label: 'Top Tracks',
        meta: `${topTracksCount} played`,
        icon: <Music2 className="size-3.5" />,
        tracks: historyEntries,
        onClick: () => navigate('/library', { state: { libraryView: 'library', desktopCategory: 'songs', libraryOrder: 'recently-played' } }),
      })
    }

    for (const playlist of playlistShortcuts) {
      const playlistTracks = (playlistTracksById[playlist.id] ?? []).map((playlistTrack) => playlistTrack.track)

      items.push({
        id: `playlist-${playlist.id}`,
        label: playlist.title,
        meta: `${playlistTracks.length} ${playlistTracks.length === 1 ? 'track' : 'tracks'}`,
        icon: <ListMusic className="size-3.5" />,
        tracks: playlistTracks,
        onClick: () => navigate('/library', { state: { libraryView: 'playlist', selectedPlaylistId: playlist.id } }),
      })
    }

    for (const collection of savedCollections.slice(0, 6)) {
      items.push({
        id: `saved-${collection.id}`,
        label: collection.title,
        meta: collection.subtitle ?? 'Saved collection',
        icon: <Bookmark className="size-3.5" />,
        tracks: [],
        onClick: () => {
          if (collection.routePath) {
            navigate(collection.routePath)
            return
          }

          if (collection.externalUrl && typeof window !== 'undefined') {
            window.open(collection.externalUrl, '_blank', 'noreferrer')
          }
        },
      })
    }

    return items
  }, [favorites, historyEntries, navigate, playlistShortcuts, playlistTracksById, savedCollections, topTracksCount])

  const playShortcut = (label: string, tracks: Track[]) => {
    const firstTrack = tracks[0]

    if (!firstTrack) {
      return
    }

    playTrackFromContext(firstTrack, createPlaylist(label, 'library', tracks))
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="scrollbar-subtle h-full min-h-0 overflow-y-auto pr-1">
        {shortcuts.length > 0 ? (
          <div className={cn('space-y-2 pb-2', isCollapsed && 'flex flex-col items-center')}>
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className={cn(
                  'group/shortcut w-full rounded-[1rem] border border-transparent text-left text-text-secondary transition-colors hover:border-white/10 hover:bg-white/5 hover:text-text-primary',
                  isCollapsed ? 'inline-flex size-10 items-center justify-center px-0' : 'flex items-center gap-2 px-3 py-2.5',
                )}
              >
                <button
                  type="button"
                  title={shortcut.label}
                  aria-label={shortcut.label}
                  className={cn(
                    'min-w-0 text-left',
                    isCollapsed ? 'inline-flex size-10 items-center justify-center' : 'flex flex-1 items-center gap-3',
                  )}
                  onClick={shortcut.onClick}
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/6 text-primary-soft">
                    {shortcut.icon}
                  </span>
                  {isCollapsed ? null : (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-[0.86rem] text-text-primary">{shortcut.label}</span>
                      <span className="block truncate text-[0.7rem] text-text-muted">{shortcut.meta}</span>
                    </span>
                  )}
                </button>
                {!isCollapsed && shortcut.tracks.length > 0 ? (
                  <button
                    type="button"
                    aria-label={`Play ${shortcut.label}`}
                    title={`Play ${shortcut.label}`}
                    className="inline-flex size-8 shrink-0 scale-[0.82] items-center justify-center rounded-full border border-white/12 bg-primary/80 text-white opacity-0 shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition duration-150 group-hover/shortcut:scale-100 group-hover/shortcut:opacity-100 group-focus-within/shortcut:scale-100 group-focus-within/shortcut:opacity-100"
                    onClick={() => {
                      playShortcut(shortcut.label, shortcut.tracks)
                    }}
                  >
                    <Play className="ml-0.5 size-3.5 fill-current" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={cn('text-[0.76rem] leading-5 text-text-muted', isCollapsed ? 'px-0 text-center' : 'px-2 py-2')}>
            {isCollapsed ? 'No items yet.' : 'Save tracks or create playlists to populate your shortcuts.'}
          </p>
        )}
      </div>
    </div>
  )
}

function CompactRightRail({
  currentTrack,
  onOpenNowPlaying,
}: {
  currentTrack: Track | null
  onOpenNowPlaying: () => void
}) {
  return (
    <aside className="relative hidden h-full min-h-0 lg:flex">
      <div className="editorial-panel mood-glow flex h-full min-h-0 w-full flex-col items-center justify-start rounded-[1.8rem] border-white/8 px-2 py-3">
        <div className="flex w-full flex-col items-center gap-2.5">
          <button
            type="button"
            title="Expand right panel"
            aria-label="Expand right panel"
            onClick={onOpenNowPlaying}
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-text-primary transition-colors hover:bg-white/14 hover:text-white"
          >
            <PanelRightOpen className="size-4" />
          </button>

          <button
            type="button"
            title={currentTrack ? `${currentTrack.name} by ${currentTrack.artistName}` : 'Open now playing'}
            aria-label="Open now playing"
            onClick={onOpenNowPlaying}
            className="inline-flex size-11 overflow-hidden rounded-[1rem] border border-white/12 bg-white/8 shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition-transform hover:translate-y-[-1px]"
          >
            {currentTrack ? (
              <img src={currentTrack.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-primary-soft">
                <Music2 className="size-4" />
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeScrollKey = `${location.pathname}${location.search}`
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const rightPanelDragStateRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const [isRightPanelDragging, setIsRightPanelDragging] = useState(false)
  const [leftSidebarMode, setLeftSidebarMode] = useState<SidebarMode>(() => readStoredSidebarMode('leftSidebarMode', 'expanded'))
  const [rightPanelMode, setRightPanelMode] = useState<SidebarMode>(() => readStoredSidebarMode('rightPanelMode', 'expanded'))
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    readStoredNumber('rightPanelWidth', RIGHT_PANEL_DEFAULT_WIDTH, RIGHT_PANEL_MIN_DRAG_WIDTH, RIGHT_PANEL_MAX_DRAG_WIDTH),
  )
  const [rightPanelLastExpandedWidth, setRightPanelLastExpandedWidth] = useState(() =>
    readStoredNumber(
      'rightPanelLastExpandedWidth',
      RIGHT_PANEL_DEFAULT_WIDTH,
      RIGHT_PANEL_MIN_DRAG_WIDTH,
      RIGHT_PANEL_MAX_DRAG_WIDTH,
    ),
  )
  const currentMood = usePlayerStore((state) => state.currentMood)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const desktopRightRailMode = usePlayerStore((state) => state.desktopRightRailMode)
  const openNowPlayingRail = usePlayerStore((state) => state.openNowPlayingRail)
  const closeDesktopRail = usePlayerStore((state) => state.closeDesktopRail)
  const closeQueueRailAndRestore = usePlayerStore((state) => state.closeQueueRailAndRestore)
  const query = useDiscoverStore((state) => state.query)
  const setQuery = useDiscoverStore((state) => state.setQuery)
  const search = useDiscoverStore((state) => state.search)
  const clearResults = useDiscoverStore((state) => state.clearResults)
  const isLoading = useDiscoverStore((state) => state.isLoading)
  const refreshBrowse = useBrowseSessionStore((state) => state.refreshBrowse)
  const [sidebarIconCue, setSidebarIconCue] = useState<'left' | 'right' | null>(null)
  const [isSidebarPlaylistDialogOpen, setIsSidebarPlaylistDialogOpen] = useState(false)

  const moodToken = moodTheme[currentMood]
  const moodStyle = {
    '--mood-accent': moodToken.accent,
    '--mood-background': moodToken.background,
    '--mood-text': moodToken.text,
  } as CSSProperties
  const isExpandedPlayerPage = location.pathname === '/now-playing'
  const showDesktopRailHost = Boolean(currentTrack) && !isExpandedPlayerPage
  const isLibraryRoute = location.pathname.startsWith('/library')
  const isLeftSidebarCollapsed = leftSidebarMode === 'compact'
  const isRightPanelCompact = rightPanelMode === 'compact' || desktopRightRailMode === 'closed'
  const effectiveLeftSidebarWidth = isLeftSidebarCollapsed ? LEFT_SIDEBAR_COMPACT_WIDTH : LEFT_SIDEBAR_DEFAULT_WIDTH
  const effectiveRightPanelWidth = isRightPanelCompact ? RIGHT_PANEL_COMPACT_WIDTH : rightPanelWidth
  const desktopGridStyle = !isExpandedPlayerPage
    ? ({
        gridTemplateColumns: showDesktopRailHost
          ? `${effectiveLeftSidebarWidth}px minmax(0, 1fr) ${effectiveRightPanelWidth}px`
          : `${effectiveLeftSidebarWidth}px minmax(0, 1fr)`,
      } satisfies CSSProperties)
    : undefined
  const toggleLeftSidebarMode = () => {
    const nextMode: SidebarMode = isLeftSidebarCollapsed ? 'expanded' : 'compact'
    setSidebarIconCue(nextMode === 'compact' ? 'left' : 'right')
    setLeftSidebarMode(nextMode)
    window.localStorage.setItem('sidebarCollapsed', nextMode === 'compact' ? 'true' : 'false')
    window.setTimeout(() => setSidebarIconCue(null), 200)
  }

  const expandRightPanel = () => {
    setRightPanelMode('expanded')
    setRightPanelWidth(rightPanelLastExpandedWidth)
    openNowPlayingRail()
  }

  useEffect(() => {
    window.localStorage.setItem('leftSidebarMode', leftSidebarMode)
    window.localStorage.setItem('sidebarCollapsed', leftSidebarMode === 'compact' ? 'true' : 'false')
  }, [leftSidebarMode])

  useEffect(() => {
    window.localStorage.setItem('rightPanelWidth', String(rightPanelWidth))
    window.localStorage.setItem('rightPanelMode', rightPanelMode)
    window.localStorage.setItem('rightPanelLastExpandedWidth', String(rightPanelLastExpandedWidth))
  }, [rightPanelLastExpandedWidth, rightPanelMode, rightPanelWidth])

  const handleBrandReset = () => {
    routeScrollPositions.set('/', 0)
    refreshBrowse()

    if (window.matchMedia('(min-width: 1024px)').matches) {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    const scrollTarget = isDesktop ? contentScrollRef.current : window
    const savedScrollTop = routeScrollPositions.get(routeScrollKey) ?? 0

    const restoreScroll = () => {
      if (isDesktop) {
        contentScrollRef.current?.scrollTo({ top: savedScrollTop })
        return
      }

      window.scrollTo({ top: savedScrollTop })
    }

    let secondFrame: number | null = null
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(restoreScroll)
    })
    const timeout = window.setTimeout(restoreScroll, 160)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame)
      }
      window.clearTimeout(timeout)

      const nextScrollTop =
        isDesktop && scrollTarget !== window
          ? (scrollTarget as HTMLDivElement | null)?.scrollTop ?? 0
          : window.scrollY

      routeScrollPositions.set(routeScrollKey, nextScrollTop)
    }
  }, [routeScrollKey])

  useEffect(() => {
    if (!isRightPanelDragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = rightPanelDragStateRef.current
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return
      }

      const nextWidth = clamp(
        dragState.startWidth - (event.clientX - dragState.startX),
        RIGHT_PANEL_MIN_DRAG_WIDTH,
        RIGHT_PANEL_MAX_DRAG_WIDTH,
      )

      if (nextWidth <= RIGHT_PANEL_COMPACT_THRESHOLD) {
        if (desktopRightRailMode === 'queue') {
          closeQueueRailAndRestore()
        } else {
          closeDesktopRail()
        }
        setRightPanelMode('compact')
        return
      }

      setRightPanelMode('expanded')
      setRightPanelWidth(nextWidth)
      setRightPanelLastExpandedWidth(nextWidth)
    }

    const finishDrag = (event: PointerEvent) => {
      const dragState = rightPanelDragStateRef.current
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return
      }

      rightPanelDragStateRef.current = null
      setIsRightPanelDragging(false)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [closeDesktopRail, closeQueueRailAndRestore, desktopRightRailMode, isRightPanelDragging])

  return (
    <div style={moodStyle} className="relative min-h-screen overflow-x-hidden lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--mood-accent)_14%,transparent),transparent_34%)]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-app-bg/88 backdrop-blur-xl">
        <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 lg:hidden lg:px-8">
          <div className="flex w-full items-center justify-between gap-4">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2.5 rounded-[1.2rem] text-left transition-colors hover:text-white"
              onClick={handleBrandReset}
              aria-label="Go to Home and refresh browse"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[1.05rem] border border-white/10 bg-black/30">
                <img src="/favicon.svg" alt="" className="size-7" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-[1.02rem] font-bold tracking-[-0.03em] text-[#F7F3FF]">
                  Tonaliz Lite
                </p>
                <p className="hidden truncate font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[#8F849E] min-[360px]:block">
                  independent music discovery
                </p>
              </div>
            </button>

            <div className="hidden items-center gap-2 md:flex">
              {desktopNavigationItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end}>
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                        isActive
                          ? 'border-white/15 bg-white/8 text-text-primary'
                          : 'border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary',
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  'border-transparent',
                  isOnline ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300',
                )}
              >
                {isOnline ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

        </div>

        <div className="hidden w-full items-center gap-5 px-6 py-3.5 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)_7rem] lg:justify-between 2xl:px-8">
          <button
            type="button"
            className="flex min-w-0 items-center gap-3 rounded-[1.2rem] text-left transition-colors hover:text-white"
            onClick={handleBrandReset}
            aria-label="Go to Home and refresh browse"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[1.05rem] border border-white/10 bg-black/30">
              <img src="/favicon.svg" alt="" className="size-7" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-[1.04rem] font-bold text-[#F7F3FF]">
                Tonaliz Lite
              </p>
              <p className="truncate font-mono text-[0.52rem] uppercase tracking-[0.22em] text-[#8F849E]">
                Independent Music Discovery
              </p>
            </div>
          </button>

          <SearchBar
            compact
            className={cn(
              'mx-auto w-full',
              isLibraryRoute ? 'max-w-[37.5rem]' : 'max-w-[31.25rem]',
            )}
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
            }}
            onClear={() => {
              setQuery('')
              clearResults()
              if (location.pathname.startsWith('/discover')) {
                navigate('/discover')
              }
            }}
            onSubmit={() => {
              const normalizedQuery = query.trim()

              if (!normalizedQuery) {
                setQuery('')
                clearResults()
                navigate('/discover')
                return
              }

              void search(normalizedQuery)
              navigate(`/discover?q=${encodeURIComponent(normalizedQuery)}`)
            }}
            disabled={!isOnline || isLoading}
          />

          <div className="flex justify-end">
            <Badge
              className={cn(
                'border-transparent',
                isOnline ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300',
              )}
            >
              {isOnline ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'w-full px-3.5 pt-[5.35rem] sm:px-5 sm:pt-[5.6rem] md:pt-24 lg:h-screen lg:overflow-hidden lg:px-6 lg:pt-[7.1rem] xl:px-8 2xl:px-10',
          isExpandedPlayerPage
            ? 'pb-8 md:pb-10 lg:pb-8'
            : currentTrack
              ? 'pb-[8.8rem] sm:pb-[9.2rem] md:pb-48 lg:pb-[8.75rem]'
              : 'pb-[6.9rem] sm:pb-[7.3rem] md:pb-48 lg:pb-[8.75rem]',
        )}
      >
        <div
          className={cn(
            'lg:grid lg:h-full lg:min-h-0 lg:gap-6 transition-[grid-template-columns] duration-300 ease-in-out xl:gap-8',
            isRightPanelDragging ? 'lg:transition-none' : '',
          )}
          style={desktopGridStyle}
        >
          <aside
            className={cn('relative hidden lg:block lg:h-full lg:min-h-0', isExpandedPlayerPage && 'lg:hidden')}
            style={{ width: effectiveLeftSidebarWidth }}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-px bg-[#333333]" />
            <motion.div
              animate={{ width: effectiveLeftSidebarWidth }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="flex h-full min-h-0 flex-col gap-5 overflow-hidden pr-1"
            >
              <div className="shrink-0 space-y-4 border-b border-white/8 pb-5">
                <div className={cn('px-1', isLeftSidebarCollapsed ? 'flex justify-center' : '')}>
                  <button
                    type="button"
                    title={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    aria-label={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/45"
                    onClick={toggleLeftSidebarMode}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {sidebarIconCue ? (
                        <SidebarArrowIcon key={sidebarIconCue} direction={sidebarIconCue} />
                      ) : (
                        <SidebarHamburgerIcon key="hamburger" />
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <div className="space-y-2">
                  {desktopNavigationItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                    >
                      {({ isActive }) => (
                        <span
                          title={isLeftSidebarCollapsed ? item.label : undefined}
                          className={cn(
                            'inline-flex min-h-10 w-full items-center rounded-2xl border py-3 text-sm transition-colors',
                            isLeftSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4',
                            isActive
                              ? 'border-white/15 bg-white/8 text-text-primary'
                              : 'border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary',
                          )}
                        >
                          <item.icon className="size-4" />
                          {isLeftSidebarCollapsed ? null : item.label}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>

                <div className={cn('px-1', isLeftSidebarCollapsed ? 'flex justify-center' : '')}>
                  <button
                    type="button"
                    title="New Playlist"
                    aria-label="New Playlist"
                    className={cn(
                      'inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-text-primary transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/45',
                      isLeftSidebarCollapsed ? 'size-10 p-0' : 'w-full gap-2 px-4 py-2.5 text-sm font-semibold',
                    )}
                    onClick={() => setIsSidebarPlaylistDialogOpen(true)}
                  >
                    <Plus className="size-4 shrink-0" />
                    {isLeftSidebarCollapsed ? null : 'New Playlist'}
                  </button>
                </div>
              </div>

              <DesktopLibrarySidebarModule isCollapsed={isLeftSidebarCollapsed} />
            </motion.div>
          </aside>

          <div
            ref={contentScrollRef}
            className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-2 scrollbar-subtle scrollbar-fade"
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/collection/:collectionId" element={<ShelfCollectionPage />} />
                <Route path="/artist" element={<ArtistProfilePage />} />
                <Route path="/artist/:artistId" element={<ArtistProfilePage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/now-playing" element={<ExpandedPlayerPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>

          {showDesktopRailHost ? (
            <Suspense fallback={<RailFallback />}>
              {isRightPanelCompact ? (
                <div className="relative hidden lg:block lg:h-full lg:min-h-0" style={{ width: effectiveRightPanelWidth }}>
                  <CompactRightRail
                    currentTrack={currentTrack}
                    onOpenNowPlaying={expandRightPanel}
                  />
                  <button
                    type="button"
                    aria-label="Resize right panel"
                    title="Resize right panel"
                    className={cn(
                      'absolute inset-y-0 left-[-6px] z-20 hidden w-3 cursor-ew-resize lg:block',
                      isRightPanelDragging && 'cursor-grabbing',
                    )}
                    onPointerDown={(event) => {
                      rightPanelDragStateRef.current = {
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startWidth: effectiveRightPanelWidth,
                      }
                      setIsRightPanelDragging(true)
                      document.body.style.cursor = 'ew-resize'
                      document.body.style.userSelect = 'none'
                    }}
                  >
                    <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-white/0 transition-colors hover:bg-white/18" />
                  </button>
                </div>
              ) : desktopRightRailMode === 'queue' ? (
                <div className="relative hidden lg:block lg:h-full lg:min-h-0" style={{ width: effectiveRightPanelWidth }}>
                  <QueuePanel />
                  <button
                    type="button"
                    aria-label="Resize right panel"
                    title="Resize right panel"
                    className={cn(
                      'absolute inset-y-0 left-[-6px] z-20 hidden w-3 cursor-ew-resize lg:block',
                      isRightPanelDragging && 'cursor-grabbing',
                    )}
                    onPointerDown={(event) => {
                      rightPanelDragStateRef.current = {
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startWidth: effectiveRightPanelWidth,
                      }
                      setIsRightPanelDragging(true)
                      document.body.style.cursor = 'ew-resize'
                      document.body.style.userSelect = 'none'
                    }}
                  >
                    <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-white/0 transition-colors hover:bg-white/18" />
                  </button>
                </div>
              ) : desktopRightRailMode === 'now_playing' ? (
                <div className="relative hidden lg:block lg:h-full lg:min-h-0" style={{ width: effectiveRightPanelWidth }}>
                  <NowPlayingPanel />
                  <button
                    type="button"
                    aria-label="Resize right panel"
                    title="Resize right panel"
                    className={cn(
                      'absolute inset-y-0 left-[-6px] z-20 hidden w-3 cursor-ew-resize lg:block',
                      isRightPanelDragging && 'cursor-grabbing',
                    )}
                    onPointerDown={(event) => {
                      rightPanelDragStateRef.current = {
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startWidth: effectiveRightPanelWidth,
                      }
                      setIsRightPanelDragging(true)
                      document.body.style.cursor = 'ew-resize'
                      document.body.style.userSelect = 'none'
                    }}
                  >
                    <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-white/0 transition-colors hover:bg-white/18" />
                  </button>
                </div>
              ) : (
                <div className="relative hidden lg:block lg:h-full lg:min-h-0" style={{ width: effectiveRightPanelWidth }}>
                  <CompactRightRail
                    currentTrack={currentTrack}
                    onOpenNowPlaying={expandRightPanel}
                  />
                </div>
              )}
            </Suspense>
          ) : null}
        </div>
      </main>

      <AddToPlaylistDialog
        open={isSidebarPlaylistDialogOpen}
        onOpenChange={setIsSidebarPlaylistDialogOpen}
      />

      {!isExpandedPlayerPage ? <BottomPlayer /> : null}
      <ToastViewport />
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 border-t border-white/6 bg-app-bg/92 px-2.5 py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] backdrop-blur-xl md:hidden',
          isExpandedPlayerPage && 'hidden',
        )}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2">
          {mobileNavigationItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-[1.1rem] border px-3 py-1.5 text-[0.72rem] transition-colors',
                    isActive
                      ? 'border-white/12 bg-white/8 text-text-primary'
                      : 'border-transparent text-text-secondary',
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
