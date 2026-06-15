import { create } from 'zustand'
import type { Track } from '@/entities/track/model/types'
import { searchTracks } from '@/lib/jamendo/jamendo-service'
import { usePlayerStore } from '@/features/player/store/use-player-store'

interface DiscoverState {
  query: string
  lastSearchedQuery: string
  results: Track[]
  isLoading: boolean
  error: string | null
  setQuery: (query: string) => void
  clearResults: () => void
  search: (query: string) => Promise<void>
}

export const useDiscoverStore = create<DiscoverState>((set) => ({
  query: '',
  lastSearchedQuery: '',
  results: [],
  isLoading: false,
  error: null,
  setQuery: (query) => set({ query }),
  clearResults: () => set({ results: [], error: null, lastSearchedQuery: '' }),
  search: async (query) => {
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
      set({
        query,
        results: [],
        error: null,
        isLoading: false,
        lastSearchedQuery: '',
      })
      return
    }

    if (!usePlayerStore.getState().isOnline) {
      set({
        query,
        results: [],
        error: 'You’re offline. Search needs an internet connection.',
        isLoading: false,
        lastSearchedQuery: normalizedQuery,
      })
      return
    }

    set({
      query,
      isLoading: true,
      error: null,
      lastSearchedQuery: normalizedQuery,
    })

    try {
      const results = await searchTracks(normalizedQuery)

      set({
        query,
        results,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        query,
        results: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'We couldn’t load results. Try again.',
      })
    }
  },
}))
