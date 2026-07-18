import type { Favorite, SavedTrack, Track } from '@/entities/track/model/types'
import { tonalizDb } from '@/lib/db/app-db'

function parseFavoriteTimestamp(value: string | undefined) {
  if (!value) {
    return Date.now()
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

async function updateSavedTrack(
  trackId: string,
  updater: (existing: SavedTrack | undefined, now: number) => SavedTrack | null,
) {
  return tonalizDb.transaction('rw', tonalizDb.savedTracks, async () => {
    const existing = await tonalizDb.savedTracks.get(trackId)
    const now = Date.now()
    const nextEntry = updater(existing, now)

    if (!nextEntry) {
      await tonalizDb.savedTracks.delete(trackId)
      return null
    }

    await tonalizDb.savedTracks.put(nextEntry)
    return nextEntry
  })
}

export async function hydrateSavedTracks() {
  return tonalizDb.savedTracks.orderBy('updatedAt').reverse().toArray()
}

export async function upsertManualSavedTrack(track: Track) {
  return updateSavedTrack(track.id, (existing, now) => ({
    trackId: track.id,
    track,
    isManual: true,
    isFavorite: existing?.isFavorite ?? false,
    manualSavedAt: existing?.manualSavedAt ?? now,
    favoritedAt: existing?.favoritedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }))
}

export async function clearManualSavedTrack(trackId: string) {
  return updateSavedTrack(trackId, (existing, now) => {
    if (!existing) {
      return null
    }

    const isFavorite = existing.isFavorite
    if (!isFavorite) {
      return null
    }

    return {
      ...existing,
      isManual: false,
      manualSavedAt: undefined,
      updatedAt: now,
    }
  })
}

export async function upsertFavoritedTrack(track: Track, favoritedAt = Date.now()) {
  return updateSavedTrack(track.id, (existing, now) => ({
    trackId: track.id,
    track,
    isManual: existing?.isManual ?? false,
    isFavorite: true,
    manualSavedAt: existing?.manualSavedAt,
    favoritedAt: existing?.favoritedAt ?? favoritedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }))
}

export async function clearFavoritedTrack(trackId: string) {
  return updateSavedTrack(trackId, (existing, now) => {
    if (!existing) {
      return null
    }

    const isManual = existing.isManual
    if (!isManual) {
      return null
    }

    return {
      ...existing,
      isFavorite: false,
      favoritedAt: undefined,
      updatedAt: now,
    }
  })
}

export async function reconcileFavoriteSavedTracks(favorites: Favorite[]) {
  const favoritesById = new Map(favorites.map((favorite) => [favorite.id, favorite]))

  await tonalizDb.transaction('rw', tonalizDb.savedTracks, async () => {
    for (const favorite of favorites) {
      const existing = await tonalizDb.savedTracks.get(favorite.id)
      const favoritedAt = parseFavoriteTimestamp(favorite.savedAt)
      const now = Date.now()

      await tonalizDb.savedTracks.put({
        trackId: favorite.id,
        track: favorite,
        isManual: existing?.isManual ?? false,
        isFavorite: true,
        manualSavedAt: existing?.manualSavedAt,
        favoritedAt: existing?.favoritedAt ?? favoritedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    }

    const existingSavedTracks = await tonalizDb.savedTracks.toArray()

    for (const entry of existingSavedTracks) {
      if (!entry.isFavorite) {
        continue
      }

      if (favoritesById.has(entry.trackId)) {
        continue
      }

      if (entry.isManual) {
        await tonalizDb.savedTracks.put({
          ...entry,
          isFavorite: false,
          favoritedAt: undefined,
          updatedAt: Date.now(),
        })
        continue
      }

      await tonalizDb.savedTracks.delete(entry.trackId)
    }
  })
}
