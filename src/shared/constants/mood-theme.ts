import type { Mood } from '@/entities/track/model/types'

export const moodTheme = {
  calm: {
    accent: '#38BDF8',
    text: '#BAE6FD',
    background: '#082F49',
    label: 'Calm',
  },
  energetic: {
    accent: '#FB923C',
    text: '#FED7AA',
    background: '#431407',
    label: 'Energetic',
  },
  upbeat: {
    accent: '#FACC15',
    text: '#FEF3C7',
    background: '#422006',
    label: 'Upbeat',
  },
  melancholic: {
    accent: '#A78BFA',
    text: '#DDD6FE',
    background: '#2E1065',
    label: 'Melancholic',
  },
  neutral: {
    accent: '#9B5CFF',
    text: '#E9D5FF',
    background: '#1E1B2E',
    label: 'Neutral',
  },
} satisfies Record<Mood, { accent: string; text: string; background: string; label: string }>
