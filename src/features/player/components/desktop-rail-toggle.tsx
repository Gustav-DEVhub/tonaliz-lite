import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function DesktopRailToggle({
  variant,
  onClick,
  className,
}: {
  variant: 'open-button' | 'closed-bar'
  onClick: () => void
  className?: string
}) {
  if (variant === 'closed-bar') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Open side rail"
        className={cn(
          'absolute inset-y-0 right-0 z-20 hidden w-11 items-center justify-center rounded-l-[1.4rem] border border-r-0 border-white/10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--mood-accent)_12%,rgba(8,7,10,0.9)),rgba(9,8,12,0.96))] text-text-primary shadow-[-12px_0_32px_rgba(0,0,0,0.18)] transition-colors hover:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--mood-accent)_18%,rgba(10,9,13,0.96)),rgba(13,12,16,0.98))] lg:inline-flex',
          className,
        )}
      >
        <span className="inline-flex h-[78%] w-[1.05rem] items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          <PanelRightOpen className="size-3.5" />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close side rail"
      className={cn(
        'absolute left-4 top-4 z-20 inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--mood-accent)_18%,rgba(8,7,10,0.92)),rgba(10,9,13,0.96))] text-text-primary shadow-[0_10px_26px_rgba(0,0,0,0.28)] transition-colors hover:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--mood-accent)_24%,rgba(8,7,10,0.98)),rgba(14,12,18,0.98))]',
        className,
      )}
    >
      <PanelRightClose className="size-4" />
    </button>
  )
}
