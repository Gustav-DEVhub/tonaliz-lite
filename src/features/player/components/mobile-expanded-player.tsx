import { ChevronDown, Copy, ExternalLink, GripVertical, Heart, ListMusic, MoreVertical, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Playlist, Track, Mood } from '@/entities/track/model/types'
import { PlayingBars } from '@/features/player/components/playing-bars'
import type { RepeatMode } from '@/features/player/store/use-player-store'
import { detectMood } from '@/lib/mood/detect-mood'
import { moodTheme } from '@/shared/constants/mood-theme'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn, formatDuration } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

type QueueSheetMode = 'peek' | 'expanded'

interface MobileExpandedPlayerProps {
  open: boolean
  onClose: () => void
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  currentMood: Mood
  queue: Playlist | null
  queueIndex: number
  hasNextTrack: boolean
  hasPreviousTrack: boolean
  isShuffleEnabled: boolean
  repeatMode: RepeatMode
  isFavorite: boolean
  onTogglePlay: () => void
  onNext: () => void
  onPrevious: () => void
  onPlayQueuedTrack: (index: number) => void
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
  queue,
  queueIndex,
  hasNextTrack,
  hasPreviousTrack,
  isShuffleEnabled,
  repeatMode,
  isFavorite,
  onTogglePlay,
  onNext,
  onPrevious,
  onPlayQueuedTrack,
  onToggleShuffle,
  onCycleRepeatMode,
  onToggleFavorite,
  onSeek,
}: MobileExpandedPlayerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isQueueSheetOpen, setIsQueueSheetOpen] = useState(false)
  const [queueSheetMode, setQueueSheetMode] = useState<QueueSheetMode>('peek')
  const [feedback, setFeedback] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const moodToken = moodTheme[currentMood]
  const resolvedDuration = duration || currentTrack?.duration || 0
  const progress = resolvedDuration > 0 ? Math.min((currentTime / resolvedDuration) * 100, 100) : 0
  const trackShareUrl = currentTrack?.shareUrl ?? null
  const trackJamendoUrl = trackShareUrl?.includes('jamendo.com') ? trackShareUrl : null
  const artistJamendoUrl = currentTrack?.artistShareUrl ?? null

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isQueueSheetOpen) {
          setIsQueueSheetOpen(false)
          return
        }

        setIsMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen, isQueueSheetOpen])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = setTimeout(() => {
      setFeedback(null)
    }, 1800)

    return () => {
      clearTimeout(timeout)
    }
  }, [feedback])

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const closeQueueSheet = () => {
    setIsQueueSheetOpen(false)
    setQueueSheetMode('peek')
  }

  const openQueueSheet = () => {
    setIsQueueSheetOpen(true)
    setQueueSheetMode('peek')
  }

  const handleCloseOverlay = () => {
    setIsMenuOpen(false)
    closeQueueSheet()
    setFeedback(null)
    onClose()
  }

  const handleCopyTrackLink = async () => {
    if (!trackShareUrl) {
      return
    }

    try {
      await copyTextToClipboard(trackShareUrl)
      setFeedback('Track link copied')
      closeMenu()
    } catch {
      setFeedback('Copy failed')
    }
  }

  const handleToggleFavorite = () => {
    onToggleFavorite()
    closeMenu()
  }

  const menuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'

  if (!currentTrack) {
    return null
  }

  const queueTracks = queue?.tracks ?? [currentTrack]
  const currentQueueTrack = queue?.tracks[queueIndex] ?? currentTrack
  const previousTracks = queueTracks.slice(0, queueIndex).map((track, index) => ({ track, absoluteIndex: index })).reverse()
  const upcomingTracks = queueTracks
    .slice(queueIndex + 1)
    .map((track, offset) => ({ track, absoluteIndex: queueIndex + offset + 1 }))

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
            onClick={handleCloseOverlay}
          />

          <motion.div
            drag="y"
            dragDirectionLock
            dragElastic={0.16}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) {
                handleCloseOverlay()
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

              <div className="relative flex items-center justify-between pb-3">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-primary transition-colors hover:bg-white/10"
                  onClick={handleCloseOverlay}
                  aria-label="Close expanded player"
                >
                  <ChevronDown className="size-5" />
                </button>

                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-primary transition-colors hover:bg-white/10"
                    onClick={() => {
                      setIsMenuOpen((value) => !value)
                    }}
                    aria-expanded={isMenuOpen}
                    aria-label="Expanded player actions"
                  >
                    <MoreVertical className="size-5" />
                  </button>

                  {isMenuOpen ? (
                    <div className="editorial-panel absolute right-0 top-12 z-20 w-60 rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
                      <div className="space-y-1">
                        {trackJamendoUrl ? (
                          <a
                            href={trackJamendoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={menuItemClassName}
                            onClick={closeMenu}
                          >
                            <ExternalLink className="size-4" />
                            View track on Jamendo
                          </a>
                        ) : null}

                        {artistJamendoUrl ? (
                          <a
                            href={artistJamendoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={menuItemClassName}
                            onClick={closeMenu}
                          >
                            <ExternalLink className="size-4" />
                            View artist on Jamendo
                          </a>
                        ) : null}

                        <button type="button" className={menuItemClassName} onClick={handleToggleFavorite}>
                          <Heart className={cn('size-4', isFavorite && 'fill-current text-primary-soft')} />
                          {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        </button>

                        {trackShareUrl ? (
                          <button
                            type="button"
                            className={menuItemClassName}
                            onClick={() => {
                              void handleCopyTrackLink()
                            }}
                          >
                            <Copy className="size-4" />
                            Copy track link
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 font-heading text-[1.65rem] leading-[1.02] text-text-primary">
                        {currentTrack.name}
                      </h2>
                      <div className="mt-2 flex items-center gap-2 text-[0.98rem] text-text-secondary">
                        <PlayingBars isPlaying={isPlaying} />
                        <p className="line-clamp-1">{currentTrack.artistName}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-11 shrink-0 rounded-full border border-white/10 bg-white/6 text-text-primary',
                        isFavorite && 'text-primary-soft',
                      )}
                      onClick={onToggleFavorite}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Heart className={isFavorite ? 'size-5 fill-current' : 'size-5'} />
                    </Button>
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

                  {feedback ? (
                    <p className="mt-3 text-[0.82rem] text-text-secondary">{feedback}</p>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'size-10 rounded-full border border-white/10 bg-white/6 text-text-secondary',
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
                        variant="ghost"
                        className={cn(
                          'size-10 rounded-full border border-white/10 bg-white/6 text-text-secondary',
                          isQueueSheetOpen && 'border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12 text-text-primary',
                        )}
                        onClick={openQueueSheet}
                        aria-pressed={isQueueSheetOpen}
                        aria-label="Open queue"
                      >
                        <ListMusic className="size-4.5" />
                      </Button>
                    </div>

                    <div className="flex flex-1 items-center justify-center gap-4">
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
                    </div>

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
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isQueueSheetOpen ? (
                <>
                  <motion.button
                    type="button"
                    className="absolute inset-0 z-[94] bg-black/35"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={closeQueueSheet}
                    aria-label="Close queue sheet"
                  />

                  <motion.div
                    className="absolute inset-x-0 bottom-0 z-[95] overflow-hidden rounded-t-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,15,25,0.98),rgba(10,8,16,0.98))] shadow-[0_-18px_48px_rgba(0,0,0,0.34)]"
                    initial={{ opacity: 0, y: 60, height: '58dvh' }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      height: queueSheetMode === 'peek' ? '58dvh' : '84dvh',
                    }}
                    exit={{ opacity: 0, y: 60 }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    drag="y"
                    dragDirectionLock
                    dragElastic={0.1}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 150 || info.velocity.y > 900) {
                        if (queueSheetMode === 'expanded') {
                          setQueueSheetMode('peek')
                          return
                        }

                        closeQueueSheet()
                        return
                      }

                      if (info.offset.y < -90 || info.velocity.y < -700) {
                        setQueueSheetMode('expanded')
                      }
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex h-full flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
                      <button
                        type="button"
                        className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/18 transition-colors hover:bg-white/26"
                        onClick={closeQueueSheet}
                        aria-label="Close queue"
                      />

                      <div className="flex items-center justify-between gap-3 pb-3">
                        <div>
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Queue</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {queueTracks.length} {queueTracks.length === 1 ? 'track' : 'tracks'} in this session
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className={cn(
                            'size-10 rounded-full border border-white/10 bg-white/6 text-text-secondary',
                            isShuffleEnabled && 'border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12 text-text-primary',
                          )}
                          onClick={onToggleShuffle}
                          aria-pressed={isShuffleEnabled}
                          aria-label={isShuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
                        >
                          <Shuffle className="size-4.5" />
                        </Button>
                      </div>

                      <div className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
                        {previousTracks.length > 0 ? (
                          <section className="space-y-3">
                            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Previous</p>
                            {previousTracks.map(({ track, absoluteIndex }) => (
                              <QueueSheetRow
                                key={`${queue?.id ?? 'session'}-previous-${track.id}-${absoluteIndex}`}
                                track={track}
                                onClick={() => {
                                  onPlayQueuedTrack(absoluteIndex)
                                  closeQueueSheet()
                                }}
                              />
                            ))}
                          </section>
                        ) : null}

                        <section className="space-y-3">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Now playing</p>
                          <QueueSheetRow track={currentQueueTrack} isCurrent isPlaying={isPlaying} />
                        </section>

                        <section className="space-y-3">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Up next</p>

                          {upcomingTracks.length === 0 ? (
                            <div className="rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-4 text-sm text-text-secondary">
                              No upcoming tracks yet.
                            </div>
                          ) : (
                            upcomingTracks.map(({ track, absoluteIndex }) => (
                              <QueueSheetRow
                                key={`${queue?.id ?? 'session'}-up-next-${track.id}-${absoluteIndex}`}
                                track={track}
                                onClick={() => {
                                  onPlayQueuedTrack(absoluteIndex)
                                  closeQueueSheet()
                                }}
                              />
                            ))
                          )}
                        </section>
                      </div>
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

function QueueSheetRow({
  track,
  isCurrent = false,
  isPlaying = false,
  onClick,
}: {
  track: Track
  isCurrent?: boolean
  isPlaying?: boolean
  onClick?: () => void
}) {
  const mood = detectMood(track)
  const moodToken = moodTheme[mood]
  const content = (
    <>
      <img
        src={track.imageUrl}
        alt={`${track.name} artwork`}
        className="size-12 shrink-0 rounded-[0.95rem] object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'line-clamp-1 font-heading text-[0.98rem] leading-tight',
              isCurrent ? 'text-[var(--mood-accent)]' : 'text-text-primary',
            )}
          >
            {track.name}
          </p>
          {isCurrent ? <PlayingBars isPlaying={isPlaying} /> : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="line-clamp-1 text-[0.84rem] text-text-secondary">{track.artistName}</p>
          <Badge
            className="shrink-0 border-transparent uppercase tracking-[0.1em]"
            style={{
              background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0,0,0,0.46))`,
              color: moodToken.text,
            }}
          >
            {moodToken.label}
          </Badge>
        </div>
      </div>
      {isCurrent ? (
        <span className="shrink-0 rounded-full border border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12 px-2.5 py-1 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-text-primary">
          Current
        </span>
      ) : (
        <>
          {/* TODO: wire real drag reorder once queue mutations support safe mobile reordering semantics. */}
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/16 text-text-muted"
            aria-hidden="true"
          >
            <GripVertical className="size-4" />
          </span>
          <span className="shrink-0 text-[0.78rem] text-text-muted">{formatDuration(track.duration)}</span>
        </>
      )}
    </>
  )

  if (!onClick) {
    return (
      <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3 text-left transition-colors hover:bg-white/10"
      onClick={onClick}
    >
      {content}
    </button>
  )
}
