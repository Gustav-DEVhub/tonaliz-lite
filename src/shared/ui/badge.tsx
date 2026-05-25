import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-text-secondary',
        className,
      )}
      {...props}
    />
  )
}
