import { normalizeTrack } from '@/entities/track/lib/normalize-track'
import type { Track } from '@/entities/track/model/types'
import { getJamendoClientId, getJamendoSearchLimit } from '@/lib/env'
import type { JamendoSearchResponse } from '@/lib/jamendo/types'

const jamendoBaseUrl = 'https://api.jamendo.com/v3.0/tracks/'

export async function searchTracks(query: string): Promise<Track[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  const clientId = getJamendoClientId()
  const url = new URL(jamendoBaseUrl)

  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(getJamendoSearchLimit()))
  url.searchParams.set('audioformat', 'mp32')
  url.searchParams.set('imagesize', '600')
  url.searchParams.set('include', 'musicinfo')
  url.searchParams.set('search', normalizedQuery)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('We couldn’t load results. Try again.')
  }

  const payload = (await response.json()) as JamendoSearchResponse

  if (payload.headers?.status === 'failed') {
    throw new Error(payload.headers.error_message ?? 'We couldn’t load results. Try again.')
  }

  return (payload.results ?? [])
    .map((track) => normalizeTrack(track))
    .filter((track): track is Track => track !== null)
}
