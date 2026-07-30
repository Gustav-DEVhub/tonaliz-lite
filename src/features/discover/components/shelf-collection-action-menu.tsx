import { Bookmark, BookmarkCheck, ListPlus, MoreHorizontal, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PlaylistSource, Track } from '@/entities/track/model/types'
import { AddToPlaylistDialog } from '@/features/library/components/add-to-playlist-dialog'
import { useSavedCollectionsStore } from '@/features/library/store/use-saved-collections-store'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import {
  getShelfCollectionSourceId,
} from '@/features/discover/lib/exploration-shelves'
import { useToastStore } from '@/shared/store/use-toast-store'
import { ShareLinkDialog } from '@/shared/ui/share-link-dialog'

interface ShelfCollectionActionMenuProps {
  shelfId: string
  title: string
  description: string
  tracks: Track[]
  source: Extract<PlaylistSource, 'home' | 'discover'>
}

export function ShelfCollectionActionMenu({
  shelfId,
  title,
  description,
  tracks,
  source,
}: ShelfCollectionActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const saveCollection = useSavedCollectionsStore((state) => state.saveCollection)
  const removeCollection = useSavedCollectionsStore((state) => state.removeCollection)
  const isSaved = useSavedCollectionsStore((state) => state.isSaved)
  const showToast = useToastStore((state) => state.showToast)

  const sourceId = getShelfCollectionSourceId(source, shelfId)
  const routePath = `/collection/${encodeURIComponent(sourceId)}`
  const shareUrl = typeof window === 'undefined' ? routePath : `${window.location.origin}${routePath}`
  const isCollectionSaved = isSaved('shelf-collection', sourceId)
  const coverTrack = tracks[0] ?? null

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggleSaved = async () => {
    if (isCollectionSaved) {
      await removeCollection('shelf-collection', sourceId)
      showToast({ title: 'Removed from Library', variant: 'success' })
      setIsOpen(false)
      return
    }

    await saveCollection({
      type: 'shelf-collection',
      sourceId,
      title,
      subtitle: description,
      imageUrl: coverTrack?.imageUrl ?? null,
      trackCount: tracks.length,
      tracks,
      routePath,
      externalUrl: null,
    })
    showToast({ title: 'Saved to Library', variant: 'success' })
    setIsOpen(false)
  }

  const handleAddToQueue = () => {
    if (tracks.length === 0) {
      showToast({ title: 'No tracks to add', variant: 'warning' })
      return
    }

    tracks.forEach((track) => addToQueue(track))
    showToast({ title: 'Added to queue', description: `${tracks.length} tracks added.`, variant: 'success' })
    setIsOpen(false)
  }

  const itemClassName =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary'

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-secondary transition-colors hover:bg-white/8 hover:text-text-primary"
          onClick={() => setIsOpen((open) => !open)}
          aria-label="More options"
          aria-expanded={isOpen}
          title="More options"
        >
          <MoreHorizontal className="size-4" />
        </button>

        {isOpen ? (
          <div className="editorial-panel absolute right-0 top-11 z-40 w-60 rounded-[1.1rem] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
            <button type="button" className={itemClassName} onClick={() => void handleToggleSaved()}>
              {isCollectionSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              {isCollectionSaved ? 'Remove from Library' : 'Save to Library'}
            </button>
            <button type="button" className={itemClassName} onClick={handleAddToQueue}>
              <ListPlus className="size-4" />
              Add to queue
            </button>
            <button
              type="button"
              className={itemClassName}
              onClick={() => {
                if (tracks.length === 0) {
                  showToast({ title: 'No tracks to add', variant: 'warning' })
                  return
                }

                setIsOpen(false)
                setIsAddToPlaylistOpen(true)
              }}
            >
              <ListPlus className="size-4" />
              Add to playlist
            </button>
            <button
              type="button"
              className={itemClassName}
              onClick={() => {
                setIsOpen(false)
                setIsShareOpen(true)
              }}
            >
              <Share2 className="size-4" />
              Share
            </button>
          </div>
        ) : null}
      </div>

      <AddToPlaylistDialog
        tracks={tracks}
        collectionTitle={title}
        open={isAddToPlaylistOpen}
        onOpenChange={setIsAddToPlaylistOpen}
      />
      <ShareLinkDialog
        title={`${title} on Tonaliz Lite`}
        description={`Shelf collection · ${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
        url={shareUrl}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
      />
    </>
  )
}
