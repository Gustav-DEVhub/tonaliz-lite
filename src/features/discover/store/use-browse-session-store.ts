import { create } from 'zustand'

interface BrowseSessionState {
  browseRevision: number
  refreshBrowse: () => void
}

export const useBrowseSessionStore = create<BrowseSessionState>((set) => ({
  browseRevision: 0,
  refreshBrowse: () =>
    set((state) => ({
      browseRevision: state.browseRevision + 1,
    })),
}))
