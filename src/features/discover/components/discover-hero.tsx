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
    <section className="editorial-panel relative overflow-hidden rounded-[1.7rem] px-3.5 py-2.5 sm:rounded-[2rem] sm:px-5 sm:py-3 lg:px-6 lg:py-3">
      <div className="absolute inset-y-0 right-0 hidden w-[24%] bg-[radial-gradient(circle_at_top_right,rgba(155,92,255,0.12),transparent_58%)] lg:block" />

      <div className="relative flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {discoverChips.map((chip) => (
            <Button
              key={chip.label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-white/12 bg-black/20 px-3 font-mono text-[0.72rem] tracking-[0.08em] text-text-primary"
              disabled={disabled}
              onClick={() => onSuggestionSelect(chip.query)}
            >
              {chip.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {recommendedSearches.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-border-subtle bg-black/15 px-3 text-[0.78rem] text-text-secondary hover:text-text-primary"
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
