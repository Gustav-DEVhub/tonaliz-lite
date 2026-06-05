import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/utils'

interface MarqueeTextProps {
  text: string
  className?: string
  duration?: number
  disabled?: boolean
}

export function MarqueeText({ text, className, duration = 14, disabled = false }: MarqueeTextProps) {
  const duplicateGapPx = 32
  const containerRef = useRef<HTMLSpanElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const shouldAnimate = isOverflowing && contentWidth > 0 && !disabled

  useEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current

    if (!container || !measure) {
      return
    }

    const updateOverflow = () => {
      const nextContentWidth = Math.ceil(measure.getBoundingClientRect().width)
      setContentWidth(nextContentWidth)
      setIsOverflowing(nextContentWidth > container.clientWidth + 1)
    }

    const frame = window.requestAnimationFrame(updateOverflow)

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOverflow)

      return () => {
        window.cancelAnimationFrame(frame)
        window.removeEventListener('resize', updateOverflow)
      }
    }

    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(container)
    resizeObserver.observe(measure)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [text])

  return (
    <span
      ref={containerRef}
      className={cn('relative block min-w-0 overflow-hidden whitespace-nowrap', className)}
      title={text}
    >
      <span ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap">
        {text}
      </span>

      {shouldAnimate ? (
        <motion.span
          key={`${text}-${contentWidth}`}
          className="inline-flex min-w-max items-center whitespace-nowrap"
          initial={{ x: 0 }}
          animate={{ x: -(contentWidth + duplicateGapPx) }}
          transition={{
            duration,
            ease: 'linear',
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
          style={{ willChange: 'transform' }}
        >
          <span className="shrink-0 pr-8">{text}</span>
          <span className="shrink-0" aria-hidden="true">
            {text}
          </span>
        </motion.span>
      ) : (
        <span className="block truncate">{text}</span>
      )}
    </span>
  )
}
