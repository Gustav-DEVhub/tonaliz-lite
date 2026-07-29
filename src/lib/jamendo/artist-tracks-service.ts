import { normalizeTrack } from '@/entities/track/lib/normalize-track'
import type { Track } from '@/entities/track/model/types'
import { getJamendoClientId } from '@/lib/env'
import type { JamendoSearchResponse } from '@/lib/jamendo/types'

const jamendoTracksUrl = 'https://api.jamendo.com/v3.0/tracks/'
const maxArtistTrackLimit = 200

export async function getArtistTracks({
  artistId,
  artistName,
}: {
  artistId?: string
  artistName?: string
}): Promise<Track[]> {
  const normalizedArtistName = artistName?.trim()

  if (!artistId && !normalizedArtistName) {
    return []
  }

  const clientId = getJamendoClientId()
  const primaryUrl = new URL(jamendoTracksUrl)

  primaryUrl.searchParams.set('client_id', clientId)
  primaryUrl.searchParams.set('format', 'json')
  primaryUrl.searchParams.set('limit', String(maxArtistTrackLimit))
  primaryUrl.searchParams.set('audioformat', 'mp32')
  primaryUrl.searchParams.set('imagesize', '600')
  primaryUrl.searchParams.set('include', 'musicinfo')
  primaryUrl.searchParams.set('order', 'popularity_total_desc')
  primaryUrl.searchParams.append('type', 'single')
  primaryUrl.searchParams.append('type', 'albumtrack')

  if (artistId) {
    primaryUrl.searchParams.set('artist_id', artistId)
  } else if (normalizedArtistName) {
    primaryUrl.searchParams.set('artist_name', normalizedArtistName)
  }

  const primaryResults = await requestTracks(primaryUrl)
  if (primaryResults.length > 0 || !normalizedArtistName) {
    return primaryResults
  }

  const fallbackUrl = new URL(jamendoTracksUrl)
  fallbackUrl.searchParams.set('client_id', clientId)
  fallbackUrl.searchParams.set('format', 'json')
  fallbackUrl.searchParams.set('limit', String(maxArtistTrackLimit))
  fallbackUrl.searchParams.set('audioformat', 'mp32')
  fallbackUrl.searchParams.set('imagesize', '600')
  fallbackUrl.searchParams.set('include', 'musicinfo')
  fallbackUrl.searchParams.set('order', 'popularity_total_desc')
  fallbackUrl.searchParams.append('type', 'single')
  fallbackUrl.searchParams.append('type', 'albumtrack')
  fallbackUrl.searchParams.set('search', normalizedArtistName)

  const fallbackResults = await requestTracks(fallbackUrl)
  return fallbackResults.filter((track) => track.artistName.toLowerCase() === normalizedArtistName.toLowerCase())
}

async function requestTracks(url: URL): Promise<Track[]> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Jamendo artist tracks failed. Please try again in a moment.')
  }

  const payload = (await response.json()) as JamendoSearchResponse

  if (payload.headers?.status === 'failed') {
    throw new Error(payload.headers.error_message ?? 'Jamendo artist tracks failed.')
  }

  return (payload.results ?? [])
    .map((track) => normalizeTrack(track))
    .filter((track): track is Track => track !== null)
}
