import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-full border border-border-subtle bg-panel-bg px-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary',
        className,
      )}
      {...props}
    />
  )
}
