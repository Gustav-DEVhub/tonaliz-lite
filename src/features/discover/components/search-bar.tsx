import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export function SearchBar({
  query,
  onQueryChange,
  onSubmit,
  disabled,
  compact = false,
  className,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <form
      className={compact ? className : `editorial-panel rounded-[1.6rem] p-3 ${className ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col gap-3 sm:flex-row'}`}>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search tracks, artists, or moods"
          aria-label="Search independent music"
          className={compact ? 'h-11 flex-1 bg-black/20' : 'h-[3.25rem] flex-1'}
        />
        <Button
          type="submit"
          size={compact ? 'icon' : 'lg'}
          className={compact ? 'shrink-0' : 'sm:min-w-36'}
          disabled={disabled}
        >
          <Search className="size-4" />
          {compact ? null : 'Search'}
        </Button>
      </div>
    </form>
  )
}
