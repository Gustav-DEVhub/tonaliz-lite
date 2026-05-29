import { ExternalLink, Globe2 } from 'lucide-react'
import type { ArtistProfile } from '@/entities/track/model/types'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

interface ArtistMediaBlockProps {
  artistName: string
  artistProfile: ArtistProfile | null
  isLoading: boolean
  isOnline: boolean
  compact?: boolean
  featured?: boolean
  className?: string
}

export function ArtistMediaBlock({
  artistName,
  artistProfile,
  isLoading,
  isOnline,
  compact = false,
  featured = false,
  className,
}: ArtistMediaBlockProps) {
  const resolvedName = artistProfile?.name || artistName
  const hasLinks = Boolean(artistProfile?.shareUrl || artistProfile?.website)

  return (
    <div
      className={cn(
        'rounded-[1.4rem] border border-white/8 bg-black/16',
        featured ? 'grid gap-4 px-5 py-5 md:grid-cols-[7.5rem_minmax(0,1fr)]' : 'flex items-start gap-4',
        compact ? 'px-3 py-3' : featured ? '' : 'px-4 py-4 sm:px-5',
        className,
      )}
    >
      {artistProfile?.imageUrl ? (
        <img
          src={artistProfile.imageUrl}
          alt={`${resolvedName} portrait`}
          className={cn(
            compact
              ? 'size-14 rounded-[1rem]'
              : featured
                ? 'size-[7.5rem] rounded-[1.4rem]'
                : 'size-18 rounded-[1.2rem]',
            'object-cover',
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-[1.2rem] border border-border-subtle bg-black/20 text-text-muted',
            compact
              ? 'size-14 rounded-[1rem]'
              : featured
                ? 'size-[7.5rem] rounded-[1.4rem]'
                : 'size-18',
          )}
        >
          <Globe2 className={compact ? 'size-5' : featured ? 'size-8' : 'size-6'} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">Artist</p>
        <h3 className={cn('mt-2 font-heading text-text-primary', compact ? 'text-lg' : featured ? 'text-3xl' : 'text-2xl')}>
          {resolvedName}
        </h3>
        <p
          className={cn(
            'mt-2 text-text-secondary',
            compact ? 'text-xs leading-5' : featured ? 'text-sm leading-7' : 'text-sm leading-6',
          )}
        >
          {isLoading
            ? 'Loading artist details from Jamendo.'
            : hasLinks
              ? 'Open the artist profile on Jamendo or visit their external page when available.'
              : isOnline
                ? 'Jamendo did not provide richer public artist links for this track.'
                : 'Offline mode limits live artist enrichment. Saved track metadata remains available.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {artistProfile?.shareUrl ? (
            <Button type="button" variant="secondary" size="sm" asChild>
              <a href={artistProfile.shareUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Jamendo
              </a>
            </Button>
          ) : null}

          {artistProfile?.website ? (
            <Button type="button" variant="ghost" size="sm" asChild className="border border-border-subtle">
              <a href={artistProfile.website} target="_blank" rel="noreferrer">
                <Globe2 className="size-4" />
                Website
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
