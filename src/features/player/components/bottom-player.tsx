import { Heart, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { DesktopVolumeControl } from '@/features/player/components/desktop-volume-control'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { seekAudio } from '@/lib/audio/audio-controller'
import { moodTheme } from '@/shared/constants/mood-theme'
import { formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function BottomPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const isShuffleEnabled = usePlayerStore((state) => state.isShuffleEnabled)
  const repeatMode = usePlayerStore((state) => state.repeatMode)
  const queue = usePlayerStore((state) => state.queue)
  const queueIndex = usePlayerStore((state) => state.queueIndex)
  const currentMood = usePlayerStore((state) => state.currentMood)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const nextTrack = usePlayerStore((state) => state.nextTrack)
  const previousTrack = usePlayerStore((state) => state.previousTrack)
  const seekTo = usePlayerStore((state) => state.seekTo)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode)

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isFavorite = useFavoritesStore((state) => state.isFavorite)

  const moodToken = moodTheme[currentMood]
  const hasNextTrack =
    Boolean(queue?.tracks[queueIndex + 1]) ||
    Boolean(isShuffleEnabled && queue && queue.tracks.length > 1) ||
    repeatMode === 'all'
  const hasPreviousTrack = Boolean(queue?.tracks[queueIndex - 1]) || repeatMode === 'all'
  const resolvedDuration = duration || currentTrack?.duration || 0

  const handleSeek = (nextTime: number) => {
    seekAudio(nextTime)
    seekTo(nextTime)
  }

  const progressSlider = (
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
  )

  const desktopControlButtonClass = (isActive = false) =>
    isActive
      ? 'border-[color:var(--mood-accent)]/40 bg-[color:var(--mood-accent)]/12 text-text-primary'
      : 'border border-border-subtle'

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-3 md:bottom-0 md:px-4">
      <div className="editorial-panel mood-glow mx-auto max-w-7xl overflow-hidden rounded-[1.45rem] border-white/8 px-3 py-3 sm:px-4 sm:py-4">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

        {!currentTrack ? (
          <div className="flex min-h-20 flex-col justify-center gap-2 md:min-h-24">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-text-muted">Bottom player</p>
            <p className="font-heading text-xl text-text-primary md:text-2xl">Pick a track to start the session.</p>
            <p className="hidden max-w-2xl text-sm text-text-secondary md:block">
              Tonaliz Lite keeps the player persistent across Discover and Library so playback stays central to
              the product.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[0.72rem] text-text-muted sm:text-xs">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(resolvedDuration)}</span>
                </div>
                {progressSlider}
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="size-13 rounded-[1rem] object-cover"
                />
                <div className="min-w-0 flex-1">
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
                  <h2 className="mt-2 line-clamp-1 font-heading text-lg leading-tight text-text-primary">
                    {currentTrack.name}
                  </h2>
                  <p className="mt-0.5 line-clamp-1 text-sm text-text-secondary">{currentTrack.artistName}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-border-subtle p-2 text-text-secondary transition-colors hover:text-text-primary"
                  onClick={() => {
                    void toggleFavorite(currentTrack)
                  }}
                  aria-label={isFavorite(currentTrack.id) ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart
                    className={isFavorite(currentTrack.id) ? 'size-4 fill-current text-primary-soft' : 'size-4'}
                  />
                </button>
              </div>

              <div className="-mt-1 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={previousTrack}
                  disabled={!hasPreviousTrack}
                >
                  <StepBack className="size-4" />
                </Button>
                <Button type="button" size="icon" className="size-11 rounded-full" onClick={togglePlay}>
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
              </div>
            </div>

            <div className="hidden grid-cols-[minmax(0,19rem)_minmax(0,1fr)_auto] items-center gap-5 md:grid">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="size-[4rem] rounded-[1rem] object-cover"
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
                  <h2 className="mt-2 line-clamp-1 font-heading text-xl leading-tight text-text-primary">
                    {currentTrack.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                    <span className="line-clamp-1">{currentTrack.artistName}</span>
                    <span className="text-text-muted">/</span>
                    <span className="truncate">{currentTrack.genre ?? 'independent release'}</span>
                  </div>
                </div>
              </div>

              <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
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
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={previousTrack}
                    disabled={!hasPreviousTrack}
                  >
                    <StepBack className="size-4" />
                  </Button>
                  <Button type="button" size="icon" className="size-11 rounded-full" onClick={togglePlay}>
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
                        <span className="absolute -right-1.5 -top-1.5 text-[0.6rem] font-semibold text-primary-soft">
                          1
                        </span>
                      ) : null}
                    </span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[0.72rem] text-text-muted">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(resolvedDuration)}</span>
                  </div>
                  {progressSlider}
                </div>
              </div>

              <div className="flex items-center gap-2">
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

                <DesktopVolumeControl />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
