import { create } from 'zustand'
import type { Track, UserPlaylist, UserPlaylistTrack } from '@/entities/track/model/types'
import {
  addTracksToUserPlaylist,
  addTrackToUserPlaylist,
  createUserPlaylist,
  deleteUserPlaylist,
  getAllUserPlaylistTracks,
  getUserPlaylists,
  removeTrackFromUserPlaylist,
  updateUserPlaylist,
  type AddTrackToPlaylistResult,
  type AddTracksToPlaylistSummary,
  type CreatePlaylistInput,
  type UpdatePlaylistInput,
} from '@/lib/db/playlists-repository'

interface PlaylistsState {
  playlists: UserPlaylist[]
  playlistTracksById: Record<string, UserPlaylistTrack[]>
  isHydrating: boolean
  error: string | null
  lastActionStatus: 'added' | 'already-added' | 'created' | 'removed' | null
  loadPlaylists: () => Promise<void>
  createPlaylist: (input: CreatePlaylistInput) => Promise<UserPlaylist>
  updatePlaylist: (playlistId: string, input: UpdatePlaylistInput) => Promise<UserPlaylist | null>
  deletePlaylist: (playlistId: string) => Promise<void>
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<AddTrackToPlaylistResult>
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => Promise<AddTracksToPlaylistSummary>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
}

function groupPlaylistTracks(tracks: UserPlaylistTrack[]) {
  return tracks.reduce<Record<string, UserPlaylistTrack[]>>((groups, playlistTrack) => {
    const nextGroup = groups[playlistTrack.playlistId] ?? []
    groups[playlistTrack.playlistId] = [...nextGroup, playlistTrack]
    return groups
  }, {})
}

export const usePlaylistsStore = create<PlaylistsState>((set) => ({
  playlists: [],
  playlistTracksById: {},
  isHydrating: true,
  error: null,
  lastActionStatus: null,
  loadPlaylists: async () => {
    set({ isHydrating: true, error: null })

    try {
      const [playlists, playlistTracks] = await Promise.all([
        getUserPlaylists(),
        getAllUserPlaylistTracks(),
      ])

      set({
        playlists,
        playlistTracksById: groupPlaylistTracks(playlistTracks),
        isHydrating: false,
      })
    } catch (error) {
      set({
        isHydrating: false,
        error: error instanceof Error ? error.message : 'Could not load playlists.',
      })
    }
  },
  createPlaylist: async (input) => {
    const playlist = await createUserPlaylist(input)
    set((state) => ({
      playlists: [playlist, ...state.playlists],
      playlistTracksById: {
        ...state.playlistTracksById,
        [playlist.id]: [],
      },
      lastActionStatus: 'created',
      error: null,
    }))
    return playlist
  },
  updatePlaylist: async (playlistId, input) => {
    const playlist = await updateUserPlaylist(playlistId, input)

    if (playlist) {
      set((state) => ({
        playlists: state.playlists.map((item) => (item.id === playlist.id ? playlist : item)),
        error: null,
      }))
    }

    return playlist
  },
  deletePlaylist: async (playlistId) => {
    await deleteUserPlaylist(playlistId)
    set((state) => {
      const playlistTracksById = { ...state.playlistTracksById }
      delete playlistTracksById[playlistId]
      return {
        playlists: state.playlists.filter((playlist) => playlist.id !== playlistId),
        playlistTracksById,
        error: null,
      }
    })
  },
  addTrackToPlaylist: async (playlistId, track) => {
    const result = await addTrackToUserPlaylist(playlistId, track)

    if (result.status === 'already-added') {
      set({ lastActionStatus: 'already-added', error: null })
      return result
    }

    set((state) => {
      const playlistTracks = state.playlistTracksById[playlistId] ?? []
      const now = new Date().toISOString()

      return {
        playlistTracksById: {
          ...state.playlistTracksById,
          [playlistId]: [...playlistTracks, result.playlistTrack].sort((left, right) => left.position - right.position),
        },
        playlists: state.playlists
          .map((playlist) => (playlist.id === playlistId ? { ...playlist, updatedAt: now } : playlist))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
        lastActionStatus: 'added',
        error: null,
      }
    })

    return result
  },
  addTracksToPlaylist: async (playlistId, tracks) => {
    const result = await addTracksToUserPlaylist(playlistId, tracks)

    if (result.playlistTracks.length === 0) {
      set({ lastActionStatus: 'already-added', error: null })
      return result
    }

    set((state) => {
      const playlistTracks = state.playlistTracksById[playlistId] ?? []
      const now = new Date().toISOString()

      return {
        playlistTracksById: {
          ...state.playlistTracksById,
          [playlistId]: [...playlistTracks, ...result.playlistTracks].sort((left, right) => left.position - right.position),
        },
        playlists: state.playlists
          .map((playlist) => (playlist.id === playlistId ? { ...playlist, updatedAt: now } : playlist))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
        lastActionStatus: result.addedCount > 0 ? 'added' : 'already-added',
        error: null,
      }
    })

    return result
  },
  removeTrackFromPlaylist: async (playlistId, trackId) => {
    await removeTrackFromUserPlaylist(playlistId, trackId)
    const playlistTracks = await getAllUserPlaylistTracks()
    set({
      playlistTracksById: groupPlaylistTracks(playlistTracks),
      lastActionStatus: 'removed',
      error: null,
    })
  },
}))
