import * as Dialog from '@radix-ui/react-dialog'
import { Check, ListPlus, Plus, X } from 'lucide-react'
import { useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Track } from '@/entities/track/model/types'
import { usePlaylistsStore } from '@/features/library/store/use-playlists-store'
import { cn } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Button } from '@/shared/ui/button'

interface AddToPlaylistDialogProps {
  track?: Track | null
  tracks?: Track[] | null
  collectionTitle?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (playlistId: string) => void
}

export function AddToPlaylistDialog({
  track = null,
  tracks = null,
  collectionTitle,
  open,
  onOpenChange,
  onCreated,
}: AddToPlaylistDialogProps) {
  const playlists = usePlaylistsStore((state) => state.playlists)
  const playlistTracksById = usePlaylistsStore((state) => state.playlistTracksById)
  const createPlaylist = usePlaylistsStore((state) => state.createPlaylist)
  const addTrackToPlaylist = usePlaylistsStore((state) => state.addTrackToPlaylist)
  const addTracksToPlaylist = usePlaylistsStore((state) => state.addTracksToPlaylist)
  const showToast = useToastStore((state) => state.showToast)
  const dragStartYRef = useRef<number | null>(null)
  const dragLatestYRef = useRef<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const uniqueTracks = useMemo(
    () => (tracks ? Array.from(new Map(tracks.map((item) => [item.id, item])).values()) : []),
    [tracks],
  )
  const effectiveTracks = useMemo(
    () => (uniqueTracks.length > 0 ? uniqueTracks : track ? [track] : []),
    [track, uniqueTracks],
  )
  const isBulkMode = effectiveTracks.length > 1

  const playlistIdsContainingTrack = useMemo(() => {
    if (!track) {
      return new Set<string>()
    }

    return new Set(
      Object.entries(playlistTracksById)
        .filter(([, playlistTracks]) => playlistTracks.some((playlistTrack) => playlistTrack.trackId === track.id))
        .map(([playlistId]) => playlistId),
    )
  }, [playlistTracksById, track])

  const playlistTrackOverlapById = useMemo(() => {
    if (!isBulkMode) {
      return new Map<string, number>()
    }

    const sourceTrackIds = new Set(effectiveTracks.map((item) => item.id))

    return new Map(
      Object.entries(playlistTracksById).map(([playlistId, playlistTracks]) => [
        playlistId,
        playlistTracks.reduce((count, playlistTrack) => count + (sourceTrackIds.has(playlistTrack.trackId) ? 1 : 0), 0),
      ]),
    )
  }, [effectiveTracks, isBulkMode, playlistTracksById])

  const describeBulkResult = (addedCount: number, alreadyAddedCount: number) => {
    if (addedCount > 0 && alreadyAddedCount > 0) {
      return {
        title: `Added ${addedCount} tracks · ${alreadyAddedCount} already existed`,
        variant: 'success' as const,
      }
    }

    if (addedCount > 0) {
      return {
        title: addedCount === 1 ? 'Added to playlist' : `Added ${addedCount} tracks to playlist`,
        variant: 'success' as const,
      }
    }

    return {
      title: 'Already in playlist',
      variant: 'info' as const,
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (effectiveTracks.length === 0 || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      if (isBulkMode) {
        const result = await addTracksToPlaylist(playlistId, effectiveTracks)
        const feedback = describeBulkResult(result.addedCount, result.alreadyAddedCount)
        showToast(feedback)
        handleOpenChange(false)
        return
      }

      const singleTrack = effectiveTracks[0]

      if (!singleTrack) {
        return
      }

      const result = await addTrackToPlaylist(playlistId, singleTrack)
      showToast({
        title: result.status === 'already-added' ? 'Already in playlist' : 'Added to playlist',
        variant: result.status === 'already-added' ? 'info' : 'success',
      })
      handleOpenChange(false)
    } catch {
      showToast({ title: 'Could not add to playlist', variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (isSubmitting) {
      return
    }

    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      showToast({ title: 'Title is required', variant: 'warning' })
      return
    }

    setIsSubmitting(true)

    try {
      const playlist = await createPlaylist({
        title: normalizedTitle,
        description,
      })

      if (effectiveTracks.length > 0) {
        if (isBulkMode) {
          const result = await addTracksToPlaylist(playlist.id, effectiveTracks)
          showToast({
            title: 'Playlist created',
            description: result.addedCount > 0
              ? `Added ${result.addedCount} ${result.addedCount === 1 ? 'track' : 'tracks'} to the new playlist.`
              : 'All tracks were already present.',
            variant: 'success',
          })
        } else {
          const singleTrack = effectiveTracks[0]

          if (singleTrack) {
            await addTrackToPlaylist(playlist.id, singleTrack)
            showToast({
              title: 'Playlist created',
              description: 'Track added to the new playlist.',
              variant: 'success',
            })
          } else {
            showToast({ title: 'Playlist created', variant: 'success' })
          }
        }
      } else {
        showToast({ title: 'Playlist created', variant: 'success' })
      }

      onCreated?.(playlist.id)
      handleOpenChange(false)
    } catch {
      showToast({ title: 'Could not create playlist', variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetDraft = () => {
    setIsCreating(false)
    setTitle('')
    setDescription('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDraft()
    }

    onOpenChange(nextOpen)
  }

  const handleDragHandlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragStartYRef.current = event.clientY
    dragLatestYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleDragHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    dragLatestYRef.current = event.clientY
  }

  const handleDragHandlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const startY = dragStartYRef.current
    const latestY = dragLatestYRef.current
    dragStartYRef.current = null
    dragLatestYRef.current = null

    if (startY !== null && latestY !== null && latestY - startY > 64) {
      handleOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[140] bg-black/75"
          onClick={(event) => {
            event.stopPropagation()
            handleOpenChange(false)
          }}
        />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[141] max-h-[88vh] overflow-y-auto rounded-t-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(23,19,31,0.98),rgba(10,8,16,0.99))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_58px_rgba(0,0,0,0.46)] outline-none will-change-transform',
            'lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-[min(30rem,calc(100vw-2rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[1.7rem] lg:p-5 lg:shadow-[0_22px_72px_rgba(0,0,0,0.52)]',
          )}
          onClick={(event) => {
            event.stopPropagation()
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
        >
          <button
            type="button"
            className="mx-auto mb-3 block h-1.5 w-14 touch-none rounded-full bg-white/18 transition-colors active:bg-white/28 lg:hidden"
            onPointerDown={handleDragHandlePointerDown}
            onPointerMove={handleDragHandlePointerMove}
            onPointerUp={handleDragHandlePointerEnd}
            onPointerCancel={handleDragHandlePointerEnd}
            aria-label="Drag down to close add to playlist"
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-xl text-text-primary">Add to playlist</Dialog.Title>
              <Dialog.Description className="mt-1 line-clamp-1 text-sm text-text-secondary">
                {isBulkMode ? `${collectionTitle ?? 'Collection'} · ${effectiveTracks.length} tracks` : track ? track.name : 'Create a local playlist.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Close add to playlist"
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-2">
            {effectiveTracks.length > 0 ? (
              playlists.length > 0 ? (
                playlists.map((playlist) => {
                  const alreadyAdded = isBulkMode
                    ? (playlistTrackOverlapById.get(playlist.id) ?? 0) === effectiveTracks.length
                    : playlistIdsContainingTrack.has(playlist.id)
                  const trackCount = playlistTracksById[playlist.id]?.length ?? 0
                  const overlapCount = playlistTrackOverlapById.get(playlist.id) ?? 0

                  return (
                    <button
                      key={playlist.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.035] px-3 py-3 text-left transition-colors hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        void handleAddToPlaylist(playlist.id)
                      }}
                      disabled={isSubmitting}
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/12 text-primary-soft">
                        {alreadyAdded ? <Check className="size-4" /> : <ListPlus className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-[0.98rem] text-text-primary">{playlist.title}</span>
                        <span className="mt-0.5 block text-xs text-text-secondary">
                          {isBulkMode
                            ? alreadyAdded
                              ? 'All tracks already added'
                              : overlapCount > 0
                                ? `${overlapCount} already added · ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`
                                : `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`
                            : alreadyAdded
                              ? 'Already added'
                              : `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`}
                        </span>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.035] px-4 py-5 text-sm text-text-secondary">
                  No playlists yet. Create one below.
                </div>
              )
            ) : null}
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/18 p-3">
            {!isCreating ? (
              <Button
                type="button"
                className="w-full gap-2"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setIsCreating(true)
                }}
              >
                <Plus className="size-4" />
                New playlist
              </Button>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-text-secondary">
                  <span className="mb-1.5 block font-medium text-text-primary">Title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2.5 text-text-primary outline-none transition-colors focus:border-primary/45"
                    placeholder="Playlist name"
                    autoFocus
                  />
                </label>
                <label className="block text-sm text-text-secondary">
                  <span className="mb-1.5 block font-medium text-text-primary">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/24 px-3 py-2.5 text-text-primary outline-none transition-colors focus:border-primary/45"
                    placeholder="Optional"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setIsCreating(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      void handleCreatePlaylist()
                    }}
                    disabled={isSubmitting}
                  >
                    Create
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
