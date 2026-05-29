import type { Track } from '@/entities/track/model/types'
import type { JamendoTrackResponse } from '@/lib/jamendo/types'

const fallbackArtwork =
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80'

function appendStrings(target: string[], value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized) {
      target.push(normalized)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => appendStrings(target, entry))
  }
}

function collectTags(rawTrack: JamendoTrackResponse) {
  const collectedTags: string[] = []

  appendStrings(collectedTags, rawTrack.tags)
  appendStrings(collectedTags, rawTrack.musicinfo?.tags?.genres)
  appendStrings(collectedTags, rawTrack.musicinfo?.tags?.vartags)
  appendStrings(collectedTags, rawTrack.musicinfo?.tags?.instruments)
  appendStrings(collectedTags, rawTrack.musicinfo?.tags?.moods)

  return [...new Set(collectedTags)]
}

function resolveGenre(rawTrack: JamendoTrackResponse, tags: string[]) {
  const genres = rawTrack.musicinfo?.tags?.genres
  if (Array.isArray(genres) && typeof genres[0] === 'string') {
    return genres[0].toLowerCase()
  }

  if (typeof genres === 'string') {
    return genres.toLowerCase()
  }

  return tags[0] ?? null
}

export function normalizeTrack(rawTrack: JamendoTrackResponse): Track | null {
  const id = rawTrack.id ? String(rawTrack.id) : null
  const name = rawTrack.name?.trim()
  const artistId = rawTrack.artist_id ? String(rawTrack.artist_id) : undefined
  const artistName = rawTrack.artist_name?.trim()
  const audioUrl = rawTrack.audio?.trim()

  if (!id || !name || !artistName || !audioUrl) {
    return null
  }

  const tags = collectTags(rawTrack)
  const genre = resolveGenre(rawTrack, tags)

  return {
    id,
    name,
    artistName,
    artistId,
    shareUrl: rawTrack.shareurl?.trim() || rawTrack.shorturl?.trim() || null,
    audioUrl,
    imageUrl:
      rawTrack.album_image?.trim() ||
      rawTrack.image?.trim() ||
      rawTrack.thumbnail?.trim() ||
      fallbackArtwork,
    artistImageUrl: null,
    artistShareUrl: artistId ? `https://www.jamendo.com/artist/${artistId}` : undefined,
    artistWebsite: null,
    duration: Number.isFinite(Number(rawTrack.duration)) ? Number(rawTrack.duration) : 0,
    tags,
    genre,
    moodSource: tags[0] ?? genre ?? undefined,
  }
}
