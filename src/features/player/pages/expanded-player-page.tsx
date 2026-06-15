import { Heart, Maximize2, Minimize2, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { TrackActionMenu } from '@/entities/track/ui/track-action-menu'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { ArtistMediaBlock } from '@/features/player/components/artist-media-block'
import { DesktopVolumeControl } from '@/features/player/components/desktop-volume-control'
import { UpNextList } from '@/features/player/components/up-next-list'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { seekAudio } from '@/lib/audio/audio-controller'
import { getArtistProfile } from '@/lib/jamendo/artist-service'
import { moodTheme } from '@/shared/constants/mood-theme'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn, formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'

interface ExpandedPlayerLocationState {
  from?: string
}

function IconHintButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex size-10 items-center justify-center rounded-full border border-white/18 bg-white/8 text-text-primary transition-colors hover:bg-white/14 hover:text-white',
        className,
      )}
      aria-label={label}
    >
      {children}
      <span className="pointer-events-none absolute -bottom-10 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block">
        {label}
      </span>
    </button>
  )
}

export function ExpandedPlayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const currentTrackId = currentTrack?.id ?? null
  const currentMood = usePlayerStore((state) => state.currentMood)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const isShuffleEnabled = usePlayerStore((state) => state.isShuffleEnabled)
  const repeatMode = usePlayerStore((state) => state.repeatMode)
  const queue = usePlayerStore((state) => state.queue)
  const queueIndex = usePlayerStore((state) => state.queueIndex)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const nextTrack = usePlayerStore((state) => state.nextTrack)
  const previousTrack = usePlayerStore((state) => state.previousTrack)
  const seekTo = usePlayerStore((state) => state.seekTo)
  const playTrack = usePlayerStore((state) => state.playTrack)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const removeFromQueueAt = usePlayerStore((state) => state.removeFromQueueAt)

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isCurrentFavorite = useFavoritesStore((state) =>
    currentTrackId ? state.favorites.some((favorite) => favorite.id === currentTrackId) : false,
  )

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoadingArtist, setIsLoadingArtist] = useState(false)
  const [isFullscreenActive, setIsFullscreenActive] = useState(false)
  const [isFullscreenChromeVisible, setIsFullscreenChromeVisible] = useState(true)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const moodToken = moodTheme[currentMood]
  const resolvedDuration = duration || currentTrack?.duration || 0
  const hasNextTrack =
    Boolean(queue?.tracks[queueIndex + 1]) || Boolean((isShuffleEnabled || repeatMode === 'all') && queue && queue.tracks.length > 1)
  const hasPreviousTrack = Boolean(queue?.tracks[queueIndex - 1]) || repeatMode === 'all'
  const fromState = location.state as ExpandedPlayerLocationState | null
  const returnPath =
    fromState?.from && fromState.from !== '/now-playing' ? fromState.from : queue?.source === 'library' ? '/library' : '/'

  useEffect(() => {
    let isActive = true

    if (!currentTrack) {
      return () => {
        isActive = false
      }
    }

    void (async () => {
      if (!isActive) {
        return
      }

      setArtistProfile(null)
      setIsLoadingArtist(true)

      const profile = await getArtistProfile(currentTrack)

      if (!isActive) {
        return
      }

      setArtistProfile(profile)
      setIsLoadingArtist(false)
    })()

    return () => {
      isActive = false
    }
  }, [currentTrack])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextState = document.fullscreenElement === fullscreenRef.current
      setIsFullscreenActive(nextState)
      setIsFullscreenChromeVisible(true)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isFullscreenActive) {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
      return
    }

    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }

    idleTimeoutRef.current = setTimeout(() => {
      setIsFullscreenChromeVisible(false)
    }, 3000)
  }, [isFullscreenActive, currentTrack?.id])

  if (!currentTrack) {
    return (
      <EmptyState
        title="Nothing is playing yet"
        description="Start a session from Discover or Library, then reopen the Expanded Player for the focused listening view."
        action={
          <Button type="button" variant="secondary" size="sm" asChild>
            <Link to="/discover">Go to Discover</Link>
          </Button>
        }
      />
    )
  }

  const handleSeek = (nextTime: number) => {
    seekAudio(nextTime)
    seekTo(nextTime)
  }

  const handleSelectQueueTrack = (track: Track) => {
    if (!queue) {
      return
    }

    if (track.id === currentTrack.id) {
      togglePlay()
      return
    }

    playTrack(track, queue)
  }

  const handleQueueArtist = (track: Track) => {
    if (queue && track.id !== currentTrack.id) {
      playTrack(track, queue)
    }
  }

  const handleShareQueueTrack = async (track: Track) => {
    if (!track.shareUrl) {
      return
    }

    await copyTextToClipboard(track.shareUrl)
  }

  const desktopControlButtonClass = (isActive = false) =>
    isActive
      ? 'border-[color:var(--mood-accent)]/40 bg-[color:var(--mood-accent)]/12 text-text-primary'
      : 'border border-border-subtle'

  const handleToggleFullscreen = async () => {
    if (!fullscreenRef.current) {
      return
    }

    try {
      if (document.fullscreenElement === fullscreenRef.current) {
        await document.exitFullscreen()
      } else {
        await fullscreenRef.current.requestFullscreen()
      }
    } catch {
      setIsFullscreenActive(false)
    }
  }

  const revealFullscreenChrome = () => {
    if (!isFullscreenActive) {
      return
    }

    setIsFullscreenChromeVisible(true)
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }
    idleTimeoutRef.current = setTimeout(() => {
      setIsFullscreenChromeVisible(false)
    }, 3000)
  }

  const shareContext =
    typeof window !== 'undefined'
      ? {
          label: 'player link',
          title: `${currentTrack.name} on Tonaliz Lite`,
          url: `${window.location.origin}/now-playing`,
        }
      : null

  const playbackStrip = (
    <div
      className={cn(
        'editorial-panel mood-glow overflow-hidden rounded-[1.7rem] border-white/8 px-4 py-4 sm:px-5',
        isFullscreenActive && 'w-full max-w-5xl',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <img src={currentTrack.imageUrl} alt={`${currentTrack.name} artwork`} className="size-16 rounded-[1rem] object-cover" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="border-transparent"
                style={{
                  background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0,0,0,0.45))`,
                  color: moodToken.text,
                }}
              >
                {moodToken.label}
              </Badge>
              <Badge>{queue?.source ?? 'discover'}</Badge>
            </div>
            <h3 className="mt-2 line-clamp-1 font-heading text-2xl text-text-primary">{currentTrack.name}</h3>
            <p className="mt-1 line-clamp-1 text-sm text-text-secondary">
              {currentTrack.artistName}
              {currentTrack.genre ? ` / ${currentTrack.genre}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={desktopControlButtonClass(isShuffleEnabled)}
              onClick={toggleShuffle}
              aria-pressed={isShuffleEnabled}
              aria-label={isShuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
            >
              <Shuffle className="size-4" />
            </Button>
            <Button type="button" size="icon" variant="secondary" onClick={previousTrack} disabled={!hasPreviousTrack}>
              <StepBack className="size-4" />
            </Button>
            <Button type="button" size="icon" className="size-12 rounded-full" onClick={togglePlay}>
              {isPlaying ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
            </Button>
            <Button type="button" size="icon" variant="secondary" onClick={nextTrack} disabled={!hasNextTrack}>
              <StepForward className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={desktopControlButtonClass(repeatMode !== 'off')}
              onClick={cycleRepeatMode}
              aria-label={
                repeatMode === 'off'
                  ? 'Enable repeat queue'
                  : repeatMode === 'all'
                    ? 'Enable repeat one'
                    : 'Disable repeat'
              }
            >
              <span className="relative flex items-center justify-center">
                <Repeat className="size-4" />
                {repeatMode === 'one' ? (
                  <span className="absolute -right-1.5 -top-1.5 text-[0.6rem] font-semibold text-primary-soft">1</span>
                ) : null}
              </span>
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-[0.72rem] text-text-muted sm:text-xs">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(resolvedDuration)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={resolvedDuration || 0}
              step={1}
              value={Math.min(currentTime, resolvedDuration || 0)}
              onChange={(event) => {
                handleSeek(Number(event.target.value))
              }}
              className="h-2 w-full cursor-pointer accent-[var(--mood-accent)]"
              aria-label="Track progress"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:justify-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="border border-border-subtle"
            onClick={() => {
              void toggleFavorite(currentTrack)
            }}
            aria-label={isCurrentFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Heart className={isCurrentFavorite ? 'size-4 fill-current text-primary-soft' : 'size-4'} />
          </Button>

          <div className="hidden lg:block">
            <DesktopVolumeControl />
          </div>
        </div>
      </div>
    </div>
  )

  if (isFullscreenActive) {
    return (
      <div
        ref={fullscreenRef}
        className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_28%,transparent),transparent_42%),#09070c]"
        onMouseMove={revealFullscreenChrome}
        onPointerMove={revealFullscreenChrome}
      >
        <div
          className={cn(
            'absolute right-6 top-6 z-30 flex items-center gap-2 transition-all duration-500',
            isFullscreenChromeVisible ? 'opacity-100' : 'pointer-events-none -translate-y-4 opacity-0',
          )}
        >
          <TrackActionMenu
            track={currentTrack}
            onPlayNext={playNextInQueue}
            onAddToQueue={addToQueue}
            isFavorite={isCurrentFavorite}
            onToggleFavorite={() => {
              void toggleFavorite(currentTrack)
            }}
            shareContext={shareContext}
            triggerClassName="border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
            menuClassName="top-12"
          />
          <IconHintButton label="Exit fullscreen" onClick={() => void handleToggleFullscreen()}>
            <Minimize2 className="size-4" />
          </IconHintButton>
        </div>

        <div className="flex min-h-screen items-center justify-center px-6 py-10">
          <img
            src={currentTrack.imageUrl}
            alt={`${currentTrack.name} artwork`}
            className="max-h-[62vh] w-auto max-w-[min(86vw,42rem)] rounded-[2rem] object-cover shadow-[0_28px_70px_rgba(0,0,0,0.48)]"
          />
        </div>

        <div
          className={cn(
            'absolute bottom-32 right-6 z-20 hidden w-[22rem] transition-all duration-500 lg:block',
            isFullscreenChromeVisible ? 'opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
          )}
        >
          <ArtistMediaBlock
            artistName={currentTrack.artistName}
            artistProfile={artistProfile}
            isLoading={isLoadingArtist}
            isOnline={isOnline}
            featured
          />
        </div>

        <div
          className={cn(
            'absolute inset-x-0 bottom-6 z-20 flex justify-center px-6 transition-all duration-500',
            isFullscreenChromeVisible ? 'opacity-100' : 'pointer-events-none translate-y-8 opacity-0',
          )}
        >
          {playbackStrip}
        </div>
      </div>
    )
  }

  return (
    <div ref={fullscreenRef} className="relative space-y-6 lg:min-h-full">
      <section className="editorial-panel rounded-[2rem] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="mt-2 font-heading text-3xl text-text-primary sm:text-4xl">Focused playback view</h1>
          </div>

          <div className="flex items-center gap-2">
            <TrackActionMenu
              track={currentTrack}
              onPlayNext={playNextInQueue}
              onAddToQueue={addToQueue}
              isFavorite={isCurrentFavorite}
              onToggleFavorite={() => {
                void toggleFavorite(currentTrack)
              }}
              shareContext={shareContext}
              triggerClassName="border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
              menuClassName="top-12"
            />
            <IconHintButton label="Fullscreen" onClick={() => void handleToggleFullscreen()}>
              <Maximize2 className="size-4" />
            </IconHintButton>
            <IconHintButton label="Minimize view" onClick={() => navigate(returnPath)}>
              <Minimize2 className="size-4" />
            </IconHintButton>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_22%,transparent),transparent_58%)] px-5 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-center lg:gap-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border-transparent"
                    style={{
                      background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0,0,0,0.45))`,
                      color: moodToken.text,
                    }}
                  >
                    {moodToken.label}
                  </Badge>
                  <Badge>{queue?.source ?? 'discover'}</Badge>
                  {!isOnline ? <Badge className="bg-red-500/10 text-red-300">Offline</Badge> : null}
                </div>

                <div className="mt-5 max-w-3xl">
                  <h2 className="font-heading text-3xl leading-tight text-text-primary sm:text-5xl">
                    {currentTrack.name}
                  </h2>
                  <p className="mt-3 text-sm text-text-secondary sm:text-base">
                    {currentTrack.artistName}
                    {currentTrack.genre ? ` / ${currentTrack.genre}` : ''}
                  </p>
                </div>

                <div className="mt-5">
                  <ArtistMediaBlock
                    artistName={currentTrack.artistName}
                    artistProfile={artistProfile}
                    isLoading={isLoadingArtist}
                    isOnline={isOnline}
                    className="max-w-3xl"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center lg:mt-0 lg:justify-end">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="aspect-square w-full max-w-[min(48vw,22rem)] rounded-[1.8rem] object-cover shadow-[0_28px_70px_rgba(0,0,0,0.48)]"
                />
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl">{playbackStrip}</div>

          <div className="mx-auto w-full max-w-6xl">
            <UpNextList
              queue={queue}
              queueIndex={queueIndex}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectQueueTrack}
              onToggleCurrent={togglePlay}
              onRemoveFromQueue={removeFromQueueAt}
              onToggleFavorite={(track) => {
                void toggleFavorite(track)
              }}
              onGoToArtist={handleQueueArtist}
              onShareTrack={(track) => {
                void handleShareQueueTrack(track)
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
