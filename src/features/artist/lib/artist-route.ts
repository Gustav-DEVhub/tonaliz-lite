import type { Track } from '@/entities/track/model/types'

export interface ArtistRouteState {
  artistId?: string
  artistName: string
  sourceTrack: Track
}

export function getArtistRouteTarget(track: Track) {
  const searchParams = new URLSearchParams()
  searchParams.set('name', track.artistName)

  return {
    pathname: track.artistId ? `/artist/${track.artistId}` : '/artist',
    search: `?${searchParams.toString()}`,
    state: {
      artistId: track.artistId,
      artistName: track.artistName,
      sourceTrack: track,
    } satisfies ArtistRouteState,
  }
}
