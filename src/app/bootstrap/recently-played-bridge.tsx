import { useEffect } from 'react'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useRecentlyPlayedStore } from '@/features/player/store/use-recently-played-store'

export function RecentlyPlayedBridge() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const recordTrack = useRecentlyPlayedStore((state) => state.recordTrack)

  useEffect(() => {
    if (!currentTrack || !isPlaying) {
      return
    }

    recordTrack(currentTrack)
  }, [currentTrack, isPlaying, recordTrack])

  return null
}
