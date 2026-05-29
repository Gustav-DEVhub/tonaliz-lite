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

export const quickMoodSuggestions = curatedShelfCatalog.slice(0, 5).map((shelf) => shelf.query)

function getRotationStart(date: Date) {
  const anchorDay = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000)
  return anchorDay % curatedShelfCatalog.length
}

function rotateCatalog(date: Date) {
  const start = getRotationStart(date)
  return [...curatedShelfCatalog.slice(start), ...curatedShelfCatalog.slice(0, start)]
}

export function getDailyRecommendationConfigs(date = new Date()): TrackShelfConfig[] {
  return rotateCatalog(date).slice(0, 3)
}

export function getDiscoverExplorationConfigs(date = new Date()): TrackShelfConfig[] {
  return rotateCatalog(date).slice(0, 4)
}
