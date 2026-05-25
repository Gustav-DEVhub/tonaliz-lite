import type { Favorite, Track } from '@/entities/track/model/types'
import { tonalizDb } from '@/lib/db/app-db'

function toFavorite(track: Track, previousFavorite?: Favorite): Favorite {
  const timestamp = new Date().toISOString()

  return {
    ...track,
    savedAt: previousFavorite?.savedAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export async function getFavorites() {
  return tonalizDb.favorites.orderBy('savedAt').reverse().toArray()
}

export async function isFavorite(trackId: string) {
  const existingFavorite = await tonalizDb.favorites.get(trackId)
  return Boolean(existingFavorite)
}

export async function saveFavorite(track: Track) {
  const previousFavorite = await tonalizDb.favorites.get(track.id)
  const nextFavorite = toFavorite(track, previousFavorite)

  await tonalizDb.favorites.put(nextFavorite)

  return nextFavorite
}

export async function removeFavorite(trackId: string) {
  await tonalizDb.favorites.delete(trackId)
}

export async function hydrateFavorites() {
  return getFavorites()
}
