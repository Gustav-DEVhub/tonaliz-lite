import type { Playlist, PlaylistSource, Track } from '@/entities/track/model/types'

export function createPlaylist(title: string, source: PlaylistSource, tracks: Track[]): Playlist {
  return {
    id: `${source}-${title.toLowerCase().replace(/\s+/g, '-')}-${tracks.map((track) => track.id).join('-')}`,
    title,
    source,
    trackIds: tracks.map((track) => track.id),
    tracks,
  }
}
