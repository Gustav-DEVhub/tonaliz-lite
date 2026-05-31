import { Heart, PanelRightClose, PanelRightOpen, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { useState } from 'react'
import { DesktopVolumeControl } from '@/features/player/components/desktop-volume-control'
import { MobileExpandedPlayer } from '@/features/player/components/mobile-expanded-player'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { seekAudio } from '@/lib/audio/audio-controller'
import { moodTheme } from '@/shared/constants/mood-theme'
import { formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function BottomPlayer() {
  const [isMobileExpandedOpen, setIsMobileExpandedOpen] = useState(false)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const isShuffleEnabled = usePlayerStore((state) => state.isShuffleEnabled)
  const repeatMode = usePlayerStore((state) => state.repeatMode)
  const queue = usePlayerStore((state) => state.queue)
  const queueIndex = usePlayerStore((state) => state.queueIndex)
  const currentMood = usePlayerStore((state) => state.currentMood)
  const desktopRightRailMode = usePlayerStore((state) => state.desktopRightRailMode)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const nextTrack = usePlayerStore((state) => state.nextTrack)
  const previousTrack = usePlayerStore((state) => state.previousTrack)
  const seekTo = usePlayerStore((state) => state.seekTo)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode)
  const toggleQueueRail = usePlayerStore((state) => state.toggleQueueRail)

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isFavorite = useFavoritesStore((state) => state.isFavorite)

  const moodToken = moodTheme[currentMood]
  const hasNextTrack =
    Boolean(queue?.tracks[queueIndex + 1]) || Boolean((isShuffleEnabled || repeatMode === 'all') && queue && queue.tracks.length > 1)
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
  const mobileProgress = resolvedDuration > 0 ? Math.min((currentTime / resolvedDuration) * 100, 100) : 0

  return (
    <>
      <MobileExpandedPlayer
        open={isMobileExpandedOpen && Boolean(currentTrack)}
        onClose={() => setIsMobileExpandedOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={resolvedDuration}
        currentMood={currentMood}
        hasNextTrack={hasNextTrack}
        hasPreviousTrack={hasPreviousTrack}
        isShuffleEnabled={isShuffleEnabled}
        repeatMode={repeatMode}
        isFavorite={currentTrack ? isFavorite(currentTrack.id) : false}
        onTogglePlay={togglePlay}
        onNext={nextTrack}
        onPrevious={previousTrack}
        onToggleShuffle={toggleShuffle}
        onCycleRepeatMode={cycleRepeatMode}
        onToggleFavorite={() => {
          if (!currentTrack) {
            return
          }

          void toggleFavorite(currentTrack)
        }}
        onSeek={handleSeek}
      />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-2.5 md:bottom-0 md:px-4 lg:px-6 xl:px-8 2xl:px-10">
      <div className="editorial-panel mood-glow relative w-full overflow-hidden rounded-[1.1rem] border-white/8 px-3 py-2 sm:rounded-[1.35rem] sm:px-4 sm:py-4">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)] md:hidden" />
        {currentTrack ? (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-white/8 md:hidden">
            <div
              className="h-full rounded-full bg-[var(--mood-accent)] transition-[width] duration-200"
              style={{ width: `${mobileProgress}%` }}
            />
          </div>
        ) : null}
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)] max-md:hidden" />

        {!currentTrack ? (
          <div className="flex min-h-[3.4rem] items-center gap-2 md:min-h-24 md:flex-col md:items-start md:justify-center md:gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-text-secondary md:hidden">
              <Play className="ml-0.5 size-3.5" />
            </span>
            <p className="hidden font-mono text-xs uppercase tracking-[0.2em] text-text-muted md:block">
              Bottom player
            </p>
            <p className="font-heading text-[0.95rem] leading-tight text-text-primary md:text-2xl">Pick a track</p>
            <p className="hidden max-w-2xl text-sm text-text-secondary md:block">
              Tonaliz Lite keeps the player persistent across Discover and Library so playback stays central to
              the product.
            </p>
          </div>
        ) : (
          <>
            <div
              role="button"
              tabIndex={0}
              className="flex min-h-[4.35rem] cursor-pointer items-center gap-3 rounded-[0.95rem] md:hidden"
              onClick={() => setIsMobileExpandedOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsMobileExpandedOpen(true)
                }
              }}
              aria-label={`Open expanded player for ${currentTrack.name}`}
            >
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="size-11 shrink-0 rounded-[0.9rem] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-1 font-heading text-[0.98rem] leading-tight text-text-primary">
                    {currentTrack.name}
                  </h2>
                  <p className="mt-0.5 line-clamp-1 text-[0.82rem] leading-tight text-text-secondary">
                    {currentTrack.artistName}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-9 shrink-0 rounded-full border border-white/10 bg-white/8 text-text-primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    togglePlay()
                  }}
                >
                  {isPlaying ? <Pause className="size-4.5" /> : <Play className="ml-0.5 size-4.5" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-9 shrink-0 rounded-full border border-white/8 bg-black/20 text-text-secondary"
                  onClick={(event) => {
                    event.stopPropagation()
                    nextTrack()
                  }}
                  disabled={!hasNextTrack}
                >
                  <StepForward className="size-4.5" />
                </Button>
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
                  <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{currentTrack.artistName}</p>
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
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={
                    desktopRightRailMode === 'queue'
                      ? 'border border-[color:var(--mood-accent)]/40 bg-[color:var(--mood-accent)]/12 text-text-primary'
                      : 'border border-border-subtle'
                  }
                  onClick={toggleQueueRail}
                  aria-pressed={desktopRightRailMode === 'queue'}
                  aria-label={desktopRightRailMode === 'queue' ? 'Close queue' : 'Open queue'}
                >
                  {desktopRightRailMode === 'queue' ? (
                    <PanelRightClose className="size-4" />
                  ) : (
                    <PanelRightOpen className="size-4" />
                  )}
                </Button>
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
    </>
  )
}
