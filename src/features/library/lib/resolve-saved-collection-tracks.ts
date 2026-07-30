import type { SavedCollection, Track } from '@/entities/track/model/types'
import {
  getShelfConfigById,
  parseShelfCollectionSourceId,
} from '@/features/discover/lib/exploration-shelves'
import { loadTrackShelves } from '@/features/discover/lib/load-track-shelves'
import { getArtistTracks } from '@/lib/jamendo/artist-tracks-service'

const resolvedTrackSnapshots = new Map<string, Track[]>()
const pendingTrackRequests = new Map<string, Promise<Track[]>>()

function getCollectionKey(collection: SavedCollection) {
  if (collection.type === 'artist' || (
    collection.type === 'collection'
    && (collection.sourceId.startsWith('artist-tracks:') || collection.routePath?.startsWith('/artist'))
  )) {
    const { artistId, artistName } = getArtistIdentity(collection)
    return `artist:${artistId ?? artistName.toLowerCase()}`
  }

  return `${collection.type}:${collection.sourceId}`
}

function dedupeTracks(tracks: Track[]) {
  return [...new Map(tracks.map((track) => [track.id, track])).values()]
}

function getArtistIdentity(collection: SavedCollection) {
  const routeUrl = collection.routePath
    ? new URL(collection.routePath, 'https://tonaliz.local')
    : null
  const routeArtistId = routeUrl?.pathname.match(/^\/artist\/([^/]+)$/)?.[1]
  const sourceArtistId = collection.sourceId.startsWith('artist-tracks:')
    ? collection.sourceId.slice('artist-tracks:'.length)
    : collection.sourceId
  const artistId = routeArtistId
    ? decodeURIComponent(routeArtistId)
    : (/^\d+$/.test(sourceArtistId) ? sourceArtistId : undefined)
  const artistName = routeUrl?.searchParams.get('name')?.trim()
    || collection.title.replace(/\s+Artist tracks$/i, '')

  return { artistId, artistName }
}

async function loadCollectionTracks(collection: SavedCollection) {
  if (collection.type === 'shelf-collection') {
    const parsedCollection = parseShelfCollectionSourceId(collection.sourceId)
    const shelfConfig = parsedCollection ? getShelfConfigById(parsedCollection.shelfId) : null

    if (!shelfConfig) {
      return []
    }

    const shelves = await loadTrackShelves([shelfConfig])
    return shelves[0]?.tracks ?? []
  }

  const isArtistCollection = collection.type === 'artist'
    || (collection.type === 'collection' && (
      collection.sourceId.startsWith('artist-tracks:')
      || collection.routePath?.startsWith('/artist')
    ))

  if (isArtistCollection) {
    return getArtistTracks(getArtistIdentity(collection))
  }

  return []
}

export async function resolveSavedCollectionTracks(collection: SavedCollection): Promise<Track[]> {
  const snapshotTracks = dedupeTracks(collection.tracks ?? [])

  if (snapshotTracks.length > 0) {
    return snapshotTracks
  }

  const collectionKey = getCollectionKey(collection)
  const resolvedTracks = resolvedTrackSnapshots.get(collectionKey)

  if (resolvedTracks) {
    return resolvedTracks
  }

  const pendingRequest = pendingTrackRequests.get(collectionKey)

  if (pendingRequest) {
    return pendingRequest
  }

  const request = loadCollectionTracks(collection)
    .then((tracks) => {
      const dedupedTracks = dedupeTracks(tracks)

      if (dedupedTracks.length > 0) {
        resolvedTrackSnapshots.set(collectionKey, dedupedTracks)
      }

      return dedupedTracks
    })
    .catch(() => [])
    .finally(() => {
      pendingTrackRequests.delete(collectionKey)
    })

  pendingTrackRequests.set(collectionKey, request)
  return request
}
