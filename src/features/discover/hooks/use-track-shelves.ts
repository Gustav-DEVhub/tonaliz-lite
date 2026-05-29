import { useEffect, useState } from 'react'
import type { TrackShelfConfig } from '@/features/discover/lib/exploration-shelves'
import { loadTrackShelves, type LoadedTrackShelf } from '@/features/discover/lib/load-track-shelves'

interface TrackShelvesState {
  shelves: LoadedTrackShelf[]
  isLoading: boolean
  error: string | null
}

export function useTrackShelves(configs: TrackShelfConfig[], enabled = true) {
  const [state, setState] = useState<TrackShelvesState>({
    shelves: [],
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!enabled) {
      return
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
  }, [configs, enabled])

  if (!enabled) {
    return {
      shelves: [],
      isLoading: false,
      error: null,
    }
  }

  return state
}
