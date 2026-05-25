import type { ArtistProfile } from '@/entities/track/model/types'
import { ArtistMediaBlock } from '@/features/player/components/artist-media-block'

interface ArtistProfileCardProps {
  artistName: string
  artistProfile: ArtistProfile | null
  isLoading: boolean
  isOnline: boolean
}

export function ArtistProfileCard({
  artistName,
  artistProfile,
  isLoading,
  isOnline,
}: ArtistProfileCardProps) {
  return (
    <section className="editorial-panel rounded-[1.8rem] px-5 py-5 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.26em] text-text-muted">Artist context</p>
      <ArtistMediaBlock
        artistName={artistName}
        artistProfile={artistProfile}
        isLoading={isLoading}
        isOnline={isOnline}
        className="mt-4"
      />
    </section>
  )
}
