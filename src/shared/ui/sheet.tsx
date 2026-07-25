/* eslint-disable react-refresh/only-export-components */
import * as Dialog from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close

export function SheetContent({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/78" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] flex-col gap-6 border-r border-border-subtle bg-panel-bg/95 px-5 py-6 text-text-primary shadow-2xl outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute top-4 right-4 rounded-full border border-border-subtle p-2 text-text-secondary transition-colors hover:text-text-primary">
          <X className="size-4" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
