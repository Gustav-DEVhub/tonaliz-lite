import { useEffect, useEffectEvent } from 'react'
import { AudioSyncBridge } from '@/app/bootstrap/audio-sync-bridge'
import { RecentlyPlayedBridge } from '@/app/bootstrap/recently-played-bridge'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { usePlaylistsStore } from '@/features/library/store/use-playlists-store'
import { useSavedCollectionsStore } from '@/features/library/store/use-saved-collections-store'
import { useSavedTracksStore } from '@/features/library/store/use-saved-tracks-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'

export function AppBootstrap() {
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites)
  const loadPlaylists = usePlaylistsStore((state) => state.loadPlaylists)
  const loadSavedCollections = useSavedCollectionsStore((state) => state.loadSavedCollections)
  const loadSavedTracks = useSavedTracksStore((state) => state.loadSavedTracks)
  const setOnlineStatus = usePlayerStore((state) => state.setOnlineStatus)

  const handleOnlineStatus = useEffectEvent(() => {
    setOnlineStatus(window.navigator.onLine)
  })

  useEffect(() => {
    void (async () => {
      const favoritesLoad = loadFavorites()
      const playlistsLoad = loadPlaylists()
      const collectionsLoad = loadSavedCollections()

      await favoritesLoad
      await loadSavedTracks(useFavoritesStore.getState().favorites)
      await Promise.all([playlistsLoad, collectionsLoad])
      handleOnlineStatus()
    })()

    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    return () => {
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
    }
  }, [loadFavorites, loadPlaylists, loadSavedCollections, loadSavedTracks])

  return (
    <>
      <AudioSyncBridge />
      <RecentlyPlayedBridge />
    </>
  )
}
