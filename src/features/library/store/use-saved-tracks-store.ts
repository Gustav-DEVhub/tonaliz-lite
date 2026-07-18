import { create } from 'zustand'
import type { Favorite, SavedTrack, Track } from '@/entities/track/model/types'
import {
  clearFavoritedTrack,
  clearManualSavedTrack,
  hydrateSavedTracks,
  reconcileFavoriteSavedTracks,
  upsertFavoritedTrack,
  upsertManualSavedTrack,
} from '@/lib/db/saved-tracks-repository'

interface SavedTracksState {
  savedTracks: SavedTrack[]
  isHydrating: boolean
  error: string | null
  loadSavedTracks: (favorites?: Favorite[]) => Promise<void>
  saveTrack: (track: Track) => Promise<void>
  removeTrack: (trackId: string) => Promise<void>
  markFavorite: (track: Track, favoritedAt?: number) => Promise<void>
  unmarkFavorite: (trackId: string) => Promise<void>
  isTrackSaved: (trackId: string) => boolean
}

export const useSavedTracksStore = create<SavedTracksState>((set, get) => ({
  savedTracks: [],
  isHydrating: true,
  error: null,
  loadSavedTracks: async (favorites = []) => {
    set({ isHydrating: true, error: null })

    try {
      await reconcileFavoriteSavedTracks(favorites)
      const savedTracks = await hydrateSavedTracks()
      set({ savedTracks, isHydrating: false })
    } catch (error) {
      set({
        isHydrating: false,
        error: error instanceof Error ? error.message : 'Could not load your saved tracks.',
      })
    }
  },
  saveTrack: async (track) => {
    try {
      const savedTrack = await upsertManualSavedTrack(track)
      if (!savedTrack) {
        return
      }

      set((state) => ({
        savedTracks: [savedTrack, ...state.savedTracks.filter((entry) => entry.trackId !== savedTrack.trackId)],
        error: null,
      }))
    } catch (error) {
      set({
        savedTracks: await hydrateSavedTracks(),
        error: error instanceof Error ? error.message : 'Could not save this track to your Library.',
      })
      throw error
    }
  },
  removeTrack: async (trackId) => {
    const previous = get().savedTracks
    const existing = previous.find((entry) => entry.trackId === trackId)

    if (!existing) {
      return
    }

    const optimisticNext = existing.isFavorite
      ? previous.map((entry) => (
        entry.trackId === trackId
          ? { ...entry, isManual: false, manualSavedAt: undefined }
          : entry
      ))
      : previous.filter((entry) => entry.trackId !== trackId)

    set({ savedTracks: optimisticNext, error: null })

    try {
      await clearManualSavedTrack(trackId)
      set({ savedTracks: await hydrateSavedTracks(), error: null })
    } catch (error) {
      set({
        savedTracks: await hydrateSavedTracks(),
        error: error instanceof Error ? error.message : 'Could not remove this track from your Library.',
      })
      throw error
    }
  },
  markFavorite: async (track, favoritedAt) => {
    try {
      const savedTrack = await upsertFavoritedTrack(track, favoritedAt)
      if (!savedTrack) {
        return
      }

      set((state) => ({
        savedTracks: [savedTrack, ...state.savedTracks.filter((entry) => entry.trackId !== savedTrack.trackId)],
        error: null,
      }))
    } catch (error) {
      set({
        savedTracks: await hydrateSavedTracks(),
        error: error instanceof Error ? error.message : 'Could not sync favorites into saved tracks.',
      })
      throw error
    }
  },
  unmarkFavorite: async (trackId) => {
    const previous = get().savedTracks
    const existing = previous.find((entry) => entry.trackId === trackId)

    if (!existing) {
      return
    }

    const optimisticNext = existing.isManual
      ? previous.map((entry) => (
        entry.trackId === trackId
          ? { ...entry, isFavorite: false, favoritedAt: undefined }
          : entry
      ))
      : previous.filter((entry) => entry.trackId !== trackId)

    set({ savedTracks: optimisticNext, error: null })

    try {
      await clearFavoritedTrack(trackId)
      set({ savedTracks: await hydrateSavedTracks(), error: null })
    } catch (error) {
      set({
        savedTracks: await hydrateSavedTracks(),
        error: error instanceof Error ? error.message : 'Could not sync favorites into saved tracks.',
      })
      throw error
    }
  },
  isTrackSaved: (trackId) => get().savedTracks.some((entry) => entry.trackId === trackId),
}))
