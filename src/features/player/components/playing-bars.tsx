import type { CSSProperties } from 'react'
import { cn } from '@/shared/lib/utils'

export function PlayingBars({
  isPlaying,
  className,
}: {
  isPlaying: boolean
  className?: string
}) {
  const idleHeights = [0.48, 0.82, 0.62, 0.9]
  const peakHeights = [0.96, 1, 0.88, 0.94]

  return (
    <span
      className={cn(
        'playing-bars inline-flex h-[15px] w-[22px] shrink-0 items-end gap-[2px] text-[color:color-mix(in_srgb,var(--mood-accent)_82%,white_18%)]',
        className,
      )}
      data-playing={isPlaying ? 'true' : 'false'}
      aria-hidden="true"
    >
      {idleHeights.map((idleHeight, index) => (
        <span
          key={`playing-bar-${index}`}
          className="playing-bars__bar block h-full w-[4px] rounded-full bg-current"
          style={{
            '--playing-bar-idle': idleHeight,
            '--playing-bar-peak': peakHeights[index],
            '--playing-bar-delay': `${index * -0.17}s`,
            '--playing-bar-duration': `${0.78 + index * 0.08}s`,
          } as CSSProperties}
        />
      ))}
    </span>
  )
}
