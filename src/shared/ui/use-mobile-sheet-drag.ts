import {
  useCallback,
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
  const surfaceNodeRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<DragStart | null>(null)
  const dragDistanceRef = useRef(0)
  const suppressClickRef = useRef(false)
  const resetTimerRef = useRef<number | null>(null)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  const setSurfaceNode = useCallback((node: HTMLDivElement | null) => {
    surfaceNodeRef.current = node
  }, [])

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  const resetSurface = useCallback(() => {
    const surface = surfaceNodeRef.current
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
  }, [clearResetTimer])

  useEffect(() => {
    return clearResetTimer
  }, [clearResetTimer])

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
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

    const surface = surfaceNodeRef.current
    if (surface) {
      surface.style.transition = 'none'
      surface.style.willChange = 'transform'
    }
  }

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragStart = dragStartRef.current
    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.max(0, event.clientY - dragStart.y)
    dragDistanceRef.current = distance
    suppressClickRef.current = distance > 4

    const surface = surfaceNodeRef.current
    if (surface) {
      surface.style.transform = `translate3d(0, ${distance}px, 0)`
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

  const onHandleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
      return
    }

    onDismissRef.current()
  }

  return {
    setSurfaceNode,
    onHandleClick,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => finishDrag(event),
    onHandlePointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => finishDrag(event, true),
  }
}
