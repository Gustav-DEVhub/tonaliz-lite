import * as Dialog from '@radix-ui/react-dialog'
import { Copy, ExternalLink, Link, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'

interface ShareLinkDialogProps {
  title: string
  description?: string
  url: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  externalHref?: string | null
  externalLabel?: string
}

export function ShareLinkDialog({
  title,
  description,
  url,
  open,
  onOpenChange,
  externalHref = null,
  externalLabel = 'Open link',
}: ShareLinkDialogProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const showToast = useToastStore((state) => state.showToast)

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  if (!url && !externalHref) {
    return null
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFeedback(null)
    }

    onOpenChange(nextOpen)
  }

  const handleCopy = async () => {
    if (!url) {
      showToast({ title: 'No share link available', variant: 'warning' })
      return
    }

    try {
      await copyTextToClipboard(url)
      setFeedback('Copied')
      showToast({ title: 'Link copied', variant: 'success' })

      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }

      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null)
      }, 1800)
    } catch {
      setFeedback(null)
      showToast({ title: "Couldn't share", variant: 'error' })
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[130] hidden bg-black/70 backdrop-blur-sm lg:block" />
          <Dialog.Content
            className="editorial-panel fixed left-1/2 top-1/2 z-[131] hidden w-[min(30rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 rounded-[1.7rem] border border-white/12 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.58)] outline-none lg:block"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-heading text-xl text-text-primary">Share</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 line-clamp-2 text-sm text-text-secondary">
                    {description}
                  </Dialog.Description>
                ) : null}
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

            <div className="mt-5 space-y-3">
              {url ? (
                <div className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-2 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-text-muted">
                    <Link className="size-3.5" />
                    Share link
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="min-w-0 flex-1 rounded-xl border border-white/8 bg-black/28 px-3 py-2 text-sm text-text-secondary outline-none"
                      aria-label={`${title} share link`}
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
              ) : null}

              {externalHref ? (
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.05rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-text-primary transition-colors hover:bg-white/10"
                >
                  <ExternalLink className="size-4" />
                  {externalLabel}
                </a>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {open ? (
        <>
            <button
              type="button"
              className="mobile-sheet-overlay-enter fixed inset-0 z-[130] bg-black/68 lg:hidden"
              onClick={() => handleOpenChange(false)}
              aria-label="Close share dialog"
            />
            <div
              className="mobile-sheet-enter mobile-sheet-surface fixed inset-x-0 bottom-0 z-[131] max-h-[88dvh] overflow-y-auto rounded-t-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,29,0.99),rgba(10,8,16,1))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-16px_42px_rgba(0,0,0,0.38)] lg:hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="mx-auto mb-3 block h-1.5 w-14 rounded-full bg-white/18"
                onClick={() => handleOpenChange(false)}
                aria-label="Close share dialog"
              />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-[1.25rem] text-text-primary">Share</h2>
                  {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
                </div>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary"
                  onClick={() => handleOpenChange(false)}
                  aria-label="Close share dialog"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <div className="space-y-2">
                {url ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => void handleCopy()}
                  >
                    <Copy className="size-4.5" />
                    {feedback === 'Copied' ? 'Copied' : 'Copy link'}
                  </button>
                ) : null}

                {externalHref ? (
                  <a
                    href={externalHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left text-[0.98rem] text-text-secondary transition-colors active:bg-white/8"
                    onClick={() => handleOpenChange(false)}
                  >
                    <ExternalLink className="size-4.5" />
                    {externalLabel}
                  </a>
                ) : null}
              </div>
            </div>
        </>
      ) : null}
    </>
  )
}
