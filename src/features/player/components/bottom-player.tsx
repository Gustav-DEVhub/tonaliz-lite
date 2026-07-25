import { Heart, ListMusic, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { Suspense, lazy, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { DesktopVolumeControl } from '@/features/player/components/desktop-volume-control'
import { MarqueeText } from '@/features/player/components/marquee-text'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { seekAudio } from '@/lib/audio/audio-controller'
import { formatDuration } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Button } from '@/shared/ui/button'

const MobileExpandedPlayer = lazy(async () =>
  import('@/features/player/components/mobile-expanded-player').then((module) => ({
    default: module.MobileExpandedPlayer,
  })),
)

export function BottomPlayer() {
  const [isMobileExpandedOpen, setIsMobileExpandedOpen] = useState(false)
  const didMiniPlayerSwipeRef = useRef(false)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const currentTrackId = currentTrack?.id ?? null
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
  const playTrackInCurrentQueue = usePlayerStore((state) => state.playTrackInCurrentQueue)
  const reorderUpcomingQueue = usePlayerStore((state) => state.reorderUpcomingQueue)
  const seekTo = usePlayerStore((state) => state.seekTo)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode)
  const toggleQueueRail = usePlayerStore((state) => state.toggleQueueRail)

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const showToast = useToastStore((state) => state.showToast)
  const isCurrentFavorite = useFavoritesStore((state) =>
    currentTrackId ? state.favorites.some((favorite) => favorite.id === currentTrackId) : false,
  )

  const hasNextTrack =
    Boolean(queue?.tracks[queueIndex + 1]) || Boolean((isShuffleEnabled || repeatMode === 'all') && queue && queue.tracks.length > 1)
  const hasPreviousTrack = Boolean(queue?.tracks[queueIndex - 1]) || repeatMode === 'all'
  const resolvedDuration = duration || currentTrack?.duration || 0

  const handleSeek = (nextTime: number) => {
    seekAudio(nextTime)
    seekTo(nextTime)
  }

  const handleToggleCurrentFavorite = () => {
    if (!currentTrack) {
      return
    }

    void toggleFavorite(currentTrack)
    showToast({ title: isCurrentFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
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

  const handleMiniPlayerSwipe = (offsetX: number, offsetY: number, velocityX: number) => {
    const distanceThreshold = 52
    const velocityThreshold = 280
    const horizontalDominance = Math.abs(offsetX) > Math.abs(offsetY) * 1.6
    const isIntentionalSwipe =
      Math.abs(offsetX) >= distanceThreshold && Math.abs(velocityX) >= velocityThreshold && horizontalDominance

    if (!isIntentionalSwipe) {
      return
    }

    didMiniPlayerSwipeRef.current = true

    if (offsetX < 0 && hasNextTrack) {
      nextTrack()
      return
    }

    if (offsetX > 0 && hasPreviousTrack) {
      previousTrack()
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <MobileExpandedPlayer
          open={isMobileExpandedOpen && Boolean(currentTrack)}
          onClose={() => setIsMobileExpandedOpen(false)}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={resolvedDuration}
          currentMood={currentMood}
          queue={queue}
          queueIndex={queueIndex}
          hasNextTrack={hasNextTrack}
          hasPreviousTrack={hasPreviousTrack}
          isShuffleEnabled={isShuffleEnabled}
          repeatMode={repeatMode}
          isFavorite={isCurrentFavorite}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onPrevious={previousTrack}
          onPlayQueuedTrack={playTrackInCurrentQueue}
          onReorderUpcomingTracks={reorderUpcomingQueue}
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
      </Suspense>

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
                <motion.div
                  className="flex min-w-0 flex-1 items-center gap-3 touch-pan-y"
                  drag="x"
                  dragDirectionLock
                  dragElastic={0.16}
                  dragMomentum={false}
                  dragConstraints={{ left: 0, right: 0 }}
                  whileTap={{ scale: 0.992 }}
                  onClickCapture={(event) => {
                    if (didMiniPlayerSwipeRef.current) {
                      event.stopPropagation()
                      didMiniPlayerSwipeRef.current = false
                    }
                  }}
                  onDragEnd={(_, info) => {
                    handleMiniPlayerSwipe(info.offset.x, info.offset.y, info.velocity.x)
                  }}
                  aria-label="Swipe mini player artwork or title left or right to change track"
                >
                  <img
                    src={currentTrack.imageUrl}
                    alt={`${currentTrack.name} artwork`}
                    className="size-11 shrink-0 rounded-[0.9rem] object-cover"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-[0.98rem] leading-tight text-text-primary">
                      <MarqueeText text={currentTrack.name} />
                    </h2>
                    <p className="mt-0.5 text-[0.82rem] leading-tight text-text-secondary">
                      <MarqueeText text={currentTrack.artistName} duration={12} />
                    </p>
                  </div>
                </motion.div>
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
                  className={isCurrentFavorite ? 'size-9 shrink-0 rounded-full border border-primary-soft/30 bg-primary-soft/12 text-primary-soft' : 'size-9 shrink-0 rounded-full border border-white/8 bg-black/20 text-text-secondary'}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleToggleCurrentFavorite()
                  }}
                  aria-label={isCurrentFavorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart className={isCurrentFavorite ? 'size-4.5 fill-current' : 'size-4.5'} />
                </Button>
            </div>

            <div className="hidden grid-cols-[minmax(0,24rem)_minmax(0,1fr)_auto] items-center gap-4 md:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="size-[3.8rem] rounded-[0.95rem] object-cover"
                />

                <div className="min-w-0">
                  <h2
                    className="line-clamp-1 font-heading text-[1.06rem] leading-tight text-text-primary lg:text-[1.12rem]"
                    title={currentTrack.name.length > 44 ? currentTrack.name : undefined}
                  >
                    {currentTrack.name}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-[0.92rem] text-text-secondary">{currentTrack.artistName}</p>
                </div>
              </div>

              <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-1.5 xl:max-w-[36rem]">
                <div className="flex items-center justify-center gap-1.5">
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-[0.72rem] text-text-muted">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(resolvedDuration)}</span>
                  </div>
                  {progressSlider}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={
                    desktopRightRailMode === 'queue'
                      ? 'size-10 scale-[1.03] border border-[color:var(--mood-accent)]/45 bg-[color:var(--mood-accent)]/18 text-text-primary shadow-[0_12px_28px_color-mix(in_srgb,var(--mood-accent)_18%,transparent)] transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out'
                      : 'size-10 border border-border-subtle bg-white/6 text-text-secondary transition-[background-color,color,transform] duration-200 ease-out hover:scale-[1.02] hover:bg-white/10 hover:text-text-primary active:scale-[0.97]'
                  }
                  onClick={toggleQueueRail}
                  aria-pressed={desktopRightRailMode === 'queue'}
                  aria-label={desktopRightRailMode === 'queue' ? 'Close queue' : 'Open queue'}
                >
                  <ListMusic className="size-4.5" />
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
