import { useEffect, useRef, useState } from 'react'

interface BrowsePullToRefreshOptions {
  enabled: boolean
  onRefresh: () => void | Promise<void>
  threshold?: number
}

export function useBrowsePullToRefresh({
  enabled,
  onRefresh,
  threshold = 78,
}: BrowsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const enabledRef = useRef(enabled)
  const onRefreshRef = useRef(onRefresh)
  const pullDistanceRef = useRef(0)
  const startYRef = useRef<number | null>(null)
  const startXRef = useRef<number | null>(null)
  const isPullingRef = useRef(false)
  const refreshTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    enabledRef.current = enabled
    onRefreshRef.current = onRefresh
  }, [enabled, onRefresh])

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const resetPullState = () => {
    startYRef.current = null
    startXRef.current = null
    isPullingRef.current = false
    pullDistanceRef.current = 0
    setPullDistance(0)
  }

  useEffect(() => {
    const node = containerRef.current

    if (!node) {
      return undefined
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (
        !enabledRef.current ||
        isRefreshing ||
        window.innerWidth >= 1024 ||
        window.scrollY > 2 ||
        event.touches.length !== 1
      ) {
        return
      }

      startYRef.current = event.touches[0].clientY
      startXRef.current = event.touches[0].clientX
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!enabledRef.current || startYRef.current === null || startXRef.current === null || window.innerWidth >= 1024) {
        return
      }

      const deltaY = event.touches[0].clientY - startYRef.current
      const deltaX = event.touches[0].clientX - startXRef.current
      const absDeltaX = Math.abs(deltaX)

      if (window.scrollY > 2 || deltaY <= 0 || absDeltaX > deltaY * 0.85) {
        if (isPullingRef.current) {
          resetPullState()
        }
        return
      }

      if (deltaY < 8) {
        return
      }

      isPullingRef.current = true
      const nextDistance = Math.min(deltaY * 0.55, 104)
      pullDistanceRef.current = nextDistance
      setPullDistance(nextDistance)

      if (event.cancelable) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!enabledRef.current || !isPullingRef.current) {
        resetPullState()
        return
      }

      const shouldRefresh = pullDistanceRef.current >= threshold
      resetPullState()

      if (!shouldRefresh) {
        return
      }

      setIsRefreshing(true)
      void Promise.resolve(onRefreshRef.current()).finally(() => {
        if (refreshTimeoutRef.current !== null) {
          window.clearTimeout(refreshTimeoutRef.current)
        }

        refreshTimeoutRef.current = window.setTimeout(() => {
          setIsRefreshing(false)
        }, 620)
      })
    }

    node.addEventListener('touchstart', handleTouchStart, { passive: true })
    node.addEventListener('touchmove', handleTouchMove, { passive: false })
    node.addEventListener('touchend', handleTouchEnd, { passive: true })
    node.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      node.removeEventListener('touchstart', handleTouchStart)
      node.removeEventListener('touchmove', handleTouchMove)
      node.removeEventListener('touchend', handleTouchEnd)
      node.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isRefreshing, threshold])

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isReadyToRefresh: pullDistance >= threshold,
    bind: {
      ref: containerRef,
    },
  }
}
