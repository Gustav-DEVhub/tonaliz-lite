import { ChevronDown, Heart, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { Track, Mood } from '@/entities/track/model/types'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn, formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { RepeatMode } from '@/features/player/store/use-player-store'

interface MobileExpandedPlayerProps {
  open: boolean
  onClose: () => void
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  currentMood: Mood
  hasNextTrack: boolean
  hasPreviousTrack: boolean
  isShuffleEnabled: boolean
  repeatMode: RepeatMode
  isFavorite: boolean
  onTogglePlay: () => void
  onNext: () => void
  onPrevious: () => void
  onToggleShuffle: () => void
  onCycleRepeatMode: () => void
  onToggleFavorite: () => void
  onSeek: (value: number) => void
}

export function MobileExpandedPlayer({
  open,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  currentMood,
  hasNextTrack,
  hasPreviousTrack,
  isShuffleEnabled,
  repeatMode,
  isFavorite,
  onTogglePlay,
  onNext,
  onPrevious,
  onToggleShuffle,
  onCycleRepeatMode,
  onToggleFavorite,
  onSeek,
}: MobileExpandedPlayerProps) {
  const moodToken = moodTheme[currentMood]

  if (!currentTrack) {
    return null
  }

  const resolvedDuration = duration || currentTrack.duration || 0
  const progress = resolvedDuration > 0 ? Math.min((currentTime / resolvedDuration) * 100, 100) : 0
  const jamendoUrl =
    currentTrack.artistShareUrl ??
    (currentTrack.shareUrl?.includes('jamendo.com') ? currentTrack.shareUrl : null) ??
    null

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[88] bg-black/72 backdrop-blur-md md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={onClose}
          />

          <motion.div
            drag="y"
            dragDirectionLock
            dragElastic={0.16}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) {
                onClose()
              }
            }}
            className="fixed inset-0 z-[90] md:hidden"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div
              className="relative flex h-[100dvh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_20%,transparent),transparent_38%),linear-gradient(180deg,#09070c_0%,#0d0a12_52%,#0a0810_100%)] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-white/8">
                <div
                  className="h-full rounded-full bg-[var(--mood-accent)] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-center pb-3">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-primary transition-colors hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Close expanded player"
                >
                  <ChevronDown className="size-5" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="relative flex flex-1 items-center justify-center">
                  <div
                    className="absolute inset-0 mx-auto my-auto h-[52vw] max-h-[18rem] w-[52vw] max-w-[18rem] rounded-full blur-3xl"
                    style={{ background: `color-mix(in srgb, ${moodToken.accent} 30%, transparent)` }}
                  />
                  <motion.img
                    src={currentTrack.imageUrl}
                    alt={`${currentTrack.name} artwork`}
                    className="relative aspect-square w-full max-w-[min(78vw,21rem)] rounded-[1.9rem] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                    initial={{ scale: 0.96, opacity: 0.88 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  />
                </div>

                <div className="pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 font-heading text-[1.65rem] leading-[1.02] text-text-primary">
                        {currentTrack.name}
                      </h2>
                      <p className="mt-2 line-clamp-1 text-[0.98rem] text-text-secondary">
                        {currentTrack.artistName}
                      </p>
                    </div>

                    <Badge
                      className="shrink-0 border-transparent uppercase tracking-[0.12em]"
                      style={{
                        background: `color-mix(in srgb, ${moodToken.background} 78%, rgba(0,0,0,0.46))`,
                        color: moodToken.text,
                      }}
                    >
                      {moodToken.label}
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={resolvedDuration || 0}
                      step={1}
                      value={Math.min(currentTime, resolvedDuration || 0)}
                      onChange={(event) => {
                        onSeek(Number(event.target.value))
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="h-[3px] w-full cursor-pointer accent-[var(--mood-accent)]"
                      aria-label="Track progress"
                    />
                    <div className="flex items-center justify-between text-[0.76rem] text-text-secondary">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(resolvedDuration)}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-10 shrink-0 rounded-full border border-white/10 bg-white/6 text-text-secondary',
                        isShuffleEnabled && 'border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12 text-text-primary',
                      )}
                      onClick={onToggleShuffle}
                      aria-pressed={isShuffleEnabled}
                      aria-label={isShuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
                    >
                      <Shuffle className="size-4.5" />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="size-11 shrink-0 rounded-full border-white/10 bg-white/6 text-text-primary"
                      onClick={onPrevious}
                      disabled={!hasPreviousTrack}
                    >
                      <StepBack className="size-5" />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      className="size-16 rounded-full shadow-[0_0_28px_color-mix(in_srgb,var(--mood-accent)_32%,transparent)]"
                      style={{
                        background: `linear-gradient(180deg, color-mix(in srgb, ${moodToken.accent} 78%, white 8%), color-mix(in srgb, ${moodToken.accent} 72%, black 8%))`,
                        borderColor: 'transparent',
                        color: '#09070c',
                      }}
                      onClick={onTogglePlay}
                    >
                      {isPlaying ? <Pause className="size-7" /> : <Play className="ml-1 size-7" />}
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="size-11 shrink-0 rounded-full border-white/10 bg-white/6 text-text-primary"
                      onClick={onNext}
                      disabled={!hasNextTrack}
                    >
                      <StepForward className="size-5" />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-10 shrink-0 rounded-full border border-white/10 bg-white/6 text-text-secondary',
                        repeatMode !== 'off' && 'border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12 text-text-primary',
                      )}
                      onClick={onCycleRepeatMode}
                      aria-label={
                        repeatMode === 'off'
                          ? 'Enable repeat queue'
                          : repeatMode === 'all'
                            ? 'Enable repeat one'
                            : 'Disable repeat'
                      }
                    >
                      <span className="relative flex items-center justify-center">
                        <Repeat className="size-4.5" />
                        {repeatMode === 'one' ? (
                          <span className="absolute -right-1.5 -top-1 text-[0.56rem] font-semibold text-primary-soft">
                            1
                          </span>
                        ) : null}
                      </span>
                    </Button>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-11 rounded-full border border-white/10 bg-white/6 text-text-primary',
                        isFavorite && 'text-primary-soft',
                      )}
                      onClick={onToggleFavorite}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Heart className={isFavorite ? 'size-5 fill-current' : 'size-5'} />
                    </Button>

                    {jamendoUrl ? (
                      <a
                        href={jamendoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/6 px-4 text-[0.82rem] font-medium text-text-secondary transition-colors hover:text-text-primary"
                      >
                        View on Jamendo
                      </a>
                    ) : (
                      <div className="h-11" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
