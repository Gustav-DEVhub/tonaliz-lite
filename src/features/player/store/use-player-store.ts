import { create } from 'zustand'
import type { Mood, Playlist, Track } from '@/entities/track/model/types'
import { detectMood } from '@/lib/mood/detect-mood'

interface SetTrackOptions {
  queue?: Playlist | null
  autoPlay?: boolean
}

export type RepeatMode = 'off' | 'all' | 'one'
export type DesktopRightRailMode = 'closed' | 'now_playing' | 'queue'

interface PlayerState {
  currentTrack: Track | null
  queue: Playlist | null
  queueIndex: number
  isPlaying: boolean
  progress: number
  currentTime: number
  duration: number
  volume: number
  isShuffleEnabled: boolean
  repeatMode: RepeatMode
  currentMood: Mood
  isOnline: boolean
  desktopRightRailMode: DesktopRightRailMode
  lastNonQueueRailMode: Exclude<DesktopRightRailMode, 'queue'>
  setTrack: (track: Track, options?: SetTrackOptions) => void
  playTrack: (track: Track, queue?: Playlist | null) => void
  playTrackFromContext: (track: Track, queue: Playlist) => void
  playTrackInCurrentQueue: (index: number) => void
  playSingleTrack: (track: Track) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  nextTrack: () => void
  previousTrack: () => void
  setQueue: (queue: Playlist) => void
  setMood: (mood: Mood) => void
  setOnlineStatus: (isOnline: boolean) => void
  syncProgress: (currentTime: number, duration: number) => void
  seekTo: (currentTime: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  cycleRepeatMode: () => void
  addToQueue: (track: Track) => void
  playNextInQueue: (track: Track) => void
  removeFromQueueAt: (index: number) => void
  clearUpcomingQueue: () => void
  reorderUpcomingQueue: (newUpcomingTracks: Track[]) => void
  openNowPlayingRail: () => void
  closeDesktopRail: () => void
  toggleNowPlayingRail: () => void
  openQueueRail: () => void
  closeQueueRailAndRestore: () => void
  toggleQueueRail: () => void
  handlePlaybackCompletion: () => void
}

function createSingleTrackQueue(track: Track): Playlist {
  return {
    id: `single-${track.id}`,
    title: track.name,
    source: 'discover',
    trackIds: [track.id],
    tracks: [track],
  }
}

function getRandomQueueIndex(length: number, currentIndex: number): number {
  if (length <= 1) {
    return currentIndex
  }

  let nextIndex = currentIndex

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length)
  }

  return nextIndex
}

function createQueueFromTracks(baseTrack: Track, tracks: Track[], source: Playlist['source'] = 'discover'): Playlist {
  return {
    id: `${source}-session-${tracks.map((track) => track.id).join('-')}`,
    title: baseTrack.name,
    source,
    trackIds: tracks.map((track) => track.id),
    tracks,
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: null,
  queueIndex: 0,
  isPlaying: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  volume: 0.72,
  isShuffleEnabled: false,
  repeatMode: 'off',
  currentMood: 'neutral',
  isOnline: true,
  desktopRightRailMode: 'now_playing',
  lastNonQueueRailMode: 'now_playing',
  setTrack: (track, options) =>
    set((state) => {
      const queue = options?.queue ?? state.queue ?? createSingleTrackQueue(track)
      const nextQueueIndex = queue.tracks.findIndex((entry) => entry.id === track.id)

      return {
        currentTrack: track,
        queue,
        queueIndex: nextQueueIndex >= 0 ? nextQueueIndex : 0,
        isPlaying: options?.autoPlay ?? true,
        progress: 0,
        currentTime: 0,
        duration: track.duration,
        currentMood: detectMood(track),
      }
    }),
  playTrack: (track, queue) => {
    get().setTrack(track, { queue, autoPlay: true })
  },
  playTrackFromContext: (track, queue) => {
    get().setTrack(track, { queue, autoPlay: true })
  },
  playTrackInCurrentQueue: (index) =>
    set((state) => {
      if (!state.queue || index < 0 || index >= state.queue.tracks.length) {
        return state
      }

      const nextTrack = state.queue.tracks[index]

      return {
        currentTrack: nextTrack,
        queueIndex: index,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: nextTrack.duration,
        currentMood: detectMood(nextTrack),
      }
    }),
  playSingleTrack: (track) => {
    get().setTrack(track, { queue: createSingleTrackQueue(track), autoPlay: true })
  },
  play: () =>
    set((state) => ({
      isPlaying: state.currentTrack ? true : state.isPlaying,
    })),
  pause: () => set({ isPlaying: false }),
  togglePlay: () =>
    set((state) => ({
      isPlaying: state.currentTrack ? !state.isPlaying : false,
    })),
  nextTrack: () =>
    set((state) => {
      if (!state.queue) {
        return state
      }

      const queueLength = state.queue.tracks.length
      if (queueLength === 0) {
        return state
      }

      let nextIndex: number | null = null

      if (state.isShuffleEnabled && queueLength > 1) {
        nextIndex = getRandomQueueIndex(queueLength, state.queueIndex)
      } else if (state.queue.tracks[state.queueIndex + 1]) {
        nextIndex = state.queueIndex + 1
      } else if (state.repeatMode === 'all') {
        nextIndex = 0
      }

      if (nextIndex === null) {
        return {
          isPlaying: false,
          currentTime: 0,
          progress: 0,
        }
      }

      const nextTrack = state.queue.tracks[nextIndex]
      return {
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: nextTrack.duration,
        currentMood: detectMood(nextTrack),
      }
    }),
  previousTrack: () =>
    set((state) => {
      if (!state.queue) {
        return state
      }

      const previousIndex =
        state.queueIndex > 0 ? state.queueIndex - 1 : state.repeatMode === 'all' ? state.queue.tracks.length - 1 : 0
      const previousTrack = state.queue.tracks[previousIndex]

      if (!previousTrack) {
        return state
      }

      return {
        currentTrack: previousTrack,
        queueIndex: previousIndex,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: previousTrack.duration,
        currentMood: detectMood(previousTrack),
      }
    }),
  setQueue: (queue) =>
    set({
      queue,
      queueIndex: 0,
    }),
  setMood: (mood) => set({ currentMood: mood }),
  setOnlineStatus: (isOnline) => set({ isOnline }),
  syncProgress: (currentTime, duration) =>
    set({
      currentTime,
      duration,
      progress: duration > 0 ? Math.min(currentTime / duration, 1) : 0,
    }),
  seekTo: (currentTime) =>
    set((state) => ({
      currentTime,
      progress: state.duration > 0 ? Math.min(currentTime / state.duration, 1) : 0,
    })),
  setVolume: (volume) =>
    set({
      volume: Math.min(Math.max(volume, 0), 1),
    }),
  toggleShuffle: () =>
    set((state) => ({
      isShuffleEnabled: !state.isShuffleEnabled,
    })),
  cycleRepeatMode: () =>
    set((state) => ({
      repeatMode: state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off',
    })),
  addToQueue: (track) =>
    set((state) => {
      if (!state.currentTrack) {
        return {
          currentTrack: track,
          queue: createSingleTrackQueue(track),
          queueIndex: 0,
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: track.duration,
          currentMood: detectMood(track),
        }
      }

      if (!state.queue) {
        const queue = createQueueFromTracks(state.currentTrack, [state.currentTrack, track])

        return {
          queue,
          queueIndex: 0,
        }
      }

      const nextTracks = [...state.queue.tracks, track]

      return {
        queue: {
          ...state.queue,
          trackIds: nextTracks.map((entry) => entry.id),
          tracks: nextTracks,
        },
      }
    }),
  playNextInQueue: (track) =>
    set((state) => {
      if (!state.currentTrack) {
        return {
          currentTrack: track,
          queue: createSingleTrackQueue(track),
          queueIndex: 0,
          isPlaying: true,
          progress: 0,
          currentTime: 0,
          duration: track.duration,
          currentMood: detectMood(track),
        }
      }

      if (!state.queue) {
        const queue = createQueueFromTracks(state.currentTrack, [state.currentTrack, track])

        return {
          queue,
          queueIndex: 0,
        }
      }

      const insertionIndex = Math.min(state.queueIndex + 1, state.queue.tracks.length)
      const nextTracks = [...state.queue.tracks]
      nextTracks.splice(insertionIndex, 0, track)

      return {
        queue: {
          ...state.queue,
          trackIds: nextTracks.map((entry) => entry.id),
          tracks: nextTracks,
        },
      }
    }),
  openNowPlayingRail: () =>
    set({
      desktopRightRailMode: 'now_playing',
      lastNonQueueRailMode: 'now_playing',
    }),
  closeDesktopRail: () =>
    set({
      desktopRightRailMode: 'closed',
      lastNonQueueRailMode: 'closed',
    }),
  toggleNowPlayingRail: () =>
    set((state) => ({
      desktopRightRailMode: state.desktopRightRailMode === 'now_playing' ? 'closed' : 'now_playing',
      lastNonQueueRailMode: state.desktopRightRailMode === 'now_playing' ? 'closed' : 'now_playing',
    })),
  openQueueRail: () =>
    set((state) => ({
      desktopRightRailMode: 'queue',
      lastNonQueueRailMode:
        state.desktopRightRailMode === 'queue' ? state.lastNonQueueRailMode : state.desktopRightRailMode,
    })),
  closeQueueRailAndRestore: () =>
    set((state) => ({
      desktopRightRailMode: state.lastNonQueueRailMode,
    })),
  toggleQueueRail: () =>
    set((state) => {
      if (state.desktopRightRailMode === 'queue') {
        return {
          desktopRightRailMode: state.lastNonQueueRailMode,
        }
      }

      return {
        desktopRightRailMode: 'queue',
        lastNonQueueRailMode: state.desktopRightRailMode,
      }
    }),
  removeFromQueueAt: (index) =>
    set((state) => {
      if (!state.queue || index < 0 || index >= state.queue.tracks.length || index === state.queueIndex) {
        return state
      }

      const nextTracks = state.queue.tracks.filter((_, trackIndex) => trackIndex !== index)
      const nextQueueIndex = index < state.queueIndex ? Math.max(0, state.queueIndex - 1) : state.queueIndex

      return {
        queue: {
          ...state.queue,
          trackIds: nextTracks.map((entry) => entry.id),
          tracks: nextTracks,
        },
        queueIndex: nextQueueIndex,
      }
    }),
  clearUpcomingQueue: () =>
    set((state) => {
      if (!state.queue || !state.currentTrack) {
        return state
      }

      const currentTrack = state.queue.tracks[state.queueIndex] ?? state.currentTrack
      return {
        queue: {
          ...state.queue,
          trackIds: [currentTrack.id],
          tracks: [currentTrack],
        },
        queueIndex: 0,
      }
    }),
  reorderUpcomingQueue: (newUpcomingTracks) =>
    set((state) => {
      if (!state.queue || !state.currentTrack) {
        return state
      }

      const previousTracks = state.queue.tracks.slice(0, state.queueIndex)
      const currentTrack = state.queue.tracks[state.queueIndex] ?? state.currentTrack
      const nextTracks = [...previousTracks, currentTrack, ...newUpcomingTracks]

      return {
        queue: {
          ...state.queue,
          trackIds: nextTracks.map((entry) => entry.id),
          tracks: nextTracks,
        },
        queueIndex: previousTracks.length,
      }
    }),
  handlePlaybackCompletion: () => {
    const { currentTrack, isShuffleEnabled, queue, queueIndex, repeatMode } = get()

    if (!currentTrack) {
      return
    }

    if (repeatMode === 'one') {
      set({
        currentTrack: { ...currentTrack },
        isPlaying: true,
        currentTime: 0,
        progress: 0,
        duration: currentTrack.duration,
        currentMood: detectMood(currentTrack),
      })
      return
    }

    if (!queue || queue.tracks.length === 0) {
      set({
        isPlaying: false,
        currentTime: 0,
        progress: 0,
      })
      return
    }

    const queueLength = queue.tracks.length

    if (isShuffleEnabled && queueLength > 1) {
      const nextIndex = getRandomQueueIndex(queueLength, queueIndex)
      const nextTrack = queue.tracks[nextIndex]

      set({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        isPlaying: true,
        currentTime: 0,
        progress: 0,
        duration: nextTrack.duration,
        currentMood: detectMood(nextTrack),
      })
      return
    }

    if (queue.tracks[queueIndex + 1]) {
      get().nextTrack()
      return
    }

    if (repeatMode === 'all') {
      const nextTrack = queue.tracks[0]

      set({
        currentTrack: nextTrack,
        queueIndex: 0,
        isPlaying: true,
        currentTime: 0,
        progress: 0,
        duration: nextTrack.duration,
        currentMood: detectMood(nextTrack),
      })
      return
    }

    set({
      isPlaying: false,
      currentTime: 0,
      progress: 0,
    })
  },
}))
