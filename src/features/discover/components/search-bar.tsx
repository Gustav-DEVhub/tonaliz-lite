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

  if (compact) {
    return (
      <form
        className={`flex h-11 min-w-0 items-center gap-2 rounded-full border border-border-subtle bg-black/18 px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition-colors focus-within:border-primary ${className ?? ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tracks, artists, or moods"
            aria-label="Search tracks, artists, or moods"
            className="h-9 rounded-none border-transparent bg-transparent px-0 pr-8 text-sm shadow-none focus:border-transparent"
          />
          {hasQuery ? (
            <button
              type="button"
              className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary"
              onClick={() => {
                if (onClear) {
                  onClear()
                  return
                }

                onQueryChange('')
              }}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          disabled={disabled || !hasQuery}
          aria-label="Search"
        >
          <Search className="size-4" />
        </Button>
      </form>
    )
  }

  return (
    <form
      className={`editorial-panel rounded-[1.6rem] p-3 ${className ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tracks, artists, or moods"
            aria-label="Search tracks, artists, or moods"
            className="h-[3.25rem] flex-1 pr-11"
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
              <X className="size-4.5" />
            </button>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          className="sm:min-w-36"
          disabled={disabled || !hasQuery}
          aria-label="Search"
        >
          <Search className="size-4" />
          Search
        </Button>
      </div>
    </form>
  )
}
