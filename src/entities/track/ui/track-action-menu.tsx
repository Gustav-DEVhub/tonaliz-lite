import { ArrowLeft, Bookmark, BookmarkCheck, Copy, ExternalLink, Heart, ListPlus, MoreHorizontal, MoreVertical, PlayCircle, Share2, Trash2, UserRound } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Track } from '@/entities/track/model/types'
import { ShareTrackDialog } from '@/entities/track/ui/share-track-dialog'
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

interface TrackActionMenuProps {
  track: Track
  onPlayNext?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  isFavorite?: boolean
  onToggleFavorite?: (track: Track) => void
  onRemoveFromHistory?: (track: Track) => void
  onRemoveFromPlaylist?: (track: Track) => void
  onViewArtist?: (track: Track) => void
  shareContext?: ShareContextInfo | null
  variant?: 'default' | 'desktop'
  triggerClassName?: string
  menuClassName?: string
  triggerTooltipLabel?: string
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

export function TrackActionMenu({
  track,
  onPlayNext,
  onAddToQueue,
  isFavorite,
  onToggleFavorite,
  onRemoveFromHistory,
  onRemoveFromPlaylist,
  onViewArtist,
  shareContext,
  variant = 'default',
  triggerClassName,
  menuClassName,
  triggerTooltipLabel,
}: TrackActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isAddToPlaylistDialogOpen, setIsAddToPlaylistDialogOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<CSSProperties | null>(null)
  const showToast = useToastStore((state) => state.showToast)
  const isTrackSaved = useSavedTracksStore((state) => state.isTrackSaved(track.id))
  const saveTrack = useSavedTracksStore((state) => state.saveTrack)
  const removeTrack = useSavedTracksStore((state) => state.removeTrack)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const isDesktopVariant = variant === 'desktop'
  const trackUrl = track.shareUrl ?? null
  const jamendoTrackUrl = getJamendoTrackUrl(trackUrl)
  const trackShareTitle = `${track.name} - ${track.artistName}`
  const hasNativeShare = canUseNativeShare()

  const updateMenuPosition = useCallback(() => {
    if (!isDesktopVariant || !triggerRef.current) {
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 252
    const menuHeight = 360
    const viewportPadding = 12
    const left = Math.min(Math.max(viewportPadding, rect.right - menuWidth), window.innerWidth - menuWidth - viewportPadding)
    const preferredTop = rect.bottom + 8
    const top = preferredTop + menuHeight > window.innerHeight - viewportPadding
      ? Math.max(viewportPadding, rect.top - menuHeight - 8)
      : preferredTop

    setMenuPosition({ left, top, width: menuWidth })
  }, [isDesktopVariant])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false)
        setIsSharePanelOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isSharePanelOpen) {
          setIsSharePanelOpen(false)
          return
        }

        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    if (isDesktopVariant) {
      window.addEventListener('resize', updateMenuPosition)
      window.addEventListener('scroll', updateMenuPosition, true)
    }

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isDesktopVariant, isOpen, isSharePanelOpen, updateMenuPosition])

  useLayoutEffect(() => {
    if (isOpen && isDesktopVariant) {
      updateMenuPosition()
    }
  }, [isDesktopVariant, isOpen, updateMenuPosition])

  const closeMenu = () => {
    setIsOpen(false)
    setIsSharePanelOpen(false)
  }

  const notify = (title: string, variant: ToastVariant = 'success') => {
    showToast({ title, variant })
  }

  const handleCopy = async (text: string | null, successMessage: string) => {
    if (!text) {
      return
    }

    try {
      await copyTextToClipboard(text)
      notify(successMessage, 'success')
      closeMenu()
    } catch {
      notify("Couldn't share", 'error')
    }
  }

  const handleNativeShare = async () => {
    if (!trackUrl) {
      return
    }

    try {
      const didShare = await shareWithNativeSheet({
        title: trackShareTitle,
        text: `Listen to ${track.name} by ${track.artistName}`,
        url: trackUrl,
      })

      if (!didShare) {
        return
      }

      notify('Share opened', 'info')
      closeMenu()
    } catch {
      notify('Share cancelled', 'warning')
    }
  }

  const handleQueueAction = (action: ((track: Track) => void) | undefined, nextFeedback: string) => {
    if (!action) {
      return
    }

    action(track)
    notify(nextFeedback, 'success')
    closeMenu()
  }

  const handleFavoriteAction = () => {
    if (!onToggleFavorite) {
      return
    }

    onToggleFavorite(track)
    notify(isFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', 'success')
    closeMenu()
  }

  const handleLibraryAction = async () => {
    try {
      if (isTrackSaved) {
        await removeTrack(track.id)
        notify('Removed from Library', 'success')
      } else {
        await saveTrack(track)
        notify('Saved to Library', 'success')
      }
      closeMenu()
    } catch {
      notify(isTrackSaved ? 'Could not remove from Library' : 'Could not save to Library', 'error')
    }
  }

  const handleViewArtist = () => {
    if (!onViewArtist) {
      return
    }

    onViewArtist(track)
    closeMenu()
  }

  const handleRemoveFromHistory = () => {
    if (!onRemoveFromHistory) {
      return
    }

    onRemoveFromHistory(track)
    notify('Removed from history', 'success')
    closeMenu()
  }

  const handleRemoveFromPlaylist = () => {
    if (!onRemoveFromPlaylist) {
      return
    }

    onRemoveFromPlaylist(track)
    notify('Removed from playlist', 'success')
    closeMenu()
  }

  const menuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45'

  const menuPanel = (
    <div
      ref={menuRef}
      className={cn(
        'editorial-panel max-h-[min(28rem,calc(100vh-1.5rem))] overflow-y-auto rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)]',
        isDesktopVariant ? 'fixed z-[120]' : 'absolute right-0 top-12 z-30 w-60',
        menuClassName,
      )}
      style={isDesktopVariant ? menuPosition ?? undefined : undefined}
      onClick={(event) => event.stopPropagation()}
    >
      {!isSharePanelOpen ? (
        <div className="space-y-1">
          {onPlayNext ? (
            <button type="button" className={menuItemClassName} onClick={() => handleQueueAction(onPlayNext, 'Queued for next')}>
              <PlayCircle className="size-4" />
              Play next
            </button>
          ) : null}

          {onAddToQueue ? (
            <button type="button" className={menuItemClassName} onClick={() => handleQueueAction(onAddToQueue, 'Added to queue')}>
              <ListPlus className="size-4" />
              Add to queue
            </button>
          ) : null}

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
            <ListPlus className="size-4" />
            Add to playlist
          </button>

          {onToggleFavorite ? (
            <button type="button" className={menuItemClassName} onClick={handleFavoriteAction}>
              <Heart className={cn('size-4', isFavorite && 'fill-current text-primary-soft')} />
              {isFavorite ? 'Remove from Music I Like' : 'Add to Music I Like'}
            </button>
          ) : null}

          <button type="button" className={menuItemClassName} onClick={() => void handleLibraryAction()}>
            {isTrackSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {isTrackSaved ? 'Remove from Library' : 'Save to Library'}
          </button>

          {onRemoveFromHistory ? (
            <button type="button" className={menuItemClassName} onClick={handleRemoveFromHistory}>
              <Trash2 className="size-4" />
              Remove from history
            </button>
          ) : null}

          {onRemoveFromPlaylist ? (
            <button type="button" className={menuItemClassName} onClick={handleRemoveFromPlaylist}>
              <Trash2 className="size-4" />
              Remove from playlist
            </button>
          ) : null}

          {onViewArtist ? (
            <button type="button" className={menuItemClassName} onClick={handleViewArtist}>
              <UserRound className="size-4" />
              View artist
            </button>
          ) : null}

          {jamendoTrackUrl ? (
            <a href={jamendoTrackUrl} target="_blank" rel="noreferrer" className={menuItemClassName} onClick={closeMenu}>
              <ExternalLink className="size-4" />
              View on Jamendo
            </a>
          ) : null}

          {(isDesktopVariant ? trackUrl : trackUrl || shareContext?.url) ? (
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                if (isDesktopVariant && trackUrl) {
                  closeMenu()
                  setIsShareDialogOpen(true)
                  return
                }

                setIsSharePanelOpen(true)
              }}
            >
              <Share2 className="size-4" />
              Share
            </button>
          ) : null}

        </div>
      ) : (
        <div className="space-y-1">
          <button type="button" className={menuItemClassName} onClick={() => setIsSharePanelOpen(false)}>
            <ArrowLeft className="size-4" />
            Back
          </button>

          {hasNativeShare && trackUrl ? (
            <button type="button" className={menuItemClassName} onClick={() => void handleNativeShare()}>
              <Share2 className="size-4" />
              Share song
            </button>
          ) : null}

          {trackUrl ? (
            <button type="button" className={menuItemClassName} onClick={() => void handleCopy(trackUrl, 'Link copied')}>
              <Copy className="size-4" />
              Copy song link
            </button>
          ) : null}

          {shareContext?.url ? (
            <button type="button" className={menuItemClassName} onClick={() => void handleCopy(shareContext.url, `${shareContext.label} copied`)}>
              <Copy className="size-4" />
              Copy {shareContext.label}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )

  return (
    <div ref={rootRef} className={isDesktopVariant ? 'relative hidden lg:block' : 'group relative'}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'rounded-full border p-2 transition-all duration-200 ease-out',
          isOpen
            ? 'border-white/20 bg-white/8 text-text-primary'
            : 'border-border-subtle text-text-muted hover:text-text-primary',
          isDesktopVariant &&
            'pointer-events-none translate-y-1 scale-95 opacity-0 group-hover/track-actions:pointer-events-auto group-hover/track-actions:translate-y-0 group-hover/track-actions:scale-100 group-hover/track-actions:opacity-100 group-focus-within/track-actions:pointer-events-auto group-focus-within/track-actions:translate-y-0 group-focus-within/track-actions:scale-100 group-focus-within/track-actions:opacity-100',
          isDesktopVariant && isOpen && 'pointer-events-auto translate-y-0 scale-100 opacity-100',
          triggerClassName,
        )}
        onClick={(event) => {
          event.stopPropagation()
          setIsOpen((open) => {
            const nextOpen = !open
            if (!nextOpen) {
              setIsSharePanelOpen(false)
            }
            return nextOpen
          })
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-expanded={isOpen}
        aria-label="Track actions"
      >
        {isDesktopVariant ? <MoreVertical className="size-4" /> : <MoreHorizontal className="size-4" />}
      </button>
      {triggerTooltipLabel ? (
        <span className="pointer-events-none absolute -bottom-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 lg:block">
          {triggerTooltipLabel}
        </span>
      ) : null}

      {isOpen && (!isDesktopVariant || menuPosition)
        ? isDesktopVariant
          ? createPortal(menuPanel, document.body)
          : menuPanel
        : null}

      {isDesktopVariant && trackUrl && isShareDialogOpen ? (
        <ShareTrackDialog track={track} open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} />
      ) : null}
      {isAddToPlaylistDialogOpen ? (
        <AddToPlaylistDialog
          track={track}
          open
          onOpenChange={setIsAddToPlaylistDialogOpen}
        />
      ) : null}
    </div>
  )
}
