import { useEffect, useState } from 'react'
import {
  DEFAULT_DESKTOP_TRACK_COLUMNS,
  DESKTOP_TRACK_COLUMN_STORAGE_KEYS,
  type DesktopTrackColumnsConfig,
} from '@/entities/track/ui/desktop-track-columns'

function readStoredColumn(key: string, fallback: boolean) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const value = window.localStorage.getItem(key)
  if (value === null) {
    return fallback
  }

  return value === 'true'
}

export function useDesktopTrackColumns() {
  const [columns, setColumns] = useState<DesktopTrackColumnsConfig>(() => ({
    artist: readStoredColumn(DESKTOP_TRACK_COLUMN_STORAGE_KEYS.artist, DEFAULT_DESKTOP_TRACK_COLUMNS.artist),
    source: readStoredColumn(DESKTOP_TRACK_COLUMN_STORAGE_KEYS.source, DEFAULT_DESKTOP_TRACK_COLUMNS.source),
    duration: readStoredColumn(DESKTOP_TRACK_COLUMN_STORAGE_KEYS.duration, DEFAULT_DESKTOP_TRACK_COLUMNS.duration),
  }))

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(DESKTOP_TRACK_COLUMN_STORAGE_KEYS.artist, String(columns.artist))
    window.localStorage.setItem(DESKTOP_TRACK_COLUMN_STORAGE_KEYS.source, String(columns.source))
    window.localStorage.setItem(DESKTOP_TRACK_COLUMN_STORAGE_KEYS.duration, String(columns.duration))
  }, [columns])

  const setColumn = (column: keyof DesktopTrackColumnsConfig, value: boolean) => {
    setColumns((current) => ({
      ...current,
      [column]: value,
    }))
  }

  return {
    columns,
    setColumn,
  }
}
