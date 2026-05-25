import type { CSSProperties } from 'react'
import { Headphones, Library, Radio, Wifi, WifiOff } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SearchBar } from '@/features/discover/components/search-bar'
import { useDiscoverStore } from '@/features/discover/store/use-discover-store'
import { DiscoverPage } from '@/features/discover/pages/discover-page'
import { LibraryPage } from '@/features/library/pages/library-page'
import { BottomPlayer } from '@/features/player/components/bottom-player'
import { NowPlayingPanel } from '@/features/player/components/now-playing-panel'
import { ExpandedPlayerPage } from '@/features/player/pages/expanded-player-page'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

const navigationItems = [
  { to: '/', label: 'Discover', icon: Radio },
  { to: '/library', label: 'Library', icon: Library },
]

export function AppShell() {
  const location = useLocation()
  const currentMood = usePlayerStore((state) => state.currentMood)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const query = useDiscoverStore((state) => state.query)
  const setQuery = useDiscoverStore((state) => state.setQuery)
  const search = useDiscoverStore((state) => state.search)
  const isLoading = useDiscoverStore((state) => state.isLoading)

  const moodToken = moodTheme[currentMood]
  const moodStyle = {
    '--mood-accent': moodToken.accent,
    '--mood-background': moodToken.background,
    '--mood-text': moodToken.text,
  } as CSSProperties
  const isExpandedPlayerPage = location.pathname === '/now-playing'
  const showDesktopNowPlayingPanel = Boolean(currentTrack) && !isExpandedPlayerPage

  return (
    <div style={moodStyle} className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--mood-accent)_14%,transparent),transparent_34%)]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-app-bg/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[108rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:hidden lg:px-8">
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

          <div className="hidden items-center gap-2 md:flex">
            {navigationItems.map((item) => (
              <NavLink key={item.to} to={item.to}>
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

        <div className="mx-auto hidden max-w-[108rem] items-center gap-6 px-6 py-4 lg:grid lg:grid-cols-[14rem_minmax(34rem,52rem)_10rem] xl:grid-cols-[14rem_minmax(38rem,56rem)_10rem]">
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

          {isExpandedPlayerPage ? (
            <div className="editorial-panel flex min-h-14 items-center justify-center rounded-full px-4 py-2">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-text-muted">Expanded player</p>
            </div>
          ) : (
            <SearchBar
              compact
              className="editorial-panel mx-auto w-full max-w-[52rem] rounded-full px-3 py-2 xl:max-w-[56rem]"
              query={query}
              onQueryChange={(value) => {
                setQuery(value)
              }}
              onSubmit={() => {
                void search(query)
              }}
              disabled={!isOnline || isLoading}
            />
          )}

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
          'mx-auto max-w-[108rem] px-4 pt-24 sm:px-6 lg:px-6 lg:pt-[7.1rem]',
          isExpandedPlayerPage ? 'pb-8 md:pb-10' : 'pb-72 md:pb-48',
        )}
      >
        <div
          className={cn(
            !isExpandedPlayerPage &&
              (showDesktopNowPlayingPanel
                ? 'lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_minmax(29rem,34rem)] lg:gap-6 xl:grid-cols-[12rem_minmax(0,1fr)_minmax(31rem,36rem)] xl:gap-7'
                : 'lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-6'),
          )}
        >
          <aside className={cn('hidden lg:block', isExpandedPlayerPage && 'lg:hidden')}>
            <div className="sticky top-[7.2rem] space-y-2">
              {navigationItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
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

          <div className="min-w-0">
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/now-playing" element={<ExpandedPlayerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {showDesktopNowPlayingPanel ? <NowPlayingPanel /> : null}
        </div>
      </main>

      {!isExpandedPlayerPage ? <BottomPlayer /> : null}
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 border-t border-white/6 bg-app-bg/92 px-3 py-2 backdrop-blur-xl md:hidden',
          isExpandedPlayerPage && 'hidden',
        )}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-xs transition-colors',
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
