import { Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'

const recommendedSearches = ['dream pop', 'ambient', 'indie rock', 'lofi']

export function DiscoverHero({
  onSuggestionSelect,
  disabled = false,
}: {
  onSuggestionSelect: (value: string) => void
  disabled?: boolean
}) {
  return (
    <section className="editorial-panel relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(155,92,255,0.24),transparent_52%)] lg:block" />
      <div className="relative max-w-3xl space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.22em] text-text-secondary">
          <Sparkles className="size-3.5 text-secondary-safe" />
          Independent discovery
        </div>
        <div className="space-y-3">
          <h1 className="max-w-2xl font-heading text-4xl leading-tight text-text-primary sm:text-5xl">
            Discover independent tracks with a player that reacts to the mood of what you hear.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-text-secondary">
            Tonaliz Lite turns Jamendo search into a lightweight music experience with persistent favorites,
            a responsive player, and a visual atmosphere tuned by simple mood rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {recommendedSearches.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="ghost"
              size="sm"
              className="border border-border-subtle bg-black/15"
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
