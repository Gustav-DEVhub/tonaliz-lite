import { Heart, Minimize2, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { ArtistMediaBlock } from '@/features/player/components/artist-media-block'
import { DesktopVolumeControl } from '@/features/player/components/desktop-volume-control'
import { UpNextList } from '@/features/player/components/up-next-list'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { seekAudio } from '@/lib/audio/audio-controller'
import { getArtistProfile } from '@/lib/jamendo/artist-service'
import { moodTheme } from '@/shared/constants/mood-theme'
import { formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'

interface ExpandedPlayerLocationState {
  from?: string
}

export function ExpandedPlayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentTrack = usePlayerStore((state) => state.currentTrack)
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

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isFavorite = useFavoritesStore((state) => state.isFavorite)

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoadingArtist, setIsLoadingArtist] = useState(false)

  const moodToken = moodTheme[currentMood]
  const resolvedDuration = duration || currentTrack?.duration || 0
  const hasNextTrack =
    Boolean(queue?.tracks[queueIndex + 1]) ||
    Boolean(isShuffleEnabled && queue && queue.tracks.length > 1) ||
    repeatMode === 'all'
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

  if (!currentTrack) {
    return (
      <EmptyState
        title="Nothing is playing yet"
        description="Start a session from Discover or Library, then reopen the Expanded Player for the focused listening view."
        action={
          <Button type="button" variant="secondary" size="sm" asChild>
            <Link to="/">Go to Discover</Link>
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

  const desktopControlButtonClass = (isActive = false) =>
    isActive
      ? 'border-[color:var(--mood-accent)]/40 bg-[color:var(--mood-accent)]/12 text-text-primary'
      : 'border border-border-subtle'

  return (
    <div className="space-y-6">
      <section className="editorial-panel rounded-[2rem] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Expanded player</p>
            <h1 className="mt-2 font-heading text-3xl text-text-primary sm:text-4xl">Focused playback view</h1>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
            onClick={() => {
              navigate(returnPath)
            }}
          >
            <Minimize2 className="size-4" />
            Minimize
          </Button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_22%,transparent),transparent_58%)] px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
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

              <div className="mt-5 flex justify-center">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="aspect-square w-full max-w-[26rem] rounded-[1.8rem] object-cover shadow-[0_28px_70px_rgba(0,0,0,0.48)]"
                />
              </div>

              <div className="mx-auto mt-5 max-w-3xl text-center">
                <h2 className="font-heading text-4xl leading-tight text-text-primary sm:text-[3.5rem]">
                  {currentTrack.name}
                </h2>
                <p className="mt-3 text-sm text-text-secondary sm:text-base">
                  {currentTrack.artistName}
                  {currentTrack.genre ? ` / ${currentTrack.genre}` : ''}
                </p>
              </div>

              <ArtistMediaBlock
                artistName={currentTrack.artistName}
                artistProfile={artistProfile}
                isLoading={isLoadingArtist}
                isOnline={isOnline}
                className="mx-auto mt-6 max-w-3xl"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl">
            <div className="editorial-panel mood-glow overflow-hidden rounded-[1.7rem] border-white/8 px-4 py-4 sm:px-5">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={currentTrack.imageUrl}
                    alt={`${currentTrack.name} artwork`}
                    className="size-16 rounded-[1rem] object-cover"
                  />

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
                      className={`hidden lg:inline-flex ${desktopControlButtonClass(isShuffleEnabled)}`}
                      onClick={toggleShuffle}
                      aria-pressed={isShuffleEnabled}
                      aria-label={isShuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
                    >
                      <Shuffle className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={previousTrack}
                      disabled={!hasPreviousTrack}
                    >
                      <StepBack className="size-4" />
                    </Button>
                    <Button type="button" size="icon" className="size-12 rounded-full" onClick={togglePlay}>
                      {isPlaying ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={nextTrack}
                      disabled={!hasNextTrack}
                    >
                      <StepForward className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={`hidden lg:inline-flex ${desktopControlButtonClass(repeatMode !== 'off')}`}
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
                          <span className="absolute -right-1.5 -top-1.5 text-[0.6rem] font-semibold text-primary-soft">
                            1
                          </span>
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
                  <div className="hidden text-right lg:block">
                    <p className="text-xs text-text-muted">
                      Track {queueIndex + 1}
                      {queue ? ` / ${queue.tracks.length}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">{formatDuration(resolvedDuration)}</p>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="border border-border-subtle"
                    onClick={() => {
                      void toggleFavorite(currentTrack)
                    }}
                    aria-label={isFavorite(currentTrack.id) ? 'Remove favorite' : 'Add favorite'}
                  >
                    <Heart className={isFavorite(currentTrack.id) ? 'size-4 fill-current text-primary-soft' : 'size-4'} />
                  </Button>

                  <div className="hidden lg:block">
                    <DesktopVolumeControl />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <UpNextList
        queue={queue}
        queueIndex={queueIndex}
        currentTrackId={currentTrack.id}
        isPlaying={isPlaying}
        onSelectTrack={handleSelectQueueTrack}
      />
    </div>
  )
}
