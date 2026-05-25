import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ArtistProfile } from '@/entities/track/model/types'
import { ArtistMediaBlock } from '@/features/player/components/artist-media-block'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { getArtistProfile } from '@/lib/jamendo/artist-service'
import { moodTheme } from '@/shared/constants/mood-theme'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export function NowPlayingPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const queue = usePlayerStore((state) => state.queue)
  const queueIndex = usePlayerStore((state) => state.queueIndex)
  const currentMood = usePlayerStore((state) => state.currentMood)
  const isOnline = usePlayerStore((state) => state.isOnline)
  const isNowPlayingPanelOpen = usePlayerStore((state) => state.isNowPlayingPanelOpen)
  const toggleNowPlayingPanel = usePlayerStore((state) => state.toggleNowPlayingPanel)

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null)
  const [isLoadingArtist, setIsLoadingArtist] = useState(false)

  const moodToken = moodTheme[currentMood]

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

  const openExpandedPlayer = () => {
    navigate('/now-playing', {
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    })
  }

  return (
    <aside className="hidden min-w-0 lg:flex lg:justify-end">
      <div className="sticky top-[7.2rem] w-full">
        <div
          className={cn(
            'editorial-panel mood-glow overflow-hidden rounded-[2rem] border-white/8 transition-[width,padding] duration-300',
            isNowPlayingPanelOpen ? 'w-full p-4 xl:p-5' : 'w-[4.8rem] p-3',
          )}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mood-accent),transparent)]" />

          <div className={cn('flex items-center', isNowPlayingPanelOpen ? 'justify-between' : 'justify-center')}>
            {isNowPlayingPanelOpen ? (
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">Now playing</p>
                <p className="mt-1 text-sm text-text-secondary">Desktop listening panel</p>
              </div>
            ) : null}

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="border border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
              onClick={toggleNowPlayingPanel}
              aria-label={isNowPlayingPanelOpen ? 'Hide now playing panel' : 'Show now playing panel'}
            >
              {isNowPlayingPanelOpen ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
          </div>

          {isNowPlayingPanelOpen ? (
            <div className="mt-5 space-y-4">
              <button
                type="button"
                onClick={openExpandedPlayer}
                className="w-full text-left transition-transform duration-300 hover:translate-y-[-1px]"
              >
                <div className="rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--mood-accent)_22%,transparent),transparent_58%)] p-3">
                  <img
                    src={currentTrack.imageUrl}
                    alt={`${currentTrack.name} artwork`}
                    className="aspect-square w-full rounded-[1.4rem] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                  />
                </div>
              </button>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border-transparent"
                    style={{
                      background: `color-mix(in srgb, ${moodToken.background} 72%, rgba(0,0,0,0.45))`,
                      color: moodToken.text,
                    }}
                  >
                    {moodToken.label}
                  </Badge>
                  <Badge>{queue?.source ?? 'discover'}</Badge>
                </div>

                <div>
                  <h3 className="line-clamp-2 font-heading text-2xl leading-tight text-text-primary">
                    {currentTrack.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {currentTrack.artistName}
                    {currentTrack.genre ? ` / ${currentTrack.genre}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                  <span>
                    Track {queueIndex + 1}
                    {queue ? ` / ${queue.tracks.length}` : ''}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="border border-white/18 bg-white/8 text-text-primary hover:bg-white/14 hover:text-white"
                    onClick={openExpandedPlayer}
                  >
                    <ExternalLink className="size-4" />
                    Open
                  </Button>
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
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={toggleNowPlayingPanel}
                className="rounded-[1.1rem] border border-white/8 bg-black/20 p-1 transition-transform hover:scale-[1.02]"
                aria-label="Show now playing panel"
              >
                <img
                  src={currentTrack.imageUrl}
                  alt={`${currentTrack.name} artwork`}
                  className="size-10 rounded-[0.9rem] object-cover"
                />
              </button>

              <button
                type="button"
                onClick={openExpandedPlayer}
                className="rotate-180 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-text-primary/88 transition-colors hover:text-white [writing-mode:vertical-rl]"
                aria-label="Open expanded player"
              >
                now playing
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
