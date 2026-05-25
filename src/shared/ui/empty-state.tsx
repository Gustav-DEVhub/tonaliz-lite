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
        'editorial-panel flex min-h-72 flex-col items-start justify-center gap-4 rounded-[1.75rem] px-5 py-8 sm:px-6 sm:py-10',
        className,
      )}
    >
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">No tracks yet</p>
      <div className="space-y-2">
        <h3 className="font-heading text-2xl text-text-primary sm:text-[1.75rem]">{title}</h3>
        <p className="max-w-xl text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  )
}
