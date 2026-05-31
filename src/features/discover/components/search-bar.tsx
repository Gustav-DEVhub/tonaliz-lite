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
          className={compact ? 'h-10 flex-1 rounded-[1.2rem] bg-black/18 px-3 text-sm' : 'h-[3.25rem] flex-1'}
        />
        <Button
          type="submit"
          size={compact ? 'icon' : 'lg'}
          className={compact ? 'size-10 shrink-0 rounded-full' : 'sm:min-w-36'}
          disabled={disabled}
        >
          <Search className="size-4" />
          {compact ? null : 'Search'}
        </Button>
      </div>
    </form>
  )
}
