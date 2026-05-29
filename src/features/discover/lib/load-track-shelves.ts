import type { Track } from '@/entities/track/model/types'
import { searchTracks } from '@/lib/jamendo/jamendo-service'
import type { TrackShelfConfig } from '@/features/discover/lib/exploration-shelves'

export interface LoadedTrackShelf extends TrackShelfConfig {
  tracks: Track[]
}

export async function loadTrackShelves(configs: TrackShelfConfig[]): Promise<LoadedTrackShelf[]> {
  const shelves = await Promise.all(
    configs.map(async (config) => {
      try {
        const tracks = await searchTracks(config.query)
        return {
          ...config,
          tracks,
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
