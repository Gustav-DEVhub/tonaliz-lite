import { create } from 'zustand'
import type { Favorite, Track } from '@/entities/track/model/types'
import {
  hydrateFavorites,
  removeFavorite,
  saveFavorite,
} from '@/lib/db/favorites-repository'
import { useSavedTracksStore } from '@/features/library/store/use-saved-tracks-store'

interface FavoritesState {
  favorites: Favorite[]
  isHydrating: boolean
  error: string | null
  loadFavorites: () => Promise<void>
  toggleFavorite: (track: Track) => Promise<void>
  removeFavoriteTrack: (trackId: string) => Promise<void>
  isFavorite: (trackId: string) => boolean
}

function createOptimisticFavorite(track: Track): Favorite {
  const timestamp = new Date().toISOString()

  return {
    ...track,
    savedAt: timestamp,
    updatedAt: timestamp,
  }
}

function parseTimestamp(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  isHydrating: true,
  error: null,
  loadFavorites: async () => {
    set({ isHydrating: true, error: null })

    try {
      const favorites = await hydrateFavorites()
      set({ favorites, isHydrating: false })
    } catch (error) {
      set({
        isHydrating: false,
        error: error instanceof Error ? error.message : 'Could not load your local favorites.',
      })
    }
  },
  toggleFavorite: async (track) => {
    const existingFavorite = get().favorites.find((favorite) => favorite.id === track.id)

    if (existingFavorite) {
      const nextFavorites = get().favorites.filter((favorite) => favorite.id !== track.id)
      set({ favorites: nextFavorites, error: null })

      try {
        await removeFavorite(track.id)
        await useSavedTracksStore.getState().unmarkFavorite(track.id)
      } catch (error) {
        const favorites = await hydrateFavorites()
        set({
          favorites,
          error: error instanceof Error ? error.message : 'Could not update favorites.',
        })
        await useSavedTracksStore.getState().loadSavedTracks(favorites)
      }

      return
    }

    const optimisticFavorite = createOptimisticFavorite(track)
    set({
      favorites: [optimisticFavorite, ...get().favorites],
      error: null,
    })

    try {
      const persistedFavorite = await saveFavorite(track)
      await useSavedTracksStore.getState().markFavorite(
        track,
        parseTimestamp(persistedFavorite.savedAt),
      )
      set((state) => ({
        favorites: state.favorites.map((favorite) =>
          favorite.id === persistedFavorite.id ? persistedFavorite : favorite,
        ),
      }))
    } catch (error) {
      const favorites = await hydrateFavorites()
      set({
        favorites,
        error: error instanceof Error ? error.message : 'Could not update favorites.',
      })
      await useSavedTracksStore.getState().loadSavedTracks(favorites)
    }
  },
  removeFavoriteTrack: async (trackId) => {
    set({
      favorites: get().favorites.filter((favorite) => favorite.id !== trackId),
      error: null,
    })

    try {
      await removeFavorite(trackId)
      await useSavedTracksStore.getState().unmarkFavorite(trackId)
    } catch (error) {
      const favorites = await hydrateFavorites()
      set({
        favorites,
        error: error instanceof Error ? error.message : 'Could not remove favorite.',
      })
      await useSavedTracksStore.getState().loadSavedTracks(favorites)
    }
  },
  isFavorite: (trackId) => get().favorites.some((favorite) => favorite.id === trackId),
}))
