import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-black/30 px-2.5 py-[0.32rem] font-mono text-[0.74rem] leading-none tracking-[0.06em] text-text-secondary sm:text-[0.72rem] sm:tracking-[0.1em]',
        className,
      )}
      {...props}
    />
  )
}
