import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const discoverChips = [
  { key: 'chip-new', label: 'New', query: 'dream pop' },
  { key: 'chip-moods', label: 'Moods', query: 'ambient' },
  { key: 'chip-genres', label: 'Genres', query: 'indie rock' },
  { key: 'chip-focus', label: 'Focus', query: 'lofi' },
] as const

const recommendedSearches = ['dream pop', 'ambient', 'indie rock', 'lofi']

export function DiscoverHero({
  onSuggestionSelect,
  activeSuggestionKey = null,
  disabled = false,
}: {
  onSuggestionSelect: (value: string, key: string) => void
  activeSuggestionKey?: string | null
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
              className={cn(
                'h-8 rounded-full border px-3 font-mono text-[0.72rem] tracking-[0.08em] lg:h-7 lg:px-2.5 lg:text-[0.68rem]',
                activeSuggestionKey === chip.key
                  ? 'border-primary/35 bg-primary/12 text-text-primary'
                  : 'border-white/12 bg-black/20 text-text-primary lg:border-white/10',
              )}
              disabled={disabled}
              aria-pressed={activeSuggestionKey === chip.key}
              onClick={() => onSuggestionSelect(chip.query, chip.key)}
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
              className={cn(
                'h-8 rounded-full border px-3 text-[0.78rem] hover:text-text-primary lg:h-7 lg:px-2.5 lg:text-[0.72rem]',
                activeSuggestionKey === `suggestion-${suggestion}`
                  ? 'border-primary/35 bg-primary/12 text-text-primary'
                  : 'border-border-subtle bg-black/15 text-text-secondary',
              )}
              disabled={disabled}
              aria-pressed={activeSuggestionKey === `suggestion-${suggestion}`}
              onClick={() => onSuggestionSelect(suggestion, `suggestion-${suggestion}`)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}

