import { Bookmark, BookmarkCheck, ExternalLink, Heart, ListPlus, PlayCircle, Share2, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import type { Track } from '@/entities/track/model/types'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { useSavedTracksStore } from '@/features/library/store/use-saved-tracks-store'
import { canUseNativeShare, copyTextToClipboard, shareWithNativeSheet } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'
import { useToastStore, type ToastVariant } from '@/shared/store/use-toast-store'

interface ShareContextInfo {
  label: string
  title: string
  url: string | null
}

interface MobileTrackActionSheetProps {
  open: boolean
  track: Track
  isFavorite?: boolean
  onOpenChange: (open: boolean) => void
  onPlay?: () => void
  onPlayNext?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  onToggleFavorite?: (track: Track) => void
  onRemoveFromHistory?: (track: Track) => void
  onRemoveFromPlaylist?: (track: Track) => void
  onViewArtist?: (track: Track) => void
  shareContext?: ShareContextInfo | null
  feedback?: (message: string) => void
}

function getJamendoTrackUrl(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'jamendo.com' || hostname.endsWith('.jamendo.com') ? value : null
  } catch {
    return null
  }
}

export function MobileTrackActionSheet({
  open,
  track,
  isFavorite = false,
  onOpenChange,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  onRemoveFromHistory,
  onRemoveFromPlaylist,
  onViewArtist,
  feedback,
}: MobileTrackActionSheetProps) {
  const [isAddToPlaylistDialogOpen, setIsAddToPlaylistDialogOpen] = useState(false)
  const dragControls = useDragControls()
  const shouldReduceMotion = useReducedMotion()
  const showToast = useToastStore((state) => state.showToast)
  const isTrackSaved = useSavedTracksStore((state) => state.isTrackSaved(track.id))
  const saveTrack = useSavedTracksStore((state) => state.saveTrack)
  const removeTrack = useSavedTracksStore((state) => state.removeTrack)
  const trackUrl = track.shareUrl ?? null
  const jamendoTrackUrl = getJamendoTrackUrl(trackUrl)
  const hasNativeShare = canUseNativeShare()
  const close = () => onOpenChange(false)
  const transition = shouldReduceMotion
    ? { duration: 0.12, ease: 'easeOut' as const }
    : { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.7 }

  const showFeedback = (message: string, variant: ToastVariant = 'success') => {
    if (feedback) {
      feedback(message)
      return
    }

    showToast({ title: message, variant })
  }

  const copyLink = async (url: string | null, message: string) => {
    if (!url) {
      return
    }

    try {
      await copyTextToClipboard(url)
      showFeedback(message, 'success')
      close()
    } catch {
      showFeedback("Couldn't share", 'error')
    }
  }

  const shareTrack = async () => {
    if (!trackUrl) {
      return
    }

    if (hasNativeShare) {
      const didShare = await shareWithNativeSheet({
        title: `${track.name} - ${track.artistName}`,
        text: `Listen to ${track.name} by ${track.artistName}`,
        url: trackUrl,
      })

      if (didShare) {
        showFeedback('Share opened', 'info')
        close()
        return
      }
    }

    await copyLink(trackUrl, 'Link copied')
  }

  const handleLibraryAction = async () => {
    try {
      if (isTrackSaved) {
        await removeTrack(track.id)
        showFeedback('Removed from Library', 'success')
      } else {
        await saveTrack(track)
        showFeedback('Saved to Library', 'success')
      }
      close()
    } catch {
      showFeedback(isTrackSaved ? 'Could not remove from Library' : 'Could not save to Library', 'error')
    }
  }

  const actionClassName =
    'flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.95rem] text-text-secondary transition-colors active:bg-white/8'

  const sheet = (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[118] bg-black/55 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.16 }}
            onClick={(event) => {
              event.stopPropagation()
              close()
            }}
            aria-label="Close track actions"
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-[119] rounded-t-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,29,0.98),rgba(10,8,16,0.99))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_58px_rgba(0,0,0,0.44)] lg:hidden"
            initial={{ opacity: 0, y: 96 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 96 }}
            transition={transition}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragDirectionLock
            dragElastic={0.08}
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 96 || info.velocity.y > 640) {
                close()
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mx-auto mb-3 block h-1.5 w-14 touch-none rounded-full bg-white/18"
              onPointerDown={(event) => {
                event.stopPropagation()
                dragControls.start(event)
              }}
              aria-label="Drag to close track actions"
            />

            <div className="mb-3 flex min-w-0 items-center gap-3">
              <img src={track.imageUrl} alt={`${track.name} artwork`} className="size-12 rounded-[0.95rem] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-heading text-[1rem] text-text-primary">{track.name}</p>
                <p className="mt-1 line-clamp-1 text-[0.84rem] text-text-secondary">{track.artistName}</p>
              </div>
            </div>

            <div className="space-y-1">
              {onPlay ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onPlay()
                    close()
                  }}
                >
                  <PlayCircle className="size-4.5" />
                  Play
                </button>
              ) : null}

              {onPlayNext ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onPlayNext(track)
                    showFeedback('Queued for next', 'success')
                    close()
                  }}
                >
                  <PlayCircle className="size-4.5" />
                  Play next
                </button>
              ) : null}

              {onAddToQueue ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onAddToQueue(track)
                    showFeedback('Added to queue', 'success')
                    close()
                  }}
                >
                  <ListPlus className="size-4.5" />
                  Add to queue
                </button>
              ) : null}

              <button
                type="button"
                className={actionClassName}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  close()
                  setIsAddToPlaylistDialogOpen(true)
                }}
              >
                <ListPlus className="size-4.5" />
                Add to playlist
              </button>

              {onToggleFavorite ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onToggleFavorite(track)
                    showFeedback(isFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', 'success')
                    close()
                  }}
                >
                  <Heart className={cn('size-4.5', isFavorite && 'fill-current text-primary-soft')} />
                  {isFavorite ? 'Remove from Music I Like' : 'Add to Music I Like'}
                </button>
              ) : null}

              <button type="button" className={actionClassName} onClick={() => void handleLibraryAction()}>
                {isTrackSaved ? <BookmarkCheck className="size-4.5" /> : <Bookmark className="size-4.5" />}
                {isTrackSaved ? 'Remove from Library' : 'Save to Library'}
              </button>

              {onRemoveFromHistory ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onRemoveFromHistory(track)
                    showFeedback('Removed from history', 'success')
                    close()
                  }}
                >
                  <Trash2 className="size-4.5" />
                  Remove from history
                </button>
              ) : null}

              {onRemoveFromPlaylist ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onRemoveFromPlaylist(track)
                    showFeedback('Removed from playlist', 'success')
                    close()
                  }}
                >
                  <Trash2 className="size-4.5" />
                  Remove from playlist
                </button>
              ) : null}

              {onViewArtist ? (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={() => {
                    onViewArtist(track)
                    close()
                  }}
                >
                  <UserRound className="size-4.5" />
                  View artist
                </button>
              ) : null}

              {jamendoTrackUrl ? (
                <a href={jamendoTrackUrl} target="_blank" rel="noreferrer" className={actionClassName} onClick={close}>
                  <ExternalLink className="size-4.5" />
                  View on Jamendo
                </a>
              ) : null}

              {trackUrl ? (
                <button type="button" className={actionClassName} onClick={() => void shareTrack()}>
                  <Share2 className="size-4.5" />
                  Share
                </button>
              ) : null}

            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )

  return typeof document === 'undefined'
    ? null
    : (
        <>
          {createPortal(sheet, document.body)}
          <AddToPlaylistDialog
            track={track}
            open={isAddToPlaylistDialogOpen}
            onOpenChange={setIsAddToPlaylistDialogOpen}
          />
        </>
      )
}
