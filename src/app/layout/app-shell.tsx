import type { CSSProperties } from 'react'
import { Headphones, Home, Library, Radio, Wifi, WifiOff } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArtistProfilePage } from '@/features/artist/pages/artist-profile-page'
import { HomePage } from '@/features/home/pages/home-page'
import { SearchBar } from '@/features/discover/components/search-bar'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { DiscoverPage } from '@/features/discover/pages/discover-page'
import { LibraryPage } from '@/features/library/pages/library-page'
import { BottomPlayer } from '@/features/player/components/bottom-player'
import { NowPlayingPanel } from '@/features/player/components/now-playing-panel'
import { QueuePanel } from '@/features/player/components/queue-panel'
import { DesktopRailToggle } from '@/features/player/components/desktop-rail-toggle'
import { ExpandedPlayerPage } from '@/features/player/pages/expanded-player-page'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

const navigationItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Radio },
  { to: '/library', label: 'Library', icon: Library },
]

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentMood = usePlayerStore((state) => state.currentMood)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const desktopRightRailMode = usePlayerStore((state) => state.desktopRightRailMode)
  const openNowPlayingRail = usePlayerStore((state) => state.openNowPlayingRail)
  const query = useDiscoverStore((state) => state.query)
  const setQuery = useDiscoverStore((state) => state.setQuery)
  const search = useDiscoverStore((state) => state.search)
  const clearResults = useDiscoverStore((state) => state.clearResults)
  const isLoading = useDiscoverStore((state) => state.isLoading)

  const moodToken = moodTheme[currentMood]
  const moodStyle = {
    '--mood-accent': moodToken.accent,
    '--mood-background': moodToken.background,
    '--mood-text': moodToken.text,
  } as CSSProperties
  const isExpandedPlayerPage = location.pathname === '/now-playing'
  const showDesktopRailHost = Boolean(currentTrack) && !isExpandedPlayerPage

  return (
    <div style={moodStyle} className="relative min-h-screen overflow-x-hidden lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--mood-accent)_14%,transparent),transparent_34%)]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-app-bg/88 backdrop-blur-xl">
        <div className="space-y-2.5 px-3.5 py-3 sm:px-5 sm:py-3.5 lg:hidden lg:px-8">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/10 bg-black/30">
                <Headphones className="size-[1.05rem] text-primary-soft" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-lg tracking-tight text-text-primary">Tonaliz Lite</p>
                <p className="truncate font-mono text-[0.58rem] uppercase tracking-[0.16em] text-text-muted">
                  independent music discovery
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {navigationItems.map((item) => (
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

          <SearchBar
            compact
            className="editorial-panel w-full rounded-[1.45rem] px-2.5 py-1.5"
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
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
        </div>

        <div className="hidden w-full items-center gap-6 px-6 py-4 lg:grid lg:grid-cols-[14rem_minmax(26rem,42rem)_8rem] lg:justify-between xl:grid-cols-[14rem_minmax(30rem,46rem)_8rem] 2xl:grid-cols-[15rem_minmax(34rem,50rem)_8rem] 2xl:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
              <Headphones className="size-5 text-primary-soft" />
            </div>
            <div>
              <p className="font-heading text-xl tracking-tight text-text-primary">Tonaliz Lite</p>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-text-muted">
                independent music discovery
              </p>
            </div>
          </div>

          <SearchBar
            compact
            className="editorial-panel mx-auto w-full max-w-[52rem] rounded-full px-3 py-2 xl:max-w-[56rem]"
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
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
          'w-full px-3.5 pt-28 sm:px-5 sm:pt-[7.4rem] md:pt-36 lg:h-screen lg:overflow-hidden lg:px-6 lg:pt-[7.1rem] xl:px-8 2xl:px-10',
          isExpandedPlayerPage
            ? 'pb-8 md:pb-10 lg:pb-8'
            : currentTrack
              ? 'pb-[8.8rem] sm:pb-[9.2rem] md:pb-48 lg:pb-[8.75rem]'
              : 'pb-[6.9rem] sm:pb-[7.3rem] md:pb-48 lg:pb-[8.75rem]',
        )}
      >
        <div
          className={cn(
            'lg:h-full lg:min-h-0',
            !isExpandedPlayerPage &&
              (showDesktopRailHost
                ? desktopRightRailMode === 'closed'
                  ? 'lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)_2.75rem] lg:gap-6 xl:grid-cols-[13rem_minmax(0,1fr)_2.75rem] xl:gap-8'
                  : 'lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)_minmax(24rem,28vw)] lg:gap-6 xl:grid-cols-[13rem_minmax(0,1fr)_minmax(26rem,30vw)] xl:gap-8 2xl:grid-cols-[13rem_minmax(0,1fr)_minmax(28rem,32vw)]'
                : 'lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-6 xl:gap-8'),
          )}
        >
          <aside className={cn('hidden lg:block lg:h-full', isExpandedPlayerPage && 'lg:hidden')}>
            <div className="sticky top-[7.2rem] space-y-2">
              {navigationItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end}>
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'inline-flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors',
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
          </aside>

          <div className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-2 scrollbar-subtle scrollbar-fade">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/artist" element={<ArtistProfilePage />} />
              <Route path="/artist/:artistId" element={<ArtistProfilePage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/now-playing" element={<ExpandedPlayerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {showDesktopRailHost ? (
            desktopRightRailMode === 'queue' ? (
              <QueuePanel />
            ) : desktopRightRailMode === 'now_playing' ? (
              <NowPlayingPanel />
            ) : (
              <aside className="relative hidden lg:flex lg:h-full lg:min-h-0">
                <DesktopRailToggle variant="closed-bar" onClick={openNowPlayingRail} />
              </aside>
            )
          ) : null}
        </div>
      </main>

      {!isExpandedPlayerPage ? <BottomPlayer /> : null}
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 border-t border-white/6 bg-app-bg/92 px-2.5 py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] backdrop-blur-xl md:hidden',
          isExpandedPlayerPage && 'hidden',
        )}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2">
          {navigationItems.map((item) => (
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
