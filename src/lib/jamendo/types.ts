export interface JamendoTrackResponse {
  id: string | number
  name?: string
  duration?: number | string
  artist_id?: string | number
  artist_name?: string
  audio?: string
  shorturl?: string
  shareurl?: string
  image?: string
  album_image?: string
  thumbnail?: string
  tags?: string[] | string
  musicinfo?: {
    tags?: {
      genres?: string[] | string
      vartags?: string[] | string
      instruments?: string[] | string
      moods?: string[] | string
    }
  }
}

export interface JamendoArtistResponse {
  id: string | number
  name?: string
  website?: string
  image?: string
  shorturl?: string
  shareurl?: string
}

export interface JamendoSearchResponse {
  headers?: {
    status?: string
    code?: number
    error_message?: string
  }
  results?: JamendoTrackResponse[]
}

export interface JamendoArtistSearchResponse {
  headers?: {
    status?: string
    code?: number
    error_message?: string
  }
  results?: JamendoArtistResponse[]
}
