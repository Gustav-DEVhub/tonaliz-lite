import { create } from 'zustand'
import type { SavedCollection, SavedCollectionType, Track } from '@/entities/track/model/types'
import {
  cacheSavedCollectionTracks,
  getSavedCollections,
  removeSavedCollection,
  saveCollection,
  type SaveCollectionInput,
} from '@/lib/db/saved-collections-repository'

interface SavedCollectionsState {
  collections: SavedCollection[]
  isHydrating: boolean
  error: string | null
  loadSavedCollections: () => Promise<void>
  saveCollection: (input: SaveCollectionInput) => Promise<SavedCollection>
  cacheCollectionTracks: (type: SavedCollectionType, sourceId: string, tracks: Track[]) => Promise<void>
  removeCollection: (type: SavedCollectionType, sourceId: string) => Promise<void>
  isSaved: (type: SavedCollectionType, sourceId: string) => boolean
}

export const useSavedCollectionsStore = create<SavedCollectionsState>((set, get) => ({
  collections: [],
  isHydrating: true,
  error: null,
  loadSavedCollections: async () => {
    set({ isHydrating: true, error: null })

    try {
      const collections = await getSavedCollections()
      set({ collections, isHydrating: false, error: null })
    } catch (error) {
      set({
        collections: [],
        isHydrating: false,
        error: error instanceof Error ? error.message : 'Could not load saved collections.',
      })
    }
  },
  saveCollection: async (input) => {
    try {
      const collection = await saveCollection(input)

      set((state) => ({
        collections: [
          collection,
          ...state.collections.filter((item) => !(item.type === collection.type && item.sourceId === collection.sourceId)),
        ],
        error: null,
      }))

      return collection
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Could not save collection.',
      })
      throw error
    }
  },
  cacheCollectionTracks: async (type, sourceId, tracks) => {
    try {
      const collection = await cacheSavedCollectionTracks(type, sourceId, tracks)

      if (!collection) {
        return
      }

      set((state) => ({
        collections: state.collections.map((item) => (
          item.type === collection.type && item.sourceId === collection.sourceId
            ? collection
            : item
        )),
        error: null,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Could not cache collection tracks.',
      })
      throw error
    }
  },
  removeCollection: async (type, sourceId) => {
    try {
      await removeSavedCollection(type, sourceId)
      set((state) => ({
        collections: state.collections.filter((item) => !(item.type === type && item.sourceId === sourceId)),
        error: null,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Could not remove collection.',
      })
      throw error
    }
  },
  isSaved: (type, sourceId) => get().collections.some((item) => item.type === type && item.sourceId === sourceId),
}))
