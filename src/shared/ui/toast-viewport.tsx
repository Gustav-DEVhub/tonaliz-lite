import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, type ComponentType } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useToastStore, type ToastItem, type ToastVariant } from '@/shared/store/use-toast-store'
import { cn } from '@/shared/lib/utils'

const variantStyles: Record<ToastVariant, { icon: ComponentType<{ className?: string }>; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-300/20 bg-emerald-400/12 text-emerald-100',
  },
  info: {
    icon: Info,
    className: 'border-primary/25 bg-primary/12 text-primary-soft',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-300/22 bg-amber-400/12 text-amber-100',
  },
  error: {
    icon: XCircle,
    className: 'border-red-300/25 bg-red-400/12 text-red-100',
  },
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismissToast = useToastStore((state) => state.dismissToast)
  const shouldReduceMotion = useReducedMotion()
  const variant = variantStyles[toast.variant]
  const Icon = variant.icon

  useEffect(() => {
    if (toast.duration <= 0) {
      return
    }

    const timeout = window.setTimeout(() => dismissToast(toast.id), toast.duration)
    return () => window.clearTimeout(timeout)
  }, [dismissToast, toast.duration, toast.id])

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
      transition={shouldReduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 430, damping: 34, mass: 0.7 }}
      className="pointer-events-auto overflow-hidden rounded-[1.15rem] border border-white/10 bg-[rgba(17,14,24,0.94)] p-3 text-text-primary shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border', variant.className)}>
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm leading-snug text-text-primary">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{toast.description}</p>
          ) : null}

          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              className="mt-2 rounded-full border border-white/12 bg-white/7 px-3 py-1 text-xs font-semibold text-text-primary transition-colors hover:bg-white/12"
              onClick={() => {
                toast.onAction?.()
                dismissToast(toast.id)
              }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
          onClick={() => dismissToast(toast.id)}
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+7.25rem)] z-[260] flex flex-col-reverse gap-2 md:inset-x-auto md:bottom-auto md:right-5 md:top-20 md:w-[min(24rem,calc(100vw-2rem))] md:flex-col">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
