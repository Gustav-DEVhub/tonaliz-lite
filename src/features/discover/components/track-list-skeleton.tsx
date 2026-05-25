import { Skeleton } from '@/shared/ui/skeleton'

export function TrackListSkeleton() {
  return (
    <div className="hidden gap-3 xl:grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="editorial-panel grid grid-cols-[4.75rem_minmax(0,1.5fr)_8rem_10rem_8.5rem] items-center gap-4 rounded-[1.5rem] px-4 py-3"
        >
          <Skeleton className="size-[4.75rem] rounded-[1rem]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
          <div className="ml-auto flex gap-2">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
