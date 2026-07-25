import { Heart, Pause, Play } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { Track } from '@/entities/track/model/types'
import { TrackActionMenu } from '@/entities/track/ui/track-action-menu'
import { MobileTrackActionSheet } from '@/entities/track/ui/mobile-track-action-sheet'
import { useMobileLongPress } from '@/entities/track/ui/use-mobile-long-press'
import { detectMood } from '@/lib/mood/detect-mood'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn, formatDuration, truncateText } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function TrackCard({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onOpenArtist,
  onToggleFavorite,
  onPlayNext,
  onAddToQueue,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onOpenArtist: () => void
  onToggleFavorite: () => void
  onPlayNext: (track: Track) => void
  onAddToQueue: (track: Track) => void
}) {
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  )
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false)
  const showToast = useToastStore((state) => state.showToast)
  const mood = detectMood(track)
  const moodToken = moodTheme[mood]
  const longPressBind = useMobileLongPress(() => {
    setIsMobileActionSheetOpen(true)
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleViewportChange = () => setIsDesktopViewport(mediaQuery.matches)

    mediaQuery.addEventListener('change', handleViewportChange)
    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])
  const playIcon =
    isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />

  const handleOpenArtistFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onOpenArtist()
  }

  const stopEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const stopKeyboardPropagation = (event: KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleDirectFavoriteToggle = () => {
    onToggleFavorite()
    showToast({ title: isFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
  }

  return (
    <>
      {isDesktopViewport ? (
        <article
        role="button"
        tabIndex={0}
        onClick={onOpenArtist}
        onKeyDown={handleOpenArtistFromKeyboard}
        className={cn(
          'track-card-surface group/track-actions hidden h-full cursor-pointer flex-col overflow-hidden rounded-[1.35rem] p-2.5 transition-[background-color,border-color,box-shadow,filter,transform] duration-200 hover:-translate-y-1 hover:brightness-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/16 lg:flex',
          isCurrent && 'mood-glow ring-1 ring-white/10',
        )}
        aria-label={`Open ${track.artistName} artist playlist`}
      >
        <div className="relative overflow-hidden rounded-[1.1rem]">
          <img
            src={track.imageUrl}
            alt={`${track.name} artwork`}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover transition-transform duration-300 group-hover/track-actions:scale-[1.025]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
          <div
            className="absolute right-2 top-2 z-10"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <TrackActionMenu
              track={track}
              variant="desktop"
              isFavorite={isFavorite}
              onPlayNext={onPlayNext}
              onAddToQueue={onAddToQueue}
              onToggleFavorite={() => onToggleFavorite()}
              onViewArtist={() => onOpenArtist()}
              triggerClassName="border-white/14 bg-black/58 text-white hover:bg-black/72"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5">
            <Badge
              className="border-transparent px-2 py-1 text-[0.58rem] uppercase tracking-[0.12em]"
              style={{
                background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0, 0, 0, 0.45))`,
                color: moodToken.text,
              }}
            >
              {moodToken.label}
            </Badge>
            <Button
              type="button"
              size="icon"
              className="mood-glow size-10 border-transparent bg-black/58 text-white opacity-0 transition-all duration-200 hover:bg-black/72 group-hover/track-actions:translate-y-0 group-hover/track-actions:opacity-100 group-focus-within/track-actions:opacity-100"
              onClick={(event) => {
                stopEvent(event)
                onPlay()
              }}
              onKeyDown={stopKeyboardPropagation}
            >
              {playIcon}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-heading text-[0.98rem] leading-tight text-text-primary">
              {truncateText(track.name, 52)}
            </p>
            <p className="mt-1 truncate text-[0.78rem] leading-5 text-text-secondary">
              {truncateText(track.artistName, 42)}
            </p>
          </div>
          <button
            type="button"
            className={cn(
              'mt-0.5 rounded-full border p-2 opacity-0 transition-all duration-200 group-hover/track-actions:opacity-100 group-focus-within/track-actions:opacity-100',
              isFavorite
                ? 'border-primary/40 bg-primary/14 text-primary-soft opacity-100'
                : 'border-border-subtle text-text-muted hover:text-text-primary',
            )}
            onClick={(event) => {
              stopEvent(event)
              handleDirectFavoriteToggle()
            }}
            onKeyDown={stopKeyboardPropagation}
            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Heart className={cn('size-4', isFavorite && 'fill-current')} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem] text-text-secondary">
          <span className="min-w-0 truncate">{track.genre ?? 'Independent'}</span>
          <span className="shrink-0">{formatDuration(track.duration)}</span>
        </div>

        {track.tags.length > 0 ? (
          <div className="mt-auto flex min-h-7 flex-wrap gap-1.5 pt-2">
            {track.tags.slice(0, 2).map((tag) => (
              <Badge key={`${track.id}-${tag}`} className="px-2 py-0.5 text-[0.62rem] tracking-[0.08em]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        </article>
      ) : (

        <article
        role="button"
        tabIndex={0}
        onClick={onOpenArtist}
        onKeyDown={handleOpenArtistFromKeyboard}
        {...longPressBind}
        className={cn(
          'track-card-surface group/track-actions flex h-full cursor-pointer flex-col gap-2.5 overflow-hidden rounded-[1.35rem] p-2.5 transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/16 sm:gap-3 sm:rounded-[1.45rem] sm:p-3 lg:hidden',
          isCurrent && 'mood-glow ring-1 ring-white/10',
        )}
        aria-label={`Open ${track.artistName} artist playlist`}
      >
        <div className="relative overflow-hidden rounded-[1.05rem] sm:rounded-[1.15rem]">
          <img
            src={track.imageUrl}
            alt={`${track.name} artwork`}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5">
            <Badge
              className="border-transparent px-2 py-1 text-[0.6rem] uppercase tracking-[0.1em]"
              style={{
                background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0, 0, 0, 0.45))`,
                color: moodToken.text,
              }}
            >
              {moodToken.label}
            </Badge>
            <Button
              type="button"
              size="icon"
              className="mood-glow size-10 border-transparent bg-black/58 text-white hover:bg-black/72"
              onClick={(event) => {
                stopEvent(event)
                onPlay()
              }}
              onKeyDown={stopKeyboardPropagation}
            >
              {playIcon}
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="line-clamp-2 font-heading text-[1rem] leading-tight text-text-primary">
              {truncateText(track.name, 40)}
            </p>
            <p className="mt-1 truncate text-[0.82rem] leading-5 text-text-secondary">
              {truncateText(track.artistName, 38)}
            </p>
          </div>
          <button
            type="button"
            className={cn(
              'mt-0.5 shrink-0 rounded-full border p-2 transition-colors',
              isFavorite
                ? 'border-primary/40 bg-primary/14 text-primary-soft'
                : 'border-border-subtle text-text-muted hover:text-text-primary',
            )}
            onClick={(event) => {
              stopEvent(event)
              handleDirectFavoriteToggle()
            }}
            onKeyDown={stopKeyboardPropagation}
            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Heart className={cn('size-4', isFavorite && 'fill-current')} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 text-[0.74rem] text-text-secondary">
          <span className="min-w-0 truncate">{track.genre ?? 'Independent release'}</span>
          <span className="shrink-0">{formatDuration(track.duration)}</span>
        </div>

        {track.tags.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {track.tags.slice(0, 2).map((tag) => (
              <Badge key={`${track.id}-${tag}`} className="px-2 py-0.5 text-[0.62rem] tracking-[0.08em]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        </article>
      )}

      {isMobileActionSheetOpen ? (
        <MobileTrackActionSheet
          open
          track={track}
          isFavorite={isFavorite}
          onOpenChange={setIsMobileActionSheetOpen}
          onPlay={onPlay}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
          onToggleFavorite={() => onToggleFavorite()}
          onViewArtist={() => onOpenArtist()}
        />
      ) : null}
    </>
  )
}
