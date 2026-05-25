import { create } from 'zustand'
import type { Favorite, Track } from '@/entities/track/model/types'
import {
  hydrateFavorites,
  removeFavorite,
  saveFavorite,
} from '@/lib/db/favorites-repository'

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
      } catch (error) {
        set({
          favorites: await hydrateFavorites(),
          error: error instanceof Error ? error.message : 'Could not update favorites.',
        })
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
      set((state) => ({
        favorites: state.favorites.map((favorite) =>
          favorite.id === persistedFavorite.id ? persistedFavorite : favorite,
        ),
      }))
    } catch (error) {
      set({
        favorites: await hydrateFavorites(),
        error: error instanceof Error ? error.message : 'Could not update favorites.',
      })
    }
  },
  removeFavoriteTrack: async (trackId) => {
    set({
      favorites: get().favorites.filter((favorite) => favorite.id !== trackId),
      error: null,
    })

    try {
      await removeFavorite(trackId)
    } catch (error) {
      set({
        favorites: await hydrateFavorites(),
        error: error instanceof Error ? error.message : 'Could not remove favorite.',
      })
    }
  },
  isFavorite: (trackId) => get().favorites.some((favorite) => favorite.id === trackId),
}))
