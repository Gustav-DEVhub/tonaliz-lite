import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export function StatusPanel({
  title,
  message,
  action,
  className,
}: {
  title: string
  message: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('editorial-panel rounded-[1.75rem] p-4 sm:p-5', className)}>
      <p className="font-heading text-lg text-text-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
