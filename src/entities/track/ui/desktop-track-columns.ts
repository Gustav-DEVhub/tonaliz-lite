import type { Track } from '@/entities/track/model/types'

export interface DesktopTrackColumnsConfig {
  artist: boolean
  source: boolean
  duration: boolean
}

export const DEFAULT_DESKTOP_TRACK_COLUMNS: DesktopTrackColumnsConfig = {
  artist: true,
  source: true,
  duration: true,
}

export const DESKTOP_TRACK_COLUMN_STORAGE_KEYS = {
  artist: 'tonaliz.desktopTrackColumns.artist',
  source: 'tonaliz.desktopTrackColumns.source',
  duration: 'tonaliz.desktopTrackColumns.duration',
} as const

export function resolveDesktopTrackSource(track: Track) {
  const genre = track.genre?.trim()
  if (genre) {
    return genre
  }

  const source = track.moodSource?.trim()
  if (source) {
    return source
  }

  return null
}

export function getDesktopTrackGridTemplate(columns: DesktopTrackColumnsConfig) {
  return [
    '3rem',
    'minmax(0,2.2fr)',
    columns.artist ? 'minmax(0,1.2fr)' : null,
    columns.source ? 'minmax(0,1fr)' : null,
    columns.duration ? '4.5rem' : null,
    'auto',
  ]
    .filter(Boolean)
    .join(' ')
}
