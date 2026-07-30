import { ChevronDown, ExternalLink, GripVertical, Heart, ListMusic, MoreVertical, Pause, Play, Repeat, Share2, Shuffle, StepBack, StepForward } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { animate } from 'motion'
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
import { MobileTrackActionSheet } from '@/entities/track/ui/mobile-track-action-sheet'
import { useMobileLongPress } from '@/entities/track/ui/use-mobile-long-press'
import { getArtistRouteTarget } from '@/features/artist/lib/artist-route'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { MarqueeText } from '@/features/player/components/marquee-text'
import { PlayingBars } from '@/features/player/components/playing-bars'
import type { RepeatMode } from '@/features/player/store/use-player-store'
import { moodTheme } from '@/shared/constants/mood-theme'
import { canUseNativeShare, copyTextToClipboard, shareWithNativeSheet } from '@/shared/lib/share'
import { cn, formatDuration } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
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
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isQueueSheetOpen, setIsQueueSheetOpen] = useState(false)
  const [queueSheetMode, setQueueSheetMode] = useState<QueueSheetMode>('peek')
  const [isAddToPlaylistDialogOpen, setIsAddToPlaylistDialogOpen] = useState(false)
  const [isArtworkSwipeCommitting, setIsArtworkSwipeCommitting] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const queueSheetDragControls = useDragControls()
  const isQueueReorderingRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()
  const showToast = useToastStore((state) => state.showToast)
  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
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
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])
  const motionFactor = shouldReduceMotion ? 0.65 : 1
  const overlayTransition = shouldReduceMotion
    ? { duration: 0.01, ease: 'linear' as const }
    : { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const }
  const queueSheetTransition = shouldReduceMotion
    ? { duration: 0.01, ease: 'linear' as const }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }
  const subtleSpring = {
    type: 'spring' as const,
    stiffness: 420 + 70 * motionFactor,
    damping: 34,
    mass: 0.56,
  }
  const artworkDragX = useMotionValue(0)
  const artworkPreviewDistance = typeof window === 'undefined' ? 176 : Math.min(Math.max(window.innerWidth * 0.36, 146), 216)
  const previewOpacityLeft = useTransform(artworkDragX, [0, artworkPreviewDistance * 0.82], [0, 0.92])
  const previewOpacityRight = useTransform(artworkDragX, [-artworkPreviewDistance * 0.82, 0], [0.92, 0])
  const previousPreviewOffset = useTransform(artworkDragX, [0, artworkPreviewDistance], ['-100%', '-42%'])
  const nextPreviewOffset = useTransform(artworkDragX, [-artworkPreviewDistance, 0], ['42%', '100%'])

  const resolveSwipeThreshold = () => {
    if (typeof window === 'undefined') {
      return 112
    }

    return Math.min(Math.max(window.innerWidth * 0.24, 96), 150)
  }

  useEffect(() => {
    artworkDragX.set(0)
  }, [artworkDragX, currentTrack?.id])

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

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const closeQueueSheet = () => {
    isQueueReorderingRef.current = false
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
    onClose()
  }

  const openArtistFromTrack = (track: Track) => {
    const target = getArtistRouteTarget(track)
    handleCloseOverlay()
    navigate(
      {
        pathname: target.pathname,
        search: target.search,
      },
      { state: target.state },
    )
  }

  const handleShareTrack = async () => {
    if (!trackShareUrl) {
      return
    }

    try {
      if (currentTrack && canUseNativeShare()) {
        const didShare = await shareWithNativeSheet({
          title: `${currentTrack.name} - ${currentTrack.artistName}`,
          text: `Listen to ${currentTrack.name} by ${currentTrack.artistName}`,
          url: trackShareUrl,
        })

        if (didShare) {
          closeMenu()
          return
        }
      }

      await copyTextToClipboard(trackShareUrl)
      showToast({ title: 'Link copied', variant: 'success' })
      closeMenu()
    } catch {
      showToast({ title: 'Couldn’t share', variant: 'error' })
      closeMenu()
    }
  }

  const handleToggleFavorite = () => {
    onToggleFavorite()
    showToast({ title: isFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
    closeMenu()
  }

  const menuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'

  if (!currentTrack) {
    return null
  }

  const queueTracks = queue?.tracks ?? [currentTrack]
  const currentQueueTrack = queue?.tracks[queueIndex] ?? currentTrack
  const canPreviewAdjacentTrack = !isShuffleEnabled && queueTracks.length > 1
  const previousPreviewTrack = canPreviewAdjacentTrack
    ? queueTracks[queueIndex - 1] ?? (repeatMode === 'all' ? queueTracks[queueTracks.length - 1] : null)
    : null
  const nextPreviewTrack = canPreviewAdjacentTrack
    ? queueTracks[queueIndex + 1] ?? (repeatMode === 'all' ? queueTracks[0] : null)
    : null
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
    <>
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[88] bg-black/82 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.1, ease: 'easeOut' }}
            onClick={handleCloseOverlay}
          />

          <motion.div
            drag={isQueueSheetOpen ? false : 'y'}
            dragDirectionLock
            dragElastic={0.08}
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (isQueueSheetOpen || isQueueReorderingRef.current) {
                return
              }

              if (info.offset.y > 90 || info.velocity.y > 600) {
                handleCloseOverlay()
              }
            }}
            className="fixed inset-0 z-[90] md:hidden"
            initial={{ opacity: 0, y: 24 * motionFactor }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 * motionFactor }}
            transition={overlayTransition}
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
                          {isFavorite ? 'Remove from Music I Like' : 'Add to Music I Like'}
                        </button>

                        <button
                          type="button"
                          className={menuItemClassName}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            closeMenu()
                            setIsAddToPlaylistDialogOpen(true)
                          }}
                        >
                          <ListMusic className="size-4" />
                          Add to playlist
                        </button>

                        {trackShareUrl ? (
                          <button
                            type="button"
                            className={menuItemClassName}
                            onClick={() => {
                              void handleShareTrack()
                            }}
                          >
                            <Share2 className="size-4" />
                            Share
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
                  <motion.div
                    className="relative aspect-square w-full max-w-[min(78vw,21rem)] touch-none overflow-hidden rounded-[1.9rem]"
                    whileTap={isArtworkSwipeCommitting ? undefined : { scale: 0.992 }}
                    initial={{ scale: 0.975, opacity: 0.9 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={subtleSpring}
                    aria-label="Swipe album artwork left or right to change track"
                  >
                    {previousPreviewTrack ? (
                      <motion.img
                        src={previousPreviewTrack.imageUrl}
                        alt={`${previousPreviewTrack.name} preview artwork`}
                        className="absolute inset-0 z-[1] aspect-square w-full rounded-[1.9rem] object-cover opacity-0 shadow-[0_20px_54px_rgba(0,0,0,0.42)]"
                        style={{
                          x: previousPreviewOffset,
                          opacity: previewOpacityLeft,
                        }}
                        draggable={false}
                      />
                    ) : null}

                    <motion.img
                      key={currentTrack.id}
                      src={currentTrack.imageUrl}
                      alt={`${currentTrack.name} artwork`}
                      className="relative z-[2] aspect-square w-full rounded-[1.9rem] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                      drag={isArtworkSwipeCommitting ? false : 'x'}
                      dragDirectionLock
                      dragElastic={0.1}
                      dragMomentum={false}
                      dragConstraints={{ left: 0, right: 0 }}
                      style={{ x: artworkDragX }}
                      onDragEnd={(_, info) => {
                        if (isArtworkSwipeCommitting) {
                          return
                        }

                        const threshold = resolveSwipeThreshold()
                        const velocityThreshold = 1150
                        const shouldGoNext =
                          info.offset.x < -threshold || (info.offset.x < -threshold * 0.8 && info.velocity.x < -velocityThreshold)
                        const shouldGoPrevious =
                          info.offset.x > threshold || (info.offset.x > threshold * 0.8 && info.velocity.x > velocityThreshold)

                        if (shouldGoNext && hasNextTrack) {
                          setIsArtworkSwipeCommitting(true)
                          void animate(artworkDragX, -artworkPreviewDistance * 1.08, {
                            type: 'spring',
                            stiffness: shouldReduceMotion ? 520 : 620,
                            damping: 38,
                          mass: 0.48,
                        }).then(() => {
                          setIsArtworkSwipeCommitting(false)
                          artworkDragX.set(0)
                          onNext()
                        })
                        return
                        }

                        if (shouldGoPrevious && hasPreviousTrack) {
                          setIsArtworkSwipeCommitting(true)
                          void animate(artworkDragX, artworkPreviewDistance * 1.08, {
                            type: 'spring',
                            stiffness: shouldReduceMotion ? 520 : 620,
                            damping: 38,
                          mass: 0.48,
                        }).then(() => {
                          setIsArtworkSwipeCommitting(false)
                          artworkDragX.set(0)
                          onPrevious()
                        })
                        return
                        }

                        void animate(artworkDragX, 0, {
                          type: 'spring',
                          stiffness: shouldReduceMotion ? 520 : 640,
                          damping: 36,
                          mass: 0.5,
                        })
                      }}
                      draggable={false}
                    />

                    {nextPreviewTrack ? (
                      <motion.img
                        src={nextPreviewTrack.imageUrl}
                        alt={`${nextPreviewTrack.name} preview artwork`}
                        className="absolute inset-0 z-[1] aspect-square w-full rounded-[1.9rem] object-cover opacity-0 shadow-[0_20px_54px_rgba(0,0,0,0.42)]"
                        style={{
                          x: nextPreviewOffset,
                          opacity: previewOpacityRight,
                        }}
                        draggable={false}
                      />
                    ) : null}
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
                    transition={{ duration: 0.16 * motionFactor, ease: 'easeOut' }}
                    onClick={() => {
                      if (isQueueReorderingRef.current) {
                        return
                      }

                      closeQueueSheet()
                    }}
                    aria-label="Close queue sheet"
                  />

                  <motion.div
                    className="absolute inset-x-0 bottom-0 z-[95] h-[84dvh] overflow-hidden rounded-t-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,15,25,0.98),rgba(10,8,16,0.98))] shadow-[0_-18px_48px_rgba(0,0,0,0.34)]"
                    initial={{ opacity: 0, y: '28dvh' }}
                    animate={{
                      opacity: 1,
                      y: queueSheetMode === 'peek' ? '26dvh' : 0,
                    }}
                    exit={{ opacity: 0, y: '28dvh' }}
                    transition={queueSheetTransition}
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
                            isFavorite={favoriteTrackIds.has(currentQueueTrack.id)}
                            onPlay={onTogglePlay}
                            onToggleFavorite={(trackToToggle) => {
                              void toggleFavorite(trackToToggle)
                            }}
                            onViewArtist={openArtistFromTrack}
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
                                      isFavorite={favoriteTrackIds.has(track.id)}
                                      onToggleFavorite={(trackToToggle) => {
                                        void toggleFavorite(trackToToggle)
                                      }}
                                      onViewArtist={openArtistFromTrack}
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
                                isFavorite={favoriteTrackIds.has(track.id)}
                                onToggleFavorite={(trackToToggle) => {
                                  void toggleFavorite(trackToToggle)
                                }}
                                onViewArtist={openArtistFromTrack}
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
    <AddToPlaylistDialog
      track={currentTrack}
      open={isAddToPlaylistDialogOpen}
      onOpenChange={setIsAddToPlaylistDialogOpen}
    />
    </>
  )
}

function QueueSheetRow({
  track,
  isCurrent = false,
  isPlaying = false,
  isFavorite = false,
  showReorderHandle = false,
  isReorderDisabled = false,
  dragHandleProps,
  onPlay,
  onClick,
  onToggleFavorite,
  onViewArtist,
}: {
  track: Track
  isCurrent?: boolean
  isPlaying?: boolean
  isFavorite?: boolean
  showReorderHandle?: boolean
  isReorderDisabled?: boolean
  dragHandleProps?: QueueDragHandleProps
  onPlay?: () => void
  onClick?: () => void
  onToggleFavorite?: (track: Track) => void
  onViewArtist?: (track: Track) => void
}) {
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false)
  const longPressBind = useMobileLongPress(() => {
    setIsMobileActionSheetOpen(true)
  })
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
      <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3" {...longPressBind}>
        {content}
        {isMobileActionSheetOpen ? (
          <MobileTrackActionSheet
            open
            track={track}
            isFavorite={isFavorite}
            onOpenChange={setIsMobileActionSheetOpen}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
            onViewArtist={onViewArtist}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      {...longPressBind}
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
      {isMobileActionSheetOpen ? (
        <MobileTrackActionSheet
          open
          track={track}
          isFavorite={isFavorite}
          onOpenChange={setIsMobileActionSheetOpen}
          onPlay={onPlay}
          onToggleFavorite={onToggleFavorite}
          onViewArtist={onViewArtist}
        />
      ) : null}
    </div>
  )
}

function SortableQueueSheetRow({
  id,
  track,
  isReorderDisabled,
  onPlay,
  onClick,
  isFavorite,
  onToggleFavorite,
  onViewArtist,
}: {
  id: string
  track: Track
  isReorderDisabled: boolean
  onPlay: () => void
  onClick: () => void
  isFavorite: boolean
  onToggleFavorite: (track: Track) => void
  onViewArtist: (track: Track) => void
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
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onViewArtist={onViewArtist}
      />
    </div>
  )
}
