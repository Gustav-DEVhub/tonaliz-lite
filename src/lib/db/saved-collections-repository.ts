import type { SavedCollection, SavedCollectionType, Track } from '@/entities/track/model/types'
import { tonalizDb } from '@/lib/db/app-db'

export interface SaveCollectionInput {
  type: SavedCollectionType
  sourceId: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  trackCount?: number | null
  tracks?: Track[] | null
  routePath?: string | null
  externalUrl?: string | null
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function now() {
  return new Date().toISOString()
}

export async function getSavedCollections(): Promise<SavedCollection[]> {
  return tonalizDb.savedCollections.orderBy('updatedAt').reverse().toArray()
}

export async function getSavedCollectionByIdentity(type: SavedCollectionType, sourceId: string): Promise<SavedCollection | undefined> {
  return tonalizDb.savedCollections.where('[type+sourceId]').equals([type, sourceId]).first()
}

export async function saveCollection(input: SaveCollectionInput): Promise<SavedCollection> {
  const timestamp = now()
  const existing = await getSavedCollectionByIdentity(input.type, input.sourceId)

  if (existing) {
    const nextCollection: SavedCollection = {
      ...existing,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      imageUrl: input.imageUrl ?? null,
      trackCount: input.trackCount ?? null,
      tracks: input.tracks === undefined ? existing.tracks ?? null : input.tracks,
      routePath: input.routePath ?? null,
      externalUrl: input.externalUrl ?? null,
      updatedAt: timestamp,
    }

    await tonalizDb.savedCollections.put(nextCollection)
    return nextCollection
  }

  const collection: SavedCollection = {
    id: createId('saved-collection'),
    type: input.type,
    sourceId: input.sourceId,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    imageUrl: input.imageUrl ?? null,
    trackCount: input.trackCount ?? null,
    tracks: input.tracks ?? null,
    routePath: input.routePath ?? null,
    externalUrl: input.externalUrl ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await tonalizDb.savedCollections.add(collection)
  return collection
}

export async function cacheSavedCollectionTracks(
  type: SavedCollectionType,
  sourceId: string,
  tracks: Track[],
): Promise<SavedCollection | null> {
  const existing = await getSavedCollectionByIdentity(type, sourceId)

  if (!existing || tracks.length === 0) {
    return existing ?? null
  }

  const nextCollection: SavedCollection = {
    ...existing,
    trackCount: tracks.length,
    tracks,
  }

  await tonalizDb.savedCollections.put(nextCollection)
  return nextCollection
}

export async function removeSavedCollection(type: SavedCollectionType, sourceId: string): Promise<void> {
  const existing = await getSavedCollectionByIdentity(type, sourceId)

  if (!existing) {
    return
  }

  await tonalizDb.savedCollections.delete(existing.id)
}
