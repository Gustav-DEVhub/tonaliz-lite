import { useEffect } from 'react'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useRecentlyPlayedStore } from '@/features/player/store/use-recently-played-store'

export function RecentlyPlayedBridge() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const recordTrack = useRecentlyPlayedStore((state) => state.recordTrack)

  useEffect(() => {
    if (!currentTrack) {
      return
    }

    recordTrack(currentTrack)
  }, [currentTrack, recordTrack])

  return null
}
