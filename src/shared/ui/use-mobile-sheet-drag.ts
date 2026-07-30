import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type DragStart = {
  pointerId: number
  y: number
  time: number
}

export function useMobileSheetDrag(onDismiss: () => void) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<DragStart | null>(null)
  const dragDistanceRef = useRef(0)
  const suppressClickRef = useRef(false)
  const resetTimerRef = useRef<number | null>(null)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const clearResetTimer = () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }

  const resetSurface = () => {
    const surface = surfaceRef.current
    if (!surface) {
      return
    }

    clearResetTimer()
    surface.style.transition = 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)'
    surface.style.transform = ''
    resetTimerRef.current = window.setTimeout(() => {
      surface.style.transition = ''
      surface.style.willChange = ''
      resetTimerRef.current = null
    }, 170)
  }

  useEffect(() => {
    return clearResetTimer
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    clearResetTimer()
    dragStartRef.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      time: performance.now(),
    }
    dragDistanceRef.current = 0
    suppressClickRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)

    if (surfaceRef.current) {
      surfaceRef.current.style.transition = 'none'
      surfaceRef.current.style.willChange = 'transform'
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragStart = dragStartRef.current
    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.max(0, event.clientY - dragStart.y)
    dragDistanceRef.current = distance
    suppressClickRef.current = distance > 4

    if (surfaceRef.current) {
      surfaceRef.current.style.transform = `translate3d(0, ${distance}px, 0)`
    }

    event.preventDefault()
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const dragStart = dragStartRef.current
    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return
    }

    const distance = dragDistanceRef.current
    const elapsed = Math.max(1, performance.now() - dragStart.time)
    const velocity = distance / elapsed
    const shouldDismiss = !cancelled && (distance >= 88 || (distance >= 24 && velocity >= 0.55))

    dragStartRef.current = null
    dragDistanceRef.current = 0

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (shouldDismiss) {
      onDismissRef.current()
      return
    }

    resetSurface()
  }

  const onClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
      return
    }

    onDismissRef.current()
  }

  return {
    surfaceRef,
    dragHandleProps: {
      onClick,
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => finishDrag(event),
      onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => finishDrag(event, true),
    },
  }
}
