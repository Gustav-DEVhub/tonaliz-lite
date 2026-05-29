import { ExternalLink, Heart, Share2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ArtistProfile } from '@/entities/track/model/types'
import { TrackActionMenu } from '@/entities/track/ui/track-action-menu'
import { useFavoritesStore } from '@/features/library/store/use-favorites-store'
import { ArtistMediaBlock } from '@/features/player/components/artist-media-block'
import { DesktopRailToggle } from '@/features/player/components/desktop-rail-toggle'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { getArtistProfile } from '@/lib/jamendo/artist-service'
import { copyTextToClipboard } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'

function RailIconButton({
  label,
  onClick,
  isActive = false,
  children,
}: {
  label: string
  onClick: () => void
  isActive?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        'group relative inline-flex size-10 items-center justify-center rounded-full border transition-colors hover:bg-white/14 hover:text-white',
        isActive
          ? 'border-primary/40 bg-primary/14 text-primary-soft'
          : 'border-white/18 bg-white/8 text-text-primary',
      )}
      onClick={onClick}
      aria-label={label}
    >
      {children}
      <span className="pointer-events-none absolute -bottom-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block">
        {label}
      </span>
    </button>
  )
}

export function NowPlayingPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const closeDesktopRail = usePlayerStore((state) => state.closeDesktopRail)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isFavorite = useFavoritesStore((state) => state.isFavorite)

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoadingArtist, setIsLoadingArtist] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const isCurrentFavorite = currentTrack ? isFavorite(currentTrack.id) : false

  useEffect(() => {
    let isActive = true

    if (!currentTrack) {
      return () => {
        isActive = false
      }
    }

    void (async () => {
      if (!isActive) {
        return
      }

      setArtistProfile(null)
      setIsLoadingArtist(true)

      const profile = await getArtistProfile(currentTrack)

      if (!isActive) {
        return
      }

      setArtistProfile(profile)
      setIsLoadingArtist(false)
    })()

    return () => {
      isActive = false
    }
  }, [currentTrack])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = setTimeout(() => {
      setFeedback(null)
    }, 1800)

    return () => {
      clearTimeout(timeout)
    }
  }, [feedback])

  if (!currentTrack) {
    return null
  }

  const shareContext =
    typeof window !== 'undefined'
      ? {
          label: 'player link',
          title: `${currentTrack.name} on Tonaliz Lite`,
          url: `${window.location.origin}/now-playing`,
        }
      : null

  const openExpandedPlayer = () => {
    navigate('/now-playing', {
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    })
  }

  const shareTrack = async () => {
    if (!currentTrack.shareUrl) {
      setFeedback('No link available')
      return
    }

    try {
      await copyTextToClipboard(currentTrack.shareUrl)
      setFeedback('Song link copied')
    } catch {
      setFeedback('Copy failed')
    }
  }

  return (
    <aside className="relative hidden min-w-0 lg:flex lg:h-full lg:min-h-0 lg:justify-end">
      <DesktopRailToggle variant="open-button" onClick={closeDesktopRail} />

      <div className="w-full lg:h-full lg:min-h-0">
        <div className="editorial-panel mood-glow group/rail overflow-hidden rounded-[2rem] border-white/8 p-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col xl:p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

          <div className="flex justify-end gap-2 pl-12">
            <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              <TrackActionMenu
                track={currentTrack}
                onPlayNext={playNextInQueue}
                onAddToQueue={addToQueue}
                shareContext={shareContext}
                triggerTooltipLabel="Actions"
                triggerClassName="border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
                menuClassName="top-12"
              />
              <RailIconButton label="Open player" onClick={openExpandedPlayer}>
                <ExternalLink className="size-4" />
              </RailIconButton>
            </div>
          </div>

          <div className="mt-3 space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 scrollbar-subtle">
            <button
              type="button"
              onClick={openExpandedPlayer}
              className="w-full text-left transition-transform duration-300 hover:translate-y-[-1px]"
            >
              <div className="rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_22%,transparent),transparent_58%)] p-3">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="aspect-square max-h-[min(42vh,23rem)] w-full rounded-[1.4rem] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                />
              </div>
            </button>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-heading text-2xl leading-tight text-text-primary">{currentTrack.name}</h3>
                <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{currentTrack.artistName}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                <RailIconButton
                  label={isCurrentFavorite ? 'Remove favorite' : 'Add favorite'}
                  isActive={isCurrentFavorite}
                  onClick={() => {
                    void toggleFavorite(currentTrack)
                  }}
                >
                  <Heart className={isCurrentFavorite ? 'size-4 fill-current' : 'size-4'} />
                </RailIconButton>
                <RailIconButton label="Copy song link" onClick={() => void shareTrack()}>
                  <Share2 className="size-4" />
                </RailIconButton>
              </div>
            </div>

            <ArtistMediaBlock
              artistName={currentTrack.artistName}
              artistProfile={artistProfile}
              isLoading={isLoadingArtist}
              isOnline={isOnline}
              compact
            />
            {feedback ? (
              <div className="pointer-events-none rounded-full border border-white/10 bg-black/78 px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-text-primary">
                {feedback}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}
