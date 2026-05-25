export type Mood = 'calm' | 'energetic' | 'upbeat' | 'melancholic' | 'neutral'

export type PlaylistSource = 'discover' | 'library'

export interface Track {
  id: string
  name: string
  artistName: string
  artistId?: string
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
