import type { Mood, Track } from '@/entities/track/model/types'

const moodMatchers: Array<{ mood: Mood; tokens: string[] }> = [
  { mood: 'calm', tokens: ['ambient', 'acoustic', 'chill', 'meditation', 'instrumental'] },
  { mood: 'energetic', tokens: ['rock', 'electronic', 'metal', 'punk', 'techno'] },
  { mood: 'upbeat', tokens: ['pop', 'dance', 'funk', 'party', 'house'] },
  { mood: 'melancholic', tokens: ['sad', 'lonely', 'dark', 'melancholic', 'ballad'] },
]

export function detectMood(track: Track): Mood {
  const searchableTokens = [
    track.genre ?? '',
    track.moodSource ?? '',
    ...track.tags,
  ]
    .join(' ')
    .toLowerCase()

  for (const matcher of moodMatchers) {
    if (matcher.tokens.some((token) => searchableTokens.includes(token))) {
      return matcher.mood
    }
  }

  return 'neutral'
}
