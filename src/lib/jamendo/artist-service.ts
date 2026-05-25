import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { getJamendoClientId } from '@/lib/env'
import type { JamendoArtistResponse, JamendoArtistSearchResponse } from '@/lib/jamendo/types'

const jamendoArtistsUrl = 'https://api.jamendo.com/v3.0/artists/'
const artistProfileCache = new Map<string, ArtistProfile | null>()

function buildArtistProfileFallback(track: Track): ArtistProfile | null {
  if (!track.artistName.trim()) {
    return null
  }

  const id = track.artistId ?? `artist-${track.artistName.toLowerCase().replace(/\s+/g, '-')}`
  const shareUrl = track.artistShareUrl ?? (track.artistId ? `https://www.jamendo.com/artist/${track.artistId}` : null)

  return {
    id,
    name: track.artistName,
    imageUrl: track.artistImageUrl ?? null,
    shareUrl,
    website: track.artistWebsite ?? null,
  }
}

export async function getArtistProfile(track: Track): Promise<ArtistProfile | null> {
  const cacheKey = track.artistId ? `id:${track.artistId}` : `name:${track.artistName.toLowerCase()}`

  if (artistProfileCache.has(cacheKey)) {
    return artistProfileCache.get(cacheKey) ?? null
  }

  const fallback = buildArtistProfileFallback(track)

  if (!track.artistId && !track.artistName.trim()) {
    artistProfileCache.set(cacheKey, fallback)
    return fallback
  }

  try {
    const clientId = getJamendoClientId()
    const url = new URL(jamendoArtistsUrl)

    url.searchParams.set('client_id', clientId)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    if (track.artistId) {
      url.searchParams.set('id', track.artistId)
    } else {
      url.searchParams.set('namesearch', track.artistName)
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      artistProfileCache.set(cacheKey, fallback)
      return fallback
    }

    const payload = (await response.json()) as JamendoArtistSearchResponse

    if (payload.headers?.status === 'failed') {
      artistProfileCache.set(cacheKey, fallback)
      return fallback
    }

    const profile = normalizeArtistProfile(payload.results?.[0] ?? null, fallback)
    artistProfileCache.set(cacheKey, profile)

    return profile
  } catch {
    artistProfileCache.set(cacheKey, fallback)
    return fallback
  }
}

function normalizeArtistProfile(
  rawArtist: JamendoArtistResponse | null,
  fallback: ArtistProfile | null,
): ArtistProfile | null {
  if (!rawArtist) {
    return fallback
  }

  const id = rawArtist.id ? String(rawArtist.id) : fallback?.id
  const name = rawArtist.name?.trim() || fallback?.name

  if (!id || !name) {
    return fallback
  }

  const website = rawArtist.website?.trim() || fallback?.website || null
  const imageUrl = rawArtist.image?.trim() || fallback?.imageUrl || null
  const shareUrl =
    rawArtist.shareurl?.trim() ||
    rawArtist.shorturl?.trim() ||
    fallback?.shareUrl ||
    `https://www.jamendo.com/artist/${id}`

  return {
    id,
    name,
    imageUrl,
    shareUrl,
    website,
  }
}
