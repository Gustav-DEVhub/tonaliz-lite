import { ArrowLeft, Copy, ListPlus, MoreHorizontal, PlayCircle, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Track } from '@/entities/track/model/types'
import { canUseNativeShare, copyTextToClipboard, shareWithNativeSheet } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'

interface ShareContextInfo {
  label: string
  title: string
  url: string | null
}

interface TrackActionMenuProps {
  track: Track
  onPlayNext?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  shareContext?: ShareContextInfo | null
  triggerClassName?: string
  menuClassName?: string
  feedbackClassName?: string
  triggerTooltipLabel?: string
}

export function TrackActionMenu({
  track,
  onPlayNext,
  onAddToQueue,
  shareContext,
  triggerClassName,
  menuClassName,
  feedbackClassName,
  triggerTooltipLabel,
}: TrackActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const trackUrl = track.shareUrl ?? null
  const trackShareTitle = `${track.name} - ${track.artistName}`
  const hasNativeShare = canUseNativeShare()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
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

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isSharePanelOpen])

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
    setIsOpen(false)
    setIsSharePanelOpen(false)
  }

  const setActionFeedback = (message: string) => {
    setFeedback(message)
  }

  const handleCopy = async (text: string | null, successMessage: string) => {
    if (!text) {
      return
    }

    try {
      await copyTextToClipboard(text)
      setActionFeedback(successMessage)
      closeMenu()
    } catch {
      setActionFeedback('Copy failed')
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

      setActionFeedback('Share opened')
      closeMenu()
    } catch {
      setActionFeedback('Share cancelled')
    }
  }

  const handleQueueAction = (action: ((track: Track) => void) | undefined, nextFeedback: string) => {
    if (!action) {
      return
    }

    action(track)
    setActionFeedback(nextFeedback)
    closeMenu()
  }

  const menuItemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        className={cn(
          'rounded-full border p-2 transition-colors',
          isOpen
            ? 'border-white/20 bg-white/8 text-text-primary'
            : 'border-border-subtle text-text-muted hover:text-text-primary',
          triggerClassName,
        )}
        onClick={() => {
          setIsOpen((open) => {
            const nextOpen = !open
            if (!nextOpen) {
              setIsSharePanelOpen(false)
            }
            return nextOpen
          })
        }}
        aria-expanded={isOpen}
        aria-label="Track actions"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {triggerTooltipLabel ? (
        <span className="pointer-events-none absolute -bottom-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 lg:block">
          {triggerTooltipLabel}
        </span>
      ) : null}

      {isOpen ? (
        <div
          className={cn(
            'editorial-panel absolute right-0 top-12 z-30 w-60 rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)]',
            menuClassName,
          )}
        >
          {!isSharePanelOpen ? (
            <div className="space-y-1">
              {onPlayNext ? (
                <button
                  type="button"
                  className={menuItemClassName}
                  onClick={() => {
                    handleQueueAction(onPlayNext, 'Queued for next')
                  }}
                >
                  <PlayCircle className="size-4" />
                  Play next
                </button>
              ) : null}

              {onAddToQueue ? (
                <button
                  type="button"
                  className={menuItemClassName}
                  onClick={() => {
                    handleQueueAction(onAddToQueue, 'Added to queue')
                  }}
                >
                  <ListPlus className="size-4" />
                  Add to queue
                </button>
              ) : null}

              {(trackUrl || shareContext?.url) ? (
                <button
                  type="button"
                  className={menuItemClassName}
                  onClick={() => {
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
              <button
                type="button"
                className={menuItemClassName}
                onClick={() => {
                  setIsSharePanelOpen(false)
                }}
              >
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
                <button
                  type="button"
                  className={menuItemClassName}
                  onClick={() => {
                    void handleCopy(trackUrl, 'Song link copied')
                  }}
                >
                  <Copy className="size-4" />
                  Copy song link
                </button>
              ) : null}

              {shareContext?.url ? (
                <button
                  type="button"
                  className={menuItemClassName}
                  onClick={() => {
                    void handleCopy(shareContext.url, `${shareContext.label} copied`)
                  }}
                >
                  <Copy className="size-4" />
                  Copy {shareContext.label}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={cn(
            'pointer-events-none absolute right-0 top-12 mt-2 rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary',
            feedbackClassName,
          )}
        >
          {feedback}
        </div>
      ) : null}
    </div>
  )
}
