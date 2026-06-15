import { useEffect, useState } from 'react'
import type { TrackShelfConfig } from '@/features/discover/lib/exploration-shelves'
import { loadTrackShelves, type LoadedTrackShelf } from '@/features/discover/lib/load-track-shelves'

interface TrackShelvesState {
  shelves: LoadedTrackShelf[]
  isLoading: boolean
  error: string | null
}

const shelfCache = new Map<string, LoadedTrackShelf[]>()

function getShelfCacheKey(configs: TrackShelfConfig[]) {
  return configs.map((config) => `${config.id}:${config.query}:${config.title}`).join('|')
}

export function useTrackShelves(configs: TrackShelfConfig[], enabled = true) {
  const cacheKey = getShelfCacheKey(configs)
  const cachedShelves = shelfCache.get(cacheKey)
  const [state, setState] = useState<TrackShelvesState>({
    shelves: cachedShelves ?? [],
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    const cachedShelves = shelfCache.get(cacheKey)
    if (cachedShelves) {
      let isCancelled = false

      queueMicrotask(() => {
        if (isCancelled) {
          return
        }

        setState({
          shelves: cachedShelves,
          isLoading: false,
          error: null,
        })
      })

      return () => {
        isCancelled = true
      }
    }

    let isCancelled = false

    queueMicrotask(() => {
      if (isCancelled) {
        return
      }

      setState((currentState) => ({
        shelves: currentState.shelves,
        isLoading: true,
        error: null,
      }))
    })

    void loadTrackShelves(configs)
      .then((shelves) => {
        if (isCancelled) {
          return
        }

        if (shelves.length > 0) {
          shelfCache.set(cacheKey, shelves)
        }

        setState({
          shelves,
          isLoading: false,
          error: shelves.length === 0 ? 'No recommendation shelves were available right now.' : null,
        })
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setState({
          shelves: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Could not load recommendation shelves.',
        })
      })

    return () => {
      isCancelled = true
    }
  }, [cacheKey, configs, enabled])

  if (!enabled) {
    return {
      shelves: [],
      isLoading: false,
      error: null,
    }
  }

  return state
}
