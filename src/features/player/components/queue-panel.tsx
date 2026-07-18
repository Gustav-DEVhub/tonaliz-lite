import { X } from 'lucide-react'
import { useMemo, useRef, type ButtonHTMLAttributes } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
import { useLocation, useNavigate } from 'react-router-dom'
import type { Track } from '@/entities/track/model/types'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { QueueTrackRow } from '@/features/player/components/queue-track-row'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Button } from '@/shared/ui/button'

interface DesktopQueueDragHandleProps {
  attributes: ButtonHTMLAttributes<HTMLButtonElement>
  listeners?: ButtonHTMLAttributes<HTMLButtonElement>
  setActivatorNodeRef: (node: HTMLButtonElement | null) => void
}

export function QueuePanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const queue = usePlayerStore((state) => state.queue)
  const queueIndex = usePlayerStore((state) => state.queueIndex)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isShuffleEnabled = usePlayerStore((state) => state.isShuffleEnabled)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const playTrack = usePlayerStore((state) => state.playTrack)
  const playTrackInCurrentQueue = usePlayerStore((state) => state.playTrackInCurrentQueue)
  const clearUpcomingQueue = usePlayerStore((state) => state.clearUpcomingQueue)
  const closeQueueRailAndRestore = usePlayerStore((state) => state.closeQueueRailAndRestore)
  const removeFromQueueAt = usePlayerStore((state) => state.removeFromQueueAt)
  const reorderUpcomingQueue = usePlayerStore((state) => state.reorderUpcomingQueue)
  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const favoriteTrackIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])
  const showToast = useToastStore((state) => state.showToast)

  const isQueueDragActiveRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()
  const railTransition = shouldReduceMotion
    ? { duration: 0.1, ease: 'easeOut' as const }
    : { type: 'spring' as const, stiffness: 360, damping: 34, mass: 0.7 }
  const reorderSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  if (!queue || !currentTrack) {
    return null
  }

  const currentQueueTrack = queue.tracks[queueIndex] ?? currentTrack
  const upcomingTracks = queue.tracks.slice(queueIndex + 1).map((track, offset) => {
    const absoluteIndex = queueIndex + offset + 1

    return {
      track,
      absoluteIndex,
      sortableId: `${queue.id}-rail-up-next-${absoluteIndex}-${track.id}`,
    }
  })

  const handleQueueDragEnd = (event: DragEndEvent) => {
    window.setTimeout(() => {
      isQueueDragActiveRef.current = false
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

    reorderUpcomingQueue(arrayMove(upcomingTracks, oldIndex, newIndex).map((item) => item.track))
  }

  const handleQueueDragStart = () => {
    isQueueDragActiveRef.current = true
  }

  const goToArtist = (track = currentQueueTrack) => {
    playTrack(track, queue)
    navigate('/now-playing', {
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    })
  }

  const shareTrack = async (shareUrl: string | null | undefined) => {
    if (!shareUrl) {
      showToast({ title: 'No link available', variant: 'warning' })
      return
    }

    try {
      await copyTextToClipboard(shareUrl)
      showToast({ title: 'Link copied', variant: 'success' })
    } catch {
      showToast({ title: "Couldn't share", variant: 'error' })
    }
  }

  return (
    <aside
      className="relative hidden min-w-0 lg:flex lg:h-full lg:min-h-0 lg:justify-end"
      onClickCapture={(event) => {
        if (isQueueDragActiveRef.current) {
          event.stopPropagation()
        }
      }}
    >
      <div className="w-full lg:h-full lg:min-h-0">
        <motion.div
          className="editorial-panel mood-glow overflow-hidden rounded-[1.8rem] border-white/8 p-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col xl:p-3.5"
          initial={{ opacity: shouldReduceMotion ? 1 : 0, x: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: shouldReduceMotion ? 1 : 0, x: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.985 }}
          transition={railTransition}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-3">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text-primary/92">Queue</p>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 shrink-0 rounded-full border border-white/12 bg-white/6 text-text-primary hover:bg-white/12"
              onClick={closeQueueRailAndRestore}
              aria-label="Close queue"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 border border-white/14 bg-white/6 px-3 text-[0.72rem] text-text-primary hover:bg-white/12 hover:text-white"
              onClick={clearUpcomingQueue}
            >
              Clear queue
            </Button>
          </div>

          <div className="mt-3.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 scrollbar-subtle">
            <div className="space-y-4">
              <section className="space-y-2.5">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-primary/90">Now playing</p>
                <QueueTrackRow
                  track={currentQueueTrack}
                  isCurrent
                  isPlaying={isPlaying}
                  isFavorite={favoriteTrackIds.has(currentQueueTrack.id)}
                  onPlay={togglePlay}
                  onFavorite={() => {
                    const wasFavorite = favoriteTrackIds.has(currentQueueTrack.id)
                    void toggleFavorite(currentQueueTrack)
                    showToast({ title: wasFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
                  }}
                  onGoToArtist={() => {
                    goToArtist(currentQueueTrack)
                  }}
                  onShare={() => {
                    void shareTrack(currentQueueTrack.shareUrl)
                  }}
                />
              </section>

              <section className="space-y-2.5">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-primary/88">Up next</p>

                {upcomingTracks.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-white/8 bg-black/10 px-4 py-4 text-sm text-text-secondary">
                    No upcoming tracks in the queue right now.
                  </div>
                ) : (
                  <DndContext
                    sensors={reorderSensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleQueueDragStart}
                    onDragCancel={() => {
                      window.setTimeout(() => {
                        isQueueDragActiveRef.current = false
                      }, 0)
                    }}
                    onDragEnd={handleQueueDragEnd}
                  >
                    <SortableContext
                      items={upcomingTracks.map((item) => item.sortableId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2.5">
                        {upcomingTracks.map(({ track, absoluteIndex, sortableId }) => (
                          <SortableQueuePanelRow
                            key={sortableId}
                            id={sortableId}
                            track={track}
                            isFavorite={favoriteTrackIds.has(track.id)}
                            isReorderDisabled={isShuffleEnabled}
                            onPlay={() => {
                              playTrackInCurrentQueue(absoluteIndex)
                            }}
                            onRemove={() => {
                              removeFromQueueAt(absoluteIndex)
                              showToast({ title: 'Removed from queue', variant: 'success' })
                            }}
                            onFavorite={() => {
                              const wasFavorite = favoriteTrackIds.has(track.id)
                              void toggleFavorite(track)
                              showToast({ title: wasFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
                            }}
                            onGoToArtist={() => {
                              goToArtist(track)
                            }}
                            onShare={() => {
                              void shareTrack(track.shareUrl)
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </section>
            </div>
          </div>

        </motion.div>
      </div>
    </aside>
  )
}
function SortableQueuePanelRow({
  id,
  track,
  isFavorite,
  isReorderDisabled,
  onPlay,
  onRemove,
  onFavorite,
  onGoToArtist,
  onShare,
}: {
  id: string
  track: Track
  isFavorite: boolean
  isReorderDisabled: boolean
  onPlay: () => void
  onRemove: () => void
  onFavorite: () => void
  onGoToArtist: () => void
  onShare: () => void
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isReorderDisabled,
  })

  const dragHandleProps: DesktopQueueDragHandleProps = {
    attributes: attributes as ButtonHTMLAttributes<HTMLButtonElement>,
    listeners: listeners as ButtonHTMLAttributes<HTMLButtonElement> | undefined,
    setActivatorNodeRef,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}
      className={cn(
        'rounded-[1.3rem]',
        isDragging && 'relative z-10 opacity-90 shadow-[0_18px_44px_rgba(0,0,0,0.28)]',
      )}
    >
      <QueueTrackRow
        track={track}
        isCurrent={false}
        isPlaying={false}
        isFavorite={isFavorite}
        canRemove
        showReorderHandle
        isReorderDisabled={isReorderDisabled}
        dragHandleProps={dragHandleProps}
        onPlay={onPlay}
        onRemove={onRemove}
        onFavorite={onFavorite}
        onGoToArtist={onGoToArtist}
        onShare={onShare}
      />
    </div>
  )
}

