import { Button } from '@/shared/ui/button'

const discoverChips = [
  { label: 'New', query: 'dream pop' },
  { label: 'Moods', query: 'ambient' },
  { label: 'Genres', query: 'indie rock' },
  { label: 'Focus', query: 'lofi' },
] as const

const recommendedSearches = ['dream pop', 'ambient', 'indie rock', 'lofi']

export function DiscoverHero({
  onSuggestionSelect,
  disabled = false,
}: {
  onSuggestionSelect: (value: string) => void
  disabled?: boolean
}) {
  return (
    <section className="editorial-panel editorial-panel-flat-desktop relative overflow-hidden rounded-[1.7rem] px-3.5 py-2.5 sm:rounded-[2rem] sm:px-5 sm:py-3 lg:rounded-none lg:px-0 lg:py-0">
      <div className="relative flex flex-col gap-2.5 lg:gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-1.5">
          {discoverChips.map((chip) => (
            <Button
              key={chip.label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-white/12 bg-black/20 px-3 font-mono text-[0.72rem] tracking-[0.08em] text-text-primary lg:h-7 lg:border-white/10 lg:px-2.5 lg:text-[0.68rem]"
              disabled={disabled}
              onClick={() => onSuggestionSelect(chip.query)}
            >
              {chip.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 lg:gap-1.5">
          {recommendedSearches.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-border-subtle bg-black/15 px-3 text-[0.78rem] text-text-secondary hover:text-text-primary lg:h-7 lg:px-2.5 lg:text-[0.72rem]"
              disabled={disabled}
              onClick={() => onSuggestionSelect(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}

