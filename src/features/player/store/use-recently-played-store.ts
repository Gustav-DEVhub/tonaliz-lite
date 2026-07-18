import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Track } from '@/entities/track/model/types'

const MAX_RECENTLY_PLAYED = 50

export interface RecentlyPlayedEntry extends Track {
  playedAt: string
}

interface RecentlyPlayedState {
  entries: RecentlyPlayedEntry[]
  recordTrack: (track: Track) => void
  removeFromHistory: (trackId: string) => void
  clearRecentlyPlayed: () => void
}

export const useRecentlyPlayedStore = create<RecentlyPlayedState>()(
  persist(
    (set) => ({
      entries: [],
      recordTrack: (track) =>
        set((state) => {
          const playedAt = new Date().toISOString()
          const dedupedEntries = state.entries.filter((entry) => entry.id !== track.id)

          return {
            entries: [{ ...track, playedAt }, ...dedupedEntries].slice(0, MAX_RECENTLY_PLAYED),
          }
        }),
      removeFromHistory: (trackId) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== trackId),
        })),
      clearRecentlyPlayed: () => set({ entries: [] }),
    }),
    {
      name: 'tonaliz-recently-played',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
