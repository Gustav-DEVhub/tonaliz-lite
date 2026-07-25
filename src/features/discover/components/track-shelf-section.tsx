import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPlaylist } from '@/entities/track/lib/create-playlist'
import type { Playlist, PlaylistSource, Track } from '@/entities/track/model/types'
import { TrackCard } from '@/entities/track/ui/track-card'
import { ShelfCollectionActionMenu } from '@/features/discover/components/shelf-collection-action-menu'
import { cn } from '@/shared/lib/utils'

export function TrackShelfSection({
  title,
  description,
  shelfId,
  tracks,
  source,
  currentTrack,
  isPlaying,
  favoriteTrackIds,
  onPlayTrack,
  onOpenArtist,
  onToggleFavorite,
  onPlayNext,
  onAddToQueue,
  hideHeader = false,
  className,
}: {
  title: string
  description: string
  shelfId?: string
  tracks: Track[]
  source: PlaylistSource
  currentTrack: Track | null
  isPlaying: boolean
  favoriteTrackIds: Set<string>
  onPlayTrack: (track: Track, queue: Playlist) => void
  onOpenArtist: (track: Track) => void
  onToggleFavorite: (track: Track) => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
  hideHeader?: boolean
  className?: string
}) {
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const sectionId = `${source}-${title.toLowerCase().replace(/\s+/g, '-')}`
  const sectionPlaylist = createPlaylist(title, source, tracks)
  const shelfCollectionSource = source === 'home' || source === 'discover' ? source : null
  const canSaveShelfCollection = Boolean(shelfId && shelfCollectionSource)
  const renderedTracks = isMobileViewport ? tracks.slice(0, 8) : tracks

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const handleViewportChange = () => setIsMobileViewport(mediaQuery.matches)

    mediaQuery.addEventListener('change', handleViewportChange)
    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  const updateScrollControls = () => {
    const scroller = scrollerRef.current

    if (!scroller) {
      return
    }

    setCanScrollPrevious(scroller.scrollLeft > 8)
    setCanScrollNext(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 8)
  }

  useEffect(() => {
    updateScrollControls()

    const scroller = scrollerRef.current
    if (!scroller) {
      return
    }

    const resizeObserver = new ResizeObserver(updateScrollControls)
    resizeObserver.observe(scroller)

    return () => {
      resizeObserver.disconnect()
    }
  }, [tracks.length])

  const scrollByPage = (direction: 'previous' | 'next') => {
    const scroller = scrollerRef.current

    if (!scroller) {
      return
    }

    scroller.scrollBy({
      left: direction === 'next' ? scroller.clientWidth * 0.78 : -scroller.clientWidth * 0.78,
      behavior: 'smooth',
    })
  }

  return (
    <section className={cn('min-w-0 space-y-3.5', className)}>
      {hideHeader ? null : (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="font-heading text-[1.15rem] leading-tight text-text-primary sm:text-2xl">{title}</p>
            <p className="max-w-2xl text-[0.92rem] leading-5 text-text-secondary sm:text-sm sm:leading-6">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(canScrollPrevious || canScrollNext) ? (
              <div className="hidden items-center gap-2 lg:flex">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => scrollByPage('previous')}
                  disabled={!canScrollPrevious}
                  aria-label="Scroll previous"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => scrollByPage('next')}
                  disabled={!canScrollNext}
                  aria-label="Scroll next"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : null}
            <p className="hidden font-mono text-xs uppercase tracking-[0.24em] text-text-muted lg:block">
              {tracks.length} picks
            </p>
            {canSaveShelfCollection && shelfId ? (
              <ShelfCollectionActionMenu
                shelfId={shelfId}
                title={title}
                description={description}
                tracks={tracks}
                source={shelfCollectionSource ?? 'home'}
              />
            ) : null}
          </div>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="scrollbar-none -mx-3.5 overflow-x-auto overflow-y-hidden px-3.5 pb-2 scroll-px-3.5 [scroll-snap-type:x_mandatory] [overscroll-behavior-x:contain] sm:mx-0 sm:px-0 sm:scroll-px-0 lg:scrollbar-subtle lg:pb-3 lg:[scrollbar-gutter:stable]"
        onScroll={updateScrollControls}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            scrollByPage('previous')
          }

          if (event.key === 'ArrowRight') {
            event.preventDefault()
            scrollByPage('next')
          }
        }}
        tabIndex={0}
        aria-label={`${title} carousel`}
      >
        <div className="flex min-w-max gap-3.5 sm:gap-4 lg:gap-5">
          {renderedTracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id

            return (
              <div
                key={`${sectionId}-${track.id}`}
                className="w-[72vw] max-w-[18rem] shrink-0 snap-start sm:w-[17rem] lg:w-[12rem] lg:max-w-none xl:w-[13rem] 2xl:w-[13.5rem]"
              >
                <TrackCard
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  isFavorite={favoriteTrackIds.has(track.id)}
                  onPlay={() => {
                    onPlayTrack(track, sectionPlaylist)
                  }}
                  onOpenArtist={() => {
                    onOpenArtist(track)
                  }}
                  onToggleFavorite={() => {
                    onToggleFavorite(track)
                  }}
                  onPlayNext={onPlayNext}
                  onAddToQueue={onAddToQueue}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
