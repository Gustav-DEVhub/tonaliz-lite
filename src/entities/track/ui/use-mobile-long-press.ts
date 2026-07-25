import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
}

export function useMobileLongPress(onLongPress: () => void, disabled = false, delay = 360) {
  const timeoutRef = useRef<number | null>(null)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const didLongPressRef = useRef(false)

  const clearLongPress = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => clearLongPress, [])

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || !isMobileViewport() || event.pointerType === 'mouse') {
        return
      }

      const target = event.target as HTMLElement
      if (target.closest('button,a,input,textarea,select,[role="menu"],[data-ignore-long-press="true"]')) {
        return
      }

      startPointRef.current = { x: event.clientX, y: event.clientY }
      clearLongPress()
      timeoutRef.current = window.setTimeout(() => {
        didLongPressRef.current = true
        onLongPress()
      }, delay)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const startPoint = startPointRef.current

      if (!startPoint) {
        return
      }

      const deltaX = Math.abs(event.clientX - startPoint.x)
      const deltaY = Math.abs(event.clientY - startPoint.y)

      if (deltaX > 10 || deltaY > 10) {
        clearLongPress()
      }
    },
    onPointerUp: clearLongPress,
    onPointerCancel: clearLongPress,
    onClickCapture: (event: ReactMouseEvent<HTMLElement>) => {
      if (!didLongPressRef.current) {
        return
      }

      didLongPressRef.current = false
      event.preventDefault()
      event.stopPropagation()
    },
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
      if (!isMobileViewport()) {
        return
      }

      event.preventDefault()
    },
  }
}
