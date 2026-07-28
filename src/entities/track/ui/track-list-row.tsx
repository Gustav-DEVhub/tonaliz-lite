import { Heart, MoreVertical, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import type { Track } from '@/entities/track/model/types'
import {
  DEFAULT_DESKTOP_TRACK_COLUMNS,
  getDesktopTrackGridTemplate,
  resolveDesktopTrackSource,
  type DesktopTrackColumnsConfig,
} from '@/entities/track/ui/desktop-track-columns'
import { TrackActionMenu } from '@/entities/track/ui/track-action-menu'
import { MobileTrackActionSheet } from '@/entities/track/ui/mobile-track-action-sheet'
import { useMobileLongPress } from '@/entities/track/ui/use-mobile-long-press'
import { detectMood } from '@/lib/mood/detect-mood'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn, formatDuration, truncateText } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/use-toast-store'
import { Badge } from '@/shared/ui/badge'

interface ShareContextInfo {
  label: string
  title: string
  url: string | null
}

export function TrackListRow({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onOpenContext,
  onPlayNext,
  onAddToQueue,
  shareContext,
  onViewArtist,
  onRemoveFromHistory,
  onRemoveFromPlaylist,
  contextLabel,
  enableDesktopActionsMenu = false,
  showMoodBadge = true,
  showTags = true,
  showMobileMoreButton = false,
  desktopDetailLayout = false,
  desktopTrackNumber,
  desktopColumns = DEFAULT_DESKTOP_TRACK_COLUMNS,
  desktopSourceText,
}: {
  track: Track
  isCurrent: boolean
  isPlaying: boolean
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  onOpenContext?: () => void
  onPlayNext?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  shareContext?: ShareContextInfo | null
  onViewArtist?: () => void
  onRemoveFromHistory?: () => void
  onRemoveFromPlaylist?: () => void
  contextLabel?: string
  enableDesktopActionsMenu?: boolean
  showMoodBadge?: boolean
  showTags?: boolean
  showMobileMoreButton?: boolean
  desktopDetailLayout?: boolean
  desktopTrackNumber?: number
  desktopColumns?: DesktopTrackColumnsConfig
  desktopSourceText?: string | null
}) {
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false)
  const showToast = useToastStore((state) => state.showToast)
  const mood = detectMood(track)
  const moodToken = moodTheme[mood]
  const longPressBind = useMobileLongPress(() => {
    setIsMobileActionSheetOpen(true)
  })

  const resolvedDesktopSource = desktopSourceText ?? resolveDesktopTrackSource(track)
  const resolvedDesktopColumns = {
    artist: desktopColumns.artist,
    source: desktopColumns.source && Boolean(resolvedDesktopSource),
    duration: desktopColumns.duration,
  }
  const desktopGridTemplate = getDesktopTrackGridTemplate(resolvedDesktopColumns)
  const desktopTitleMeta = contextLabel ?? (!resolvedDesktopColumns.artist ? track.artistName : null)

  const handleDirectFavoriteToggle = () => {
    onToggleFavorite()
    showToast({ title: isFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
  }

  return (
    <article
      role={onOpenContext ? 'button' : undefined}
      tabIndex={onOpenContext ? 0 : undefined}
      {...longPressBind}
      className={cn(
        'content-visibility-auto track-card-surface group/track-actions rounded-[1.3rem] px-3 py-3 transition-[background-color,border-color,box-shadow] duration-200 sm:rounded-[1.45rem] sm:px-4',
        onOpenContext && 'cursor-pointer hover:border-white/12 hover:bg-card-hover',
        isCurrent && 'mood-glow ring-1 ring-white/10',
      )}
      onClick={onOpenContext}
      onKeyDown={(event) => {
        if (!onOpenContext) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenContext()
        }
      }}
    >
      <div className={cn('flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3 xl:gap-4', desktopDetailLayout && 'lg:hidden')}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <img src={track.imageUrl} alt={`${track.name} artwork`} loading="lazy" decoding="async" className="size-[4rem] rounded-[0.95rem] object-cover sm:size-[4.4rem] sm:rounded-[1rem]" />

          <button
            type="button"
            className="mood-glow flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.08)),color-mix(in_srgb,var(--mood-accent)_18%,rgba(0,0,0,0.6))] text-white transition-transform duration-200 hover:scale-[1.03] hover:border-white/18 sm:size-10"
            onClick={(event) => {
              event.stopPropagation()
              onPlay()
            }}
            aria-label={isCurrent && isPlaying ? 'Pause track' : 'Play track'}
          >
            {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {showMoodBadge ? (
                <Badge
                  className="border-transparent uppercase tracking-[0.1em]"
                  style={{
                    background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0, 0, 0, 0.45))`,
                    color: moodToken.text,
                  }}
                >
                  {moodToken.label}
                </Badge>
              ) : null}
              <p className="font-mono text-[0.64rem] uppercase tracking-[0.12em] text-text-muted lg:hidden">Track</p>
            </div>
            <h3 className="mt-1.5 line-clamp-1 font-heading text-[1rem] text-text-primary sm:mt-2 sm:text-[1.08rem] lg:text-[1rem] xl:text-[1.05rem]">
              {truncateText(track.name, 68)}
            </h3>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.84rem] leading-5 text-text-secondary sm:text-sm">
              <span className="line-clamp-1">{truncateText(track.artistName, 58)}</span>
              <span className="hidden text-text-muted lg:inline">/</span>
              <span className="hidden truncate text-text-muted lg:inline">{track.genre ?? 'Independent release'}</span>
              {contextLabel ? (
                <>
                  <span className="text-text-muted md:hidden">/</span>
                  <span className="text-text-muted md:hidden">{contextLabel}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 lg:min-w-[14rem] lg:justify-end xl:min-w-[16rem] xl:gap-4">
          <div className="hidden min-w-0 flex-1 flex-wrap justify-end gap-2 2xl:flex 2xl:max-w-[14rem]">
            {showTags ? track.tags.slice(0, 2).map((tag) => (
              <Badge key={`${track.id}-${tag}`}>{tag}</Badge>
            )) : null}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {contextLabel ? (
              <span className="hidden whitespace-nowrap text-[0.72rem] text-text-muted 2xl:inline">{contextLabel}</span>
            ) : null}
            <span className="min-w-9 text-right text-[0.78rem] text-text-secondary sm:text-xs sm:text-text-muted">
              {formatDuration(track.duration)}
            </span>
            <button
              type="button"
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full border transition-colors sm:size-10',
                isFavorite
                  ? 'border-primary/40 bg-primary/14 text-primary-soft'
                  : 'border-border-subtle text-text-muted hover:text-text-primary',
              )}
              onClick={(event) => {
                event.stopPropagation()
                handleDirectFavoriteToggle()
              }}
              aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={cn('size-4', isFavorite && 'fill-current')} />
            </button>
            {showMobileMoreButton ? (
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border-subtle text-text-muted transition-colors active:bg-white/8 active:text-text-primary sm:size-10 lg:hidden"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsMobileActionSheetOpen(true)
                }}
                aria-label="More options"
              >
                <MoreVertical className="size-4" />
              </button>
            ) : null}
            <div
              className="hidden items-center lg:flex"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {!enableDesktopActionsMenu ? (
                <TrackActionMenu
                  track={track}
                  onPlayNext={onPlayNext}
                  onAddToQueue={onAddToQueue}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => {
                    onToggleFavorite()
                  }}
                  shareContext={shareContext}
                />
              ) : null}

              {enableDesktopActionsMenu ? (
                <TrackActionMenu
                  track={track}
                  variant="desktop"
                  onPlayNext={onPlayNext}
                  onAddToQueue={onAddToQueue}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => onToggleFavorite()}
                  onRemoveFromHistory={onRemoveFromHistory ? () => onRemoveFromHistory() : undefined}
                  onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist() : undefined}
                  onViewArtist={onViewArtist ? () => onViewArtist() : undefined}
                  triggerClassName="border-white/12 bg-black/16"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {desktopDetailLayout ? (
        <div
          className="hidden min-w-0 items-center gap-3 lg:grid"
          style={{ gridTemplateColumns: desktopGridTemplate }}
        >
          <div className="flex items-center justify-center">
            {isCurrent ? (
              <span className="inline-flex size-7 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary-soft">
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
              </span>
            ) : (
              <span className="text-center font-mono text-[0.72rem] text-text-muted">
                {desktopTrackNumber ?? '—'}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <img src={track.imageUrl} alt={`${track.name} artwork`} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[0.9rem] object-cover" />
              <button
                type="button"
                className="mood-glow flex size-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.08)),color-mix(in_srgb,var(--mood-accent)_18%,rgba(0,0,0,0.6))] text-white transition-transform duration-200 hover:scale-[1.03] hover:border-white/18"
                onClick={(event) => {
                  event.stopPropagation()
                  onPlay()
                }}
                aria-label={isCurrent && isPlaying ? 'Pause track' : 'Play track'}
              >
                {isCurrent && isPlaying ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <h3 title={track.name} className="truncate font-heading text-[0.96rem] text-text-primary">
                  {track.name}
                </h3>
                {desktopTitleMeta ? (
                  <p className="mt-0.5 truncate text-[0.76rem] text-text-muted">
                    {desktopTitleMeta}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {resolvedDesktopColumns.artist ? (
            <p title={track.artistName} className="min-w-0 truncate text-sm text-text-secondary">
              {track.artistName}
            </p>
          ) : null}

          {resolvedDesktopColumns.source ? (
            <p title={resolvedDesktopSource ?? undefined} className="min-w-0 truncate text-sm text-text-muted">
              {resolvedDesktopSource}
            </p>
          ) : null}

          {resolvedDesktopColumns.duration ? (
            <span className="text-right text-[0.78rem] text-text-muted">
              {formatDuration(track.duration)}
            </span>
          ) : null}

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full border transition-colors',
                isFavorite
                  ? 'border-primary/40 bg-primary/14 text-primary-soft'
                  : 'border-border-subtle text-text-muted hover:text-text-primary',
              )}
              onClick={(event) => {
                event.stopPropagation()
                handleDirectFavoriteToggle()
              }}
              aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={cn('size-4', isFavorite && 'fill-current')} />
            </button>
            {enableDesktopActionsMenu ? (
              <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <TrackActionMenu
                  track={track}
                  variant="desktop"
                  onPlayNext={onPlayNext}
                  onAddToQueue={onAddToQueue}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => onToggleFavorite()}
                  onRemoveFromHistory={onRemoveFromHistory ? () => onRemoveFromHistory() : undefined}
                  onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist() : undefined}
                  onViewArtist={onViewArtist ? () => onViewArtist() : undefined}
                  shareContext={shareContext}
                  triggerClassName="pointer-events-auto translate-y-0 scale-100 opacity-100 border-white/12 bg-black/16"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {track.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 md:hidden">
          {track.tags.slice(0, 3).map((tag) => (
            <Badge key={`${track.id}-mobile-${tag}`}>{tag}</Badge>
          ))}
        </div>
      ) : null}

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
          onRemoveFromHistory={onRemoveFromHistory ? () => onRemoveFromHistory() : undefined}
          onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist() : undefined}
          onViewArtist={onViewArtist ? () => onViewArtist() : onOpenContext ? () => onOpenContext() : undefined}
          shareContext={shareContext}
        />
      ) : null}
    </article>
  )
}
