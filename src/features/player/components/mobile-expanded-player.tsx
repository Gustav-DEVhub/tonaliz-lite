import { ChevronDown, Copy, ExternalLink, GripVertical, Heart, ListMusic, MoreVertical, Pause, Play, Repeat, Shuffle, StepBack, StepForward } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Playlist, Track, Mood } from '@/entities/track/model/types'
import { MarqueeText } from '@/features/player/components/marquee-text'
import { PlayingBars } from '@/features/player/components/playing-bars'
import type { RepeatMode } from '@/features/player/store/use-player-store'
import { moodTheme } from '@/shared/constants/mood-theme'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn, formatDuration } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

type QueueSheetMode = 'peek' | 'expanded'
interface QueueDragHandleProps {
  attributes: ButtonHTMLAttributes<HTMLButtonElement>
  listeners?: ButtonHTMLAttributes<HTMLButtonElement>
  setActivatorNodeRef: (node: HTMLButtonElement | null) => void
}

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
  onReorderUpcomingTracks: (tracks: Track[]) => void
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
  onReorderUpcomingTracks,
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
  const queueSheetDragControls = useDragControls()
  const isQueueReorderingRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()
  const queueReorderSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const moodToken = moodTheme[currentMood]
  const resolvedDuration = duration || currentTrack?.duration || 0
  const trackShareUrl = currentTrack?.shareUrl ?? null
  const trackJamendoUrl = trackShareUrl?.includes('jamendo.com') ? trackShareUrl : null
  const artistJamendoUrl = currentTrack?.artistShareUrl ?? null
  const overlaySpring = shouldReduceMotion
    ? { duration: 0.12, ease: 'easeOut' as const }
    : { type: 'spring' as const, stiffness: 380, damping: 34, mass: 0.68 }
  const queueSheetSpring = shouldReduceMotion
    ? { duration: 0.14, ease: 'easeOut' as const }
    : { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.62 }
  const subtleSpring = shouldReduceMotion
    ? { duration: 0.1, ease: 'easeOut' as const }
    : { type: 'spring' as const, stiffness: 460, damping: 36, mass: 0.55 }

  const resolveSwipeThreshold = () => {
    if (typeof window === 'undefined') {
      return 56
    }

    return Math.min(Math.max(window.innerWidth * 0.1, 48), 96)
  }

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
      setFeedback('Copied')
      closeMenu()
    } catch {
      setFeedback('Copy failed')
      closeMenu()
    }
  }

  const handleToggleFavorite = () => {
    onToggleFavorite()
    setFeedback(isFavorite ? 'Removed from favorites' : 'Added to favorites')
    closeMenu()
  }

  const menuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'

  if (!currentTrack) {
    return null
  }

  const queueTracks = queue?.tracks ?? [currentTrack]
  const currentQueueTrack = queue?.tracks[queueIndex] ?? currentTrack
  const previousTracks = queueTracks.slice(0, queueIndex).map((track, index) => ({ track, absoluteIndex: index }))
  const upcomingTracks = queueTracks
    .slice(queueIndex + 1)
    .map((track, offset) => {
      const absoluteIndex = queueIndex + offset + 1

      return {
        track,
        absoluteIndex,
        sortableId: `${queue?.id ?? 'session'}-up-next-${absoluteIndex}-${track.id}`,
      }
    })

  const handleMobileQueueDragEnd = (event: DragEndEvent) => {
    window.setTimeout(() => {
      isQueueReorderingRef.current = false
    }, 0)

    if (isShuffleEnabled) {
      return
    }

    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = upcomingTracks.findIndex((item) => item.sortableId === active.id)
    const newIndex = upcomingTracks.findIndex((item) => item.sortableId === over.id)

    if (oldIndex < 0 || newIndex < 0) {
      return
    }

    onReorderUpcomingTracks(arrayMove(upcomingTracks, oldIndex, newIndex).map((item) => item.track))
  }

  const handleMobileQueueDragStart = () => {
    isQueueReorderingRef.current = true
  }

  const handleMobileQueueDragCancel = () => {
    window.setTimeout(() => {
      isQueueReorderingRef.current = false
    }, 0)
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[88] bg-black/72 backdrop-blur-md md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.08 } : { duration: 0.2, ease: 'easeOut' }}
            onClick={handleCloseOverlay}
          />

          <motion.div
            drag="y"
            dragDirectionLock
            dragElastic={0.08}
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) {
                handleCloseOverlay()
              }
            }}
            className="fixed inset-0 z-[90] md:hidden"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={overlaySpring}
          >
            <div
              className="relative flex h-[100dvh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_20%,transparent),transparent_38%),linear-gradient(180deg,#09070c_0%,#0d0a12_52%,#0a0810_100%)] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)]"
              onClick={(event) => event.stopPropagation()}
            >
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
                    className={cn(
                      'inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-primary transition-colors hover:bg-white/10',
                      isMenuOpen && 'border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12',
                    )}
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

                  {feedback ? (
                    <div className="pointer-events-none absolute right-0 top-12 z-10 mt-2 rounded-full border border-white/10 bg-black/82 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                      {feedback}
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
                  <motion.div
                    key={currentTrack.id}
                    className="relative w-full max-w-[min(78vw,21rem)] touch-none"
                    drag="x"
                    dragDirectionLock
                    dragElastic={0.18}
                    dragMomentum={false}
                    dragConstraints={{ left: 0, right: 0 }}
                    whileTap={{ scale: 0.985 }}
                    initial={{ scale: shouldReduceMotion ? 1 : 0.96, opacity: shouldReduceMotion ? 1 : 0.88 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={subtleSpring}
                    onDragEnd={(_, info) => {
                      const threshold = resolveSwipeThreshold()
                      const velocityThreshold = 650
                      const shouldGoNext = info.offset.x < -threshold || info.velocity.x < -velocityThreshold
                      const shouldGoPrevious = info.offset.x > threshold || info.velocity.x > velocityThreshold

                      if (shouldGoNext && hasNextTrack) {
                        onNext()
                        return
                      }

                      if (shouldGoPrevious && hasPreviousTrack) {
                        onPrevious()
                      }
                    }}
                    aria-label="Swipe album artwork left or right to change track"
                  >
                    <img
                      src={currentTrack.imageUrl}
                      alt={`${currentTrack.name} artwork`}
                      className="aspect-square w-full rounded-[1.9rem] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                      draggable={false}
                    />
                  </motion.div>
                </div>

                <div className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading text-[1.65rem] leading-[1.02] text-text-primary">
                        <MarqueeText text={currentTrack.name} duration={16} />
                      </h2>
                      <div className="mt-2 flex min-w-0 items-center gap-2 text-[0.98rem] text-text-secondary">
                        <PlayingBars isPlaying={isPlaying} />
                        <p className="min-w-0 flex-1">
                          <MarqueeText text={currentTrack.artistName} duration={13} />
                        </p>
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
                    transition={{ duration: 0.16, ease: 'easeOut' }}
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
                    transition={queueSheetSpring}
                    drag="y"
                    dragListener={false}
                    dragControls={queueSheetDragControls}
                    dragDirectionLock
                    dragElastic={0.06}
                    dragMomentum={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    onDragEnd={(_, info) => {
                      if (isQueueReorderingRef.current) {
                        return
                      }

                      if (info.offset.y > 120 || info.velocity.y > 760) {
                        if (queueSheetMode === 'expanded') {
                          setQueueSheetMode('peek')
                          return
                        }

                        closeQueueSheet()
                        return
                      }

                      if (info.offset.y < -72 || info.velocity.y < -620) {
                        setQueueSheetMode('expanded')
                      }
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex h-full flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
                      <button
                        type="button"
                        className="mx-auto mb-3 h-1.5 w-14 touch-none rounded-full bg-white/18 transition-colors hover:bg-white/26 active:cursor-grabbing"
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          queueSheetDragControls.start(event)
                        }}
                        aria-label="Drag queue sheet"
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

                      <div className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1 touch-pan-y">
                        <section className="space-y-3">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-primary/90">Now playing</p>
                          <QueueSheetRow
                            track={currentQueueTrack}
                            isCurrent
                            isPlaying={isPlaying}
                            onPlay={onTogglePlay}
                          />
                        </section>

                        <section className="space-y-3">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Up next</p>

                          {upcomingTracks.length === 0 ? (
                            <div className="rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-4 text-sm text-text-secondary">
                              No upcoming tracks yet.
                            </div>
                          ) : (
                            <DndContext
                              sensors={queueReorderSensors}
                              collisionDetection={closestCenter}
                              onDragStart={handleMobileQueueDragStart}
                              onDragCancel={handleMobileQueueDragCancel}
                              onDragEnd={handleMobileQueueDragEnd}
                            >
                              <SortableContext
                                items={upcomingTracks.map((item) => item.sortableId)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-3">
                                  {upcomingTracks.map(({ track, absoluteIndex, sortableId }) => (
                                    <SortableQueueSheetRow
                                      key={sortableId}
                                      id={sortableId}
                                      track={track}
                                      isReorderDisabled={isShuffleEnabled}
                                      onPlay={() => {
                                        onPlayQueuedTrack(absoluteIndex)
                                      }}
                                      onClick={() => {
                                        onPlayQueuedTrack(absoluteIndex)
                                      }}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                        </section>

                        {previousTracks.length > 0 ? (
                          <section className="space-y-3">
                            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-muted">Previous</p>
                            {previousTracks.map(({ track, absoluteIndex }) => (
                              <QueueSheetRow
                                key={`${queue?.id ?? 'session'}-previous-${track.id}-${absoluteIndex}`}
                                track={track}
                                onPlay={() => {
                                  onPlayQueuedTrack(absoluteIndex)
                                }}
                                onClick={() => {
                                  onPlayQueuedTrack(absoluteIndex)
                                }}
                              />
                            ))}
                          </section>
                        ) : null}
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
  showReorderHandle = false,
  isReorderDisabled = false,
  dragHandleProps,
  onPlay,
  onClick,
}: {
  track: Track
  isCurrent?: boolean
  isPlaying?: boolean
  showReorderHandle?: boolean
  isReorderDisabled?: boolean
  dragHandleProps?: QueueDragHandleProps
  onPlay?: () => void
  onClick?: () => void
}) {
  const content = (
    <>
      <img
        src={track.imageUrl}
        alt={`${track.name} artwork`}
        className="size-12 shrink-0 rounded-[0.95rem] object-cover"
      />
      {isCurrent ? <PlayingBars isPlaying={isPlaying} className="mx-0.5" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <MarqueeText
            text={track.name}
            duration={13}
            className={cn(
              'min-w-0 flex-1 font-heading text-[0.98rem] leading-tight',
              isCurrent ? 'text-[var(--mood-accent)]' : 'text-text-primary',
            )}
          />
        </div>
        <p className="mt-1 line-clamp-1 text-[0.84rem] text-text-secondary">{track.artistName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showReorderHandle ? (
          <>
            <button
              type="button"
              {...dragHandleProps?.attributes}
              {...dragHandleProps?.listeners}
              ref={dragHandleProps?.setActivatorNodeRef}
              className={cn(
                'inline-flex size-8 touch-none items-center justify-center rounded-full border border-white/10 bg-black/16 text-text-muted transition-colors',
                isReorderDisabled
                  ? 'cursor-not-allowed opacity-35'
                  : 'cursor-grab hover:border-white/18 hover:bg-white/8 active:cursor-grabbing',
                dragHandleProps?.attributes.className,
              )}
              disabled={isReorderDisabled}
              aria-label={`Reorder ${track.name}`}
              title={isReorderDisabled ? 'Reorder unavailable while shuffle is enabled.' : 'Drag to reorder upcoming track.'}
              onClick={(event) => {
                event.stopPropagation()
                dragHandleProps?.attributes.onClick?.(event)
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                dragHandleProps?.listeners?.onPointerDown?.(event)
              }}
            >
              <GripVertical className="size-4" />
            </button>
          </>
        ) : null}

        {onPlay ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              'size-9 rounded-full border border-white/10 bg-white/6 text-text-primary',
              isCurrent && 'border-[color:var(--mood-accent)]/30 bg-[color:var(--mood-accent)]/12',
            )}
            onClick={(event) => {
              event.stopPropagation()
              onPlay()
            }}
            aria-label={isCurrent ? (isPlaying ? 'Pause current track' : 'Play current track') : `Play ${track.name}`}
          >
            {isCurrent && isPlaying ? <Pause className="size-4.5" /> : <Play className="ml-0.5 size-4.5" />}
          </Button>
        ) : (
          <span className="shrink-0 text-[0.78rem] text-text-muted">{formatDuration(track.duration)}</span>
        )}
      </div>
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
    <div
      role="button"
      tabIndex={0}
      className="flex w-full items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3 text-left transition-colors hover:bg-white/10"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      {content}
    </div>
  )
}

function SortableQueueSheetRow({
  id,
  track,
  isReorderDisabled,
  onPlay,
  onClick,
}: {
  id: string
  track: Track
  isReorderDisabled: boolean
  onPlay: () => void
  onClick: () => void
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isReorderDisabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}
      className={cn(
        'rounded-[1.2rem]',
        isDragging && 'relative z-10 opacity-90 shadow-[0_18px_40px_rgba(0,0,0,0.28)]',
      )}
    >
      <QueueSheetRow
        track={track}
        showReorderHandle
        isReorderDisabled={isReorderDisabled}
        dragHandleProps={{
          attributes: attributes as ButtonHTMLAttributes<HTMLButtonElement>,
          listeners: listeners as ButtonHTMLAttributes<HTMLButtonElement> | undefined,
          setActivatorNodeRef,
        }}
        onPlay={onPlay}
        onClick={onClick}
      />
    </div>
  )
}
