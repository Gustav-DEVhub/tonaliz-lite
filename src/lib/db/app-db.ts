import Dexie, { type EntityTable } from 'dexie'
import type { Favorite, SavedCollection, SavedTrack, UserPlaylist, UserPlaylistTrack } from '@/entities/track/model/types'

class TonalizDatabase extends Dexie {
  favorites!: EntityTable<Favorite, 'id'>
  savedTracks!: EntityTable<SavedTrack, 'trackId'>
  playlists!: EntityTable<UserPlaylist, 'id'>
  playlistTracks!: EntityTable<UserPlaylistTrack, 'id'>
  savedCollections!: EntityTable<SavedCollection, 'id'>

  constructor() {
    super('tonaliz-lite-db')

    this.version(1).stores({
      favorites: 'id, name, artistName, savedAt, updatedAt',
    })

    this.version(2).stores({
      favorites: 'id, name, artistName, savedAt, updatedAt',
      playlists: 'id, title, createdAt, updatedAt',
      playlistTracks: 'id, playlistId, trackId, addedAt, position, [playlistId+trackId]',
    })

    this.version(3).stores({
      favorites: 'id, name, artistName, savedAt, updatedAt',
      playlists: 'id, title, createdAt, updatedAt',
      playlistTracks: 'id, playlistId, trackId, addedAt, position, [playlistId+trackId]',
      savedCollections: 'id, type, sourceId, createdAt, updatedAt, [type+sourceId]',
    })

    this.version(4).stores({
      favorites: 'id, name, artistName, savedAt, updatedAt',
      savedTracks: 'trackId, isManual, isFavorite, manualSavedAt, favoritedAt, createdAt, updatedAt',
      playlists: 'id, title, createdAt, updatedAt',
      playlistTracks: 'id, playlistId, trackId, addedAt, position, [playlistId+trackId]',
      savedCollections: 'id, type, sourceId, createdAt, updatedAt, [type+sourceId]',
    })
  }
}

export const tonalizDb = new TonalizDatabase()
