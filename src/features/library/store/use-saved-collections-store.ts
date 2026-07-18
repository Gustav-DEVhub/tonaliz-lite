import { create } from 'zustand'
import type { SavedCollection, SavedCollectionType } from '@/entities/track/model/types'
import {
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
