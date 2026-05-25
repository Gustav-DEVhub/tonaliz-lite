import Dexie, { type EntityTable } from 'dexie'
import type { Favorite } from '@/entities/track/model/types'

class TonalizDatabase extends Dexie {
  favorites!: EntityTable<Favorite, 'id'>

  constructor() {
    super('tonaliz-lite-db')
    this.version(1).stores({
      favorites: 'id, name, artistName, savedAt, updatedAt',
    })
  }
}

export const tonalizDb = new TonalizDatabase()
