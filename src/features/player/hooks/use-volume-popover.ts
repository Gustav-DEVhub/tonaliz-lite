import { useCallback, useEffect, useRef, useState } from 'react'

const VOLUME_HIDE_DELAY_MS = 900

export function useVolumePopover() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const showPopover = useCallback(() => {
    clearHideTimeout()
    setIsVisible(true)
  }, [clearHideTimeout])

  const hidePopover = useCallback(() => {
    clearHideTimeout()
    setIsVisible(false)
  }, [clearHideTimeout])

  const scheduleHide = useCallback((ignoreDragging = false) => {
    clearHideTimeout()

    if (isDraggingVolume && !ignoreDragging) {
      return
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, VOLUME_HIDE_DELAY_MS)
  }, [clearHideTimeout, isDraggingVolume])

  const startDragging = useCallback(() => {
    clearHideTimeout()
    setIsVisible(true)
    setIsDraggingVolume(true)
  }, [clearHideTimeout])

  const stopDragging = useCallback(() => {
    setIsDraggingVolume(false)
    scheduleHide(true)
  }, [scheduleHide])

  useEffect(() => {
    if (!isDraggingVolume) {
      return
    }

    const handlePointerUp = () => {
      stopDragging()
    }

    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDraggingVolume, stopDragging])

  useEffect(() => {
    return () => {
      clearHideTimeout()
    }
  }, [clearHideTimeout])

  return {
    isVisible,
    hidePopover,
    scheduleHide,
    showPopover,
    startDragging,
    stopDragging,
  }
}
