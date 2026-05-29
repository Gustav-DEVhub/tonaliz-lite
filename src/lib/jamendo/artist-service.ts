import type { ArtistProfile, Track } from '@/entities/track/model/types'
import { getJamendoClientId } from '@/lib/env'
import type { JamendoArtistResponse, JamendoArtistSearchResponse } from '@/lib/jamendo/types'

const jamendoArtistsUrl = 'https://api.jamendo.com/v3.0/artists/'
const artistProfileCache = new Map<string, ArtistProfile | null>()

interface ArtistLookupInput {
  artistId?: string
  artistName: string
  artistShareUrl?: string
  artistWebsite?: string | null
  artistImageUrl?: string | null
}

function buildArtistProfileFallback(input: ArtistLookupInput): ArtistProfile | null {
  if (!input.artistName.trim()) {
    return null
  }

  const id = input.artistId ?? `artist-${input.artistName.toLowerCase().replace(/\s+/g, '-')}`
  const shareUrl = input.artistShareUrl ?? (input.artistId ? `https://www.jamendo.com/artist/${input.artistId}` : null)

  return {
    id,
    name: input.artistName,
    imageUrl: input.artistImageUrl ?? null,
    shareUrl,
    website: input.artistWebsite ?? null,
  }
}

export async function getArtistProfile(track: Track): Promise<ArtistProfile | null> {
  return getArtistProfileByIdentity({
    artistId: track.artistId,
    artistName: track.artistName,
    artistShareUrl: track.artistShareUrl,
    artistWebsite: track.artistWebsite,
    artistImageUrl: track.artistImageUrl,
  })
}

export async function getArtistProfileByIdentity(input: ArtistLookupInput): Promise<ArtistProfile | null> {
  const cacheKey = input.artistId ? `id:${input.artistId}` : `name:${input.artistName.toLowerCase()}`

  if (artistProfileCache.has(cacheKey)) {
    return artistProfileCache.get(cacheKey) ?? null
  }

  const fallback = buildArtistProfileFallback(input)

  if (!input.artistId && !input.artistName.trim()) {
    artistProfileCache.set(cacheKey, fallback)
    return fallback
  }

  try {
    const clientId = getJamendoClientId()
    const url = new URL(jamendoArtistsUrl)

    url.searchParams.set('client_id', clientId)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    if (input.artistId) {
      url.searchParams.set('id', input.artistId)
    } else {
      url.searchParams.set('namesearch', input.artistName)
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
