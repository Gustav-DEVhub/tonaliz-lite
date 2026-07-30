export type Mood = 'calm' | 'energetic' | 'upbeat' | 'melancholic' | 'neutral'

export type PlaylistSource = 'home' | 'discover' | 'library' | 'artist'

export interface Track {
  id: string
  name: string
  artistName: string
  artistId?: string
  shareUrl?: string | null
  artistShareUrl?: string
  artistWebsite?: string | null
  artistImageUrl?: string | null
  audioUrl: string
  imageUrl: string
  duration: number
  tags: string[]
  genre: string | null
  moodSource?: string
}

export interface ArtistProfile {
  id: string
  name: string
  imageUrl: string | null
  shareUrl: string | null
  website: string | null
}

export interface Playlist {
  id: string
  title: string
  source: PlaylistSource
  trackIds: string[]
  tracks: Track[]
}

export interface Favorite extends Track {
  savedAt: string
  updatedAt: string
}

export interface SavedTrack {
  trackId: string
  track: Track
  isManual: boolean
  isFavorite: boolean
  manualSavedAt?: number
  favoritedAt?: number
  createdAt: number
  updatedAt: number
}

export interface UserPlaylist {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface UserPlaylistTrack {
  id: string
  playlistId: string
  trackId: string
  track: Track
  addedAt: string
  position: number
}

export type SavedCollectionType = 'artist' | 'playlist' | 'liked' | 'collection' | 'shelf-collection'

export interface SavedCollection {
  id: string
  type: SavedCollectionType
  sourceId: string
  title: string
  subtitle: string | null
  imageUrl: string | null
  trackCount: number | null
  tracks?: Track[] | null
  routePath: string | null
  externalUrl: string | null
  createdAt: string
  updatedAt: string
}
