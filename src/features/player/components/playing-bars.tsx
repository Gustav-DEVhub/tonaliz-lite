import { motion } from 'motion/react'
import { cn } from '@/shared/lib/utils'

export function PlayingBars({
  isPlaying,
  className,
}: {
  isPlaying: boolean
  className?: string
}) {
  const idleHeights = [0.55, 0.9, 0.65]
  const animatedHeights = [
    [0.45, 0.95, 0.55],
    [0.9, 0.4, 1],
    [0.55, 0.85, 0.5],
  ]

  return (
    <span className={cn('inline-flex h-3 items-end gap-[3px] text-[var(--mood-accent)]', className)} aria-hidden="true">
      {idleHeights.map((idleHeight, index) => (
        <motion.span
          key={`playing-bar-${index}`}
          className="block w-[3px] rounded-full bg-current"
          style={{ transformOrigin: 'bottom' }}
          initial={false}
          animate={{
            scaleY: isPlaying ? animatedHeights[index] : idleHeight,
          }}
          transition={{
            duration: isPlaying ? 0.72 + index * 0.08 : 0.18,
            ease: 'easeInOut',
            repeat: isPlaying ? Infinity : 0,
            repeatType: 'mirror',
          }}
        />
      ))}
    </span>
  )
}
