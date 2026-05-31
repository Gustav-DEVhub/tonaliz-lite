import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'editorial-panel flex min-h-56 flex-col items-start justify-center gap-3 rounded-[1.75rem] px-4 py-6 sm:min-h-72 sm:px-6 sm:py-10',
        className,
      )}
    >
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-muted">No tracks yet</p>
      <div className="space-y-2">
        <h3 className="font-heading text-[1.45rem] leading-tight text-text-primary sm:text-[1.75rem]">{title}</h3>
        <p className="max-w-xl text-[0.94rem] leading-6 text-text-secondary sm:text-sm">{description}</p>
      </div>
      {action}
    </div>
  )
}
