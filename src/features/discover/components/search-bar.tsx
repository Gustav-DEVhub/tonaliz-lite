import { Search, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export function SearchBar({
  query,
  onQueryChange,
  onSubmit,
  onClear,
  disabled,
  compact = false,
  className,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  onClear?: () => void
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  const hasQuery = query.trim().length > 0

  return (
    <form
      className={compact ? className : `editorial-panel rounded-[1.6rem] p-3 ${className ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col gap-3 sm:flex-row'}`}>
        <div className="relative min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tracks, artists, or moods"
            aria-label="Search tracks, artists, or moods"
            className={compact ? 'h-10 flex-1 rounded-[1.2rem] bg-black/18 pr-10 pl-3 text-sm' : 'h-[3.25rem] flex-1 pr-11'}
          />
          {hasQuery ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary"
              onClick={() => {
                if (onClear) {
                  onClear()
                  return
                }

                onQueryChange('')
              }}
              aria-label="Clear search"
            >
              <X className={compact ? 'size-4' : 'size-4.5'} />
            </button>
          ) : null}
        </div>
        <Button
          type="submit"
          size={compact ? 'icon' : 'lg'}
          className={compact ? 'size-10 shrink-0 rounded-full' : 'sm:min-w-36'}
          disabled={disabled || !hasQuery}
          aria-label="Search"
        >
          <Search className="size-4" />
          {compact ? null : 'Search'}
        </Button>
      </div>
    </form>
  )
}
