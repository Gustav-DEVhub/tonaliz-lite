import { motion } from 'motion/react'
import { cn } from '@/shared/lib/utils'

export function PlayingBars({
  isPlaying,
  className,
}: {
  isPlaying: boolean
  className?: string
}) {
  const idleHeights = [0.48, 0.82, 0.62, 0.9]
  const animatedHeights = [
    [0.34, 0.96, 0.52, 0.9],
    [0.92, 0.38, 1, 0.56],
    [0.48, 0.88, 0.42, 1],
    [0.84, 0.52, 0.94, 0.36],
  ]
  const shouldAnimate = isPlaying

  return (
    <span
      className={cn(
        'inline-flex h-[15px] w-[22px] shrink-0 items-end gap-[2px] text-[color:color-mix(in_srgb,var(--mood-accent)_82%,white_18%)]',
        className,
      )}
      aria-hidden="true"
    >
      {idleHeights.map((idleHeight, index) => (
        <motion.span
          key={`playing-bar-${index}`}
          className="block h-full w-[4px] rounded-full bg-current"
          style={{ transformOrigin: 'bottom' }}
          initial={false}
          animate={{
            scaleY: shouldAnimate ? animatedHeights[index] : idleHeight,
            opacity: shouldAnimate ? [0.52, 1, 0.7, 0.95] : 0.78,
          }}
          transition={{
            duration: shouldAnimate ? 0.88 + index * 0.11 : 0.18,
            ease: 'easeInOut',
            repeat: shouldAnimate ? Infinity : 0,
            repeatType: 'mirror',
          }}
        />
      ))}
    </span>
  )
}
