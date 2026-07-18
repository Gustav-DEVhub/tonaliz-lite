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
import { useToastStore } from '@/shared/store/use-toast-store'

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
  const currentTrackId = currentTrack?.id ?? null
  const isOnline = usePlayerStore((state) => state.isOnline)
  const closeDesktopRail = usePlayerStore((state) => state.closeDesktopRail)
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const showToast = useToastStore((state) => state.showToast)
  const isCurrentFavorite = useFavoritesStore((state) =>
    currentTrackId ? state.favorites.some((favorite) => favorite.id === currentTrackId) : false,
  )

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoadingArtist, setIsLoadingArtist] = useState(false)

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
      showToast({ title: 'No link available', variant: 'warning' })
      return
    }

    try {
      await copyTextToClipboard(currentTrack.shareUrl)
      showToast({ title: 'Link copied', variant: 'success' })
    } catch {
      showToast({ title: "Couldn't share", variant: 'error' })
    }
  }

  const handleToggleFavorite = () => {
    void toggleFavorite(currentTrack)
    showToast({ title: isCurrentFavorite ? 'Removed from Music I Like' : 'Added to Music I Like', variant: 'success' })
  }

  return (
    <aside className="relative hidden min-w-0 lg:flex lg:h-full lg:min-h-0 lg:justify-end">
      <DesktopRailToggle variant="open-button" onClick={closeDesktopRail} />

      <div className="w-full lg:h-full lg:min-h-0">
        <div className="editorial-panel mood-glow group/rail overflow-hidden rounded-[1.8rem] border-white/8 p-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col xl:p-3.5">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

          <div className="flex justify-end gap-2 pl-12">
            <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              <TrackActionMenu
                track={currentTrack}
                onPlayNext={playNextInQueue}
                onAddToQueue={addToQueue}
                isFavorite={isCurrentFavorite}
                onToggleFavorite={() => {
                  void toggleFavorite(currentTrack)
                }}
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

          <div className="mt-2 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 scrollbar-subtle">
            <button
              type="button"
              onClick={openExpandedPlayer}
              className="w-full text-left transition-transform duration-300 hover:translate-y-[-1px]"
            >
              <div className="rounded-[1.45rem] border border-white/8 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_22%,transparent),transparent_58%)] p-2.25">
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="aspect-square max-h-[min(36vh,20rem)] w-full rounded-[1.15rem] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.42)]"
                />
              </div>
            </button>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-heading text-[1.55rem] leading-[1.08] text-text-primary">
                  {currentTrack.name}
                </h3>
                <p className="mt-0.75 line-clamp-1 text-[0.88rem] text-text-secondary">{currentTrack.artistName}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                <RailIconButton
                  label={isCurrentFavorite ? 'Remove favorite' : 'Add favorite'}
                  isActive={isCurrentFavorite}
                  onClick={handleToggleFavorite}
                >
                  <Heart className={isCurrentFavorite ? 'size-4 fill-current' : 'size-4'} />
                </RailIconButton>
                <RailIconButton label="Share" onClick={() => void shareTrack()}>
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
          </div>
        </div>
      </div>
    </aside>
  )
}


