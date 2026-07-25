import * as Dialog from '@radix-ui/react-dialog'
import { Copy, Link, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Track } from '@/entities/track/model/types'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'

interface ShareTrackDialogProps {
  track: Track
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareTrackDialog({ track, open, onOpenChange }: ShareTrackDialogProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const showToast = useToastStore((state) => state.showToast)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const trackUrl = track.shareUrl

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  if (!trackUrl) {
    return null
  }

  const title = `${track.name} - ${track.artistName}`
  const encodedUrl = encodeURIComponent(trackUrl)
  const encodedTitle = encodeURIComponent(title)
  const encodedMessage = encodeURIComponent(`Listen to ${title}: ${trackUrl}`)
  const shareTargets = [
    { label: 'WhatsApp', mark: 'WA', href: `https://wa.me/?text=${encodedMessage}` },
    { label: 'Facebook', mark: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'X', mark: 'X', href: `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Email', mark: '@', href: `mailto:?subject=${encodedTitle}&body=${encodedMessage}` },
    { label: 'Reddit', mark: 'r', href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
    {
      label: 'Pinterest',
      mark: 'P',
      href: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(track.imageUrl)}&description=${encodedTitle}`,
    },
  ]

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFeedback(null)
    }
    onOpenChange(nextOpen)
  }

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(trackUrl)
      setFeedback('Copied')
      showToast({ title: 'Link copied', variant: 'success' })

      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }

      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null)
      }, 1800)
    } catch {
      setFeedback("Couldn't share")
      showToast({ title: "Couldn't share", variant: 'error' })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[130] hidden bg-black/78 data-[state=closed]:animate-out data-[state=open]:animate-in lg:block" />
        <Dialog.Content
          className="editorial-panel fixed left-1/2 top-1/2 z-[131] hidden w-[min(34rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 rounded-[1.7rem] border border-white/12 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.58)] outline-none lg:block"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-xl text-text-primary">Share</Dialog.Title>
              <Dialog.Description className="mt-1 line-clamp-1 text-sm text-text-secondary">
                {track.name} by {track.artistName}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
                aria-label="Close share dialog"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {shareTargets.map((target) => (
              <a
                key={target.label}
                href={target.href}
                target={target.label === 'Email' ? undefined : '_blank'}
                rel={target.label === 'Email' ? undefined : 'noreferrer'}
                className="group/share flex min-w-0 flex-col items-center gap-2 rounded-[1rem] border border-white/8 bg-white/[0.035] px-2 py-3 text-center text-[0.72rem] text-text-secondary transition-all hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.07] hover:text-text-primary"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/28 font-heading text-sm text-text-primary transition-colors group-hover/share:border-primary/35 group-hover/share:bg-primary/12">
                  {target.mark}
                </span>
                <span className="truncate">{target.label}</span>
              </a>
            ))}
          </div>

          <div className="mt-5 rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-text-muted">
              <Link className="size-3.5" />
              Track link
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={trackUrl}
                className="min-w-0 flex-1 rounded-xl border border-white/8 bg-black/28 px-3 py-2 text-sm text-text-secondary outline-none"
                aria-label="Track share link"
              />
              <button
                type="button"
                className={cn(
                  'inline-flex h-10 min-w-20 items-center justify-center gap-2 rounded-xl border px-3 text-sm transition-colors',
                  feedback === 'Copied'
                    ? 'border-primary/40 bg-primary/16 text-primary-soft'
                    : 'border-white/12 bg-white/6 text-text-primary hover:bg-white/10',
                )}
                onClick={() => void handleCopy()}
              >
                <Copy className="size-4" />
                {feedback ?? 'Copy'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
