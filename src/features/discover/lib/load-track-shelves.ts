import type { Track } from '@/entities/track/model/types'
import { searchTracks } from '@/lib/jamendo/jamendo-service'
import type { TrackShelfConfig } from '@/features/discover/lib/exploration-shelves'

export interface LoadedTrackShelf extends TrackShelfConfig {
  tracks: Track[]
}

function reorderShelfTracks(tracks: Track[], seed: number) {
  if (tracks.length < 2) {
    return tracks
  }

  const offset = Math.abs(seed) % tracks.length
  const rotated = [...tracks.slice(offset), ...tracks.slice(0, offset)]

  if (seed % 2 === 0) {
    return rotated
  }

  const evenTracks = rotated.filter((_, index) => index % 2 === 0)
  const oddTracks = rotated.filter((_, index) => index % 2 === 1)

  return [...evenTracks, ...oddTracks]
}

export async function loadTrackShelves(configs: TrackShelfConfig[], revision = 0): Promise<LoadedTrackShelf[]> {
  const shelves = await Promise.all(
    configs.map(async (config, index) => {
      try {
        const tracks = await searchTracks(config.query)
        return {
          ...config,
          tracks: reorderShelfTracks(tracks, revision + index),
        }
      } catch {
        return {
          ...config,
          tracks: [],
        }
      }
    }),
  )

  return shelves.filter((shelf) => shelf.tracks.length > 0)
}
