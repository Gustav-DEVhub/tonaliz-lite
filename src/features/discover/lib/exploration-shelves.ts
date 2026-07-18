export interface TrackShelfConfig {
  id: string
  title: string
  description: string
  query: string
}

const curatedShelfCatalog: TrackShelfConfig[] = [
  {
    id: 'dream-pop',
    title: 'Dream pop bloom',
    description: 'Soft-focus vocals, cinematic haze, and melodic lift.',
    query: 'dream pop',
  },
  {
    id: 'ambient',
    title: 'Ambient drift',
    description: 'Slow-moving textures for calm focus and late-night listening.',
    query: 'ambient',
  },
  {
    id: 'lofi',
    title: 'Lo-fi corners',
    description: 'Beat-led sketches, dusty loops, and low-pressure grooves.',
    query: 'lofi',
  },
  {
    id: 'indie-rock',
    title: 'Indie rock pulse',
    description: 'Guitar energy, direct hooks, and independent edge.',
    query: 'indie rock',
  },
  {
    id: 'chillhop',
    title: 'Chillhop threads',
    description: 'Head-nod rhythm with a lighter, beat-forward mood.',
    query: 'chillhop',
  },
  {
    id: 'electronic',
    title: 'Electronic glow',
    description: 'Modern synth movement with brighter melodic contours.',
    query: 'electronic',
  },
]

const homeMoodShelfCatalog: Record<string, TrackShelfConfig[]> = {
  'dream pop': [
    {
      id: 'home-mood-dream-pop-haze',
      title: 'Dream pop haze',
      description: 'Soft vocals, blurred guitars, and floating melodic color.',
      query: 'dream pop',
    },
    {
      id: 'home-mood-dream-pop-indie',
      title: 'Indie pop glow',
      description: 'Bright hooks and low-pressure independent pop textures.',
      query: 'indie pop',
    },
    {
      id: 'home-mood-dream-pop-synth',
      title: 'Synthpop afterlight',
      description: 'Polished synth lines with a gentle late-night pulse.',
      query: 'synthpop',
    },
  ],
  ambient: [
    {
      id: 'home-mood-ambient-drift',
      title: 'Ambient drift',
      description: 'Slow-moving textures for calm focus and late-night listening.',
      query: 'ambient',
    },
    {
      id: 'home-mood-ambient-calm',
      title: 'Calm signal',
      description: 'Quiet pieces with space, patience, and minimal pressure.',
      query: 'calm',
    },
    {
      id: 'home-mood-ambient-soundscape',
      title: 'Soundscape room',
      description: 'Open atmospheres and immersive instrumental space.',
      query: 'soundscape',
    },
  ],
  lofi: [
    {
      id: 'home-mood-lofi-corners',
      title: 'Lo-fi corners',
      description: 'Beat-led sketches, dusty loops, and low-pressure grooves.',
      query: 'lofi',
    },
    {
      id: 'home-mood-lofi-chillhop',
      title: 'Chillhop pocket',
      description: 'Soft drums and jazzy movement for easy listening.',
      query: 'chillhop',
    },
    {
      id: 'home-mood-lofi-instrumental',
      title: 'Instrumental hip hop',
      description: 'Rhythm-forward instrumentals with steady head-nod pacing.',
      query: 'instrumental hip hop',
    },
  ],
  'indie rock': [
    {
      id: 'home-mood-indie-rock-pulse',
      title: 'Indie rock pulse',
      description: 'Guitar energy, direct hooks, and independent edge.',
      query: 'indie rock',
    },
    {
      id: 'home-mood-indie-rock-alternative',
      title: 'Alternative lift',
      description: 'Bigger riffs, melodic friction, and left-field rock color.',
      query: 'alternative rock',
    },
    {
      id: 'home-mood-indie-rock-guitar',
      title: 'Guitar rush',
      description: 'Fast-moving guitars and compact independent rock momentum.',
      query: 'rock',
    },
  ],
  chillhop: [
    {
      id: 'home-mood-chillhop-threads',
      title: 'Chillhop threads',
      description: 'Head-nod rhythm with a lighter, beat-forward mood.',
      query: 'chillhop',
    },
    {
      id: 'home-mood-chillhop-jazzy',
      title: 'Jazzy hip hop',
      description: 'Loose keys, relaxed drums, and warm sample-like textures.',
      query: 'jazzy hip hop',
    },
    {
      id: 'home-mood-chillhop-beats',
      title: 'Lo-fi beats',
      description: 'Compact beats for a softer focus lane.',
      query: 'lo-fi beats',
    },
  ],
}

export const quickMoodSuggestions = curatedShelfCatalog.slice(0, 5).map((shelf) => shelf.query)

export function getShelfConfigByQuery(query: string): TrackShelfConfig | null {
  const moodConfigs = Object.values(homeMoodShelfCatalog).flat()
  return curatedShelfCatalog.find((shelf) => shelf.query === query) ?? moodConfigs.find((shelf) => shelf.query === query) ?? null
}

export function getShelfConfigById(id: string): TrackShelfConfig | null {
  const moodConfigs = Object.values(homeMoodShelfCatalog).flat()
  return curatedShelfCatalog.find((shelf) => shelf.id === id) ?? moodConfigs.find((shelf) => shelf.id === id) ?? null
}

export function getShelfCollectionSourceId(source: 'home' | 'discover', shelfId: string) {
  return `${source}:${shelfId}`
}

export function parseShelfCollectionSourceId(sourceId: string): { source: 'home' | 'discover'; shelfId: string } | null {
  const [source, ...shelfIdParts] = sourceId.split(':')
  const shelfId = shelfIdParts.join(':')

  if ((source !== 'home' && source !== 'discover') || !shelfId) {
    return null
  }

  return { source, shelfId }
}

function getRotationStart(date: Date, revision = 0) {
  const anchorDay = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000)
  return (anchorDay + revision) % curatedShelfCatalog.length
}

function rotateCatalog(date: Date, revision = 0) {
  const start = getRotationStart(date, revision)
  return [...curatedShelfCatalog.slice(start), ...curatedShelfCatalog.slice(0, start)]
}

export function getDailyRecommendationConfigs(date = new Date(), revision = 0): TrackShelfConfig[] {
  return rotateCatalog(date, revision).slice(0, 3)
}

export function getHomeMoodRecommendationConfigs(mood: string, revision = 0): TrackShelfConfig[] {
  const configs = homeMoodShelfCatalog[mood] ?? []

  if (configs.length === 0) {
    const fallbackConfig = getShelfConfigByQuery(mood)
    return fallbackConfig ? [fallbackConfig] : []
  }

  const start = Math.abs(revision) % configs.length
  return [...configs.slice(start), ...configs.slice(0, start)]
}

export function getDiscoverExplorationConfigs(date = new Date(), revision = 0): TrackShelfConfig[] {
  return rotateCatalog(date, revision).slice(0, 4)
}
