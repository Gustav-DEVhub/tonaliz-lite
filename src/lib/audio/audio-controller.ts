let audioElement: HTMLAudioElement | null = null

export function getAudioElement() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!audioElement) {
    audioElement = new Audio()
    audioElement.preload = 'metadata'
  }

  return audioElement
}

export function loadAudioSource(source: string) {
  const audio = getAudioElement()
  if (!audio) {
    return
  }

  if (audio.src !== source) {
    audio.src = source
    audio.load()
  }
}

export async function playAudio() {
  const audio = getAudioElement()
  if (!audio) {
    return
  }

  await audio.play()
}

export function pauseAudio() {
  getAudioElement()?.pause()
}

export function seekAudio(time: number) {
  const audio = getAudioElement()
  if (!audio) {
    return
  }

  audio.currentTime = time
}

export function setAudioVolume(volume: number) {
  const audio = getAudioElement()
  if (!audio) {
    return
  }

  audio.volume = Math.min(Math.max(volume, 0), 1)
}
