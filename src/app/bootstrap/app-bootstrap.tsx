import { useEffect, useEffectEvent } from 'react'
import { AudioSyncBridge } from '@/app/bootstrap/audio-sync-bridge'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'

export function AppBootstrap() {
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites)
  const setOnlineStatus = usePlayerStore((state) => state.setOnlineStatus)

  const handleOnlineStatus = useEffectEvent(() => {
    setOnlineStatus(window.navigator.onLine)
  })

  useEffect(() => {
    void loadFavorites()
    handleOnlineStatus()

    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    return () => {
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
    }
  }, [loadFavorites])

  return <AudioSyncBridge />
}
