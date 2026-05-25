import { useEffect, useEffectEvent } from 'react'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { getAudioElement, loadAudioSource, pauseAudio, playAudio, setAudioVolume } from '@/lib/audio/audio-controller'

export function AudioSyncBridge() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const volume = usePlayerStore((state) => state.volume)
  const syncProgress = usePlayerStore((state) => state.syncProgress)
  const handlePlaybackCompletion = usePlayerStore((state) => state.handlePlaybackCompletion)
  const pause = usePlayerStore((state) => state.pause)

  const handleTimeUpdate = useEffectEvent(() => {
    const audio = getAudioElement()
    if (!audio) {
      return
    }

    syncProgress(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : currentTrack?.duration ?? 0)
  })

  const handleEnded = useEffectEvent(() => {
    handlePlaybackCompletion()
  })

  const handleMetadata = useEffectEvent(() => {
    const audio = getAudioElement()
    if (!audio) {
      return
    }

    syncProgress(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : currentTrack?.duration ?? 0)
  })

  useEffect(() => {
    const audio = getAudioElement()
    if (!audio) {
      return
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', pause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', pause)
    }
  }, [pause])

  useEffect(() => {
    if (!currentTrack) {
      pauseAudio()
      return
    }

    loadAudioSource(currentTrack.audioUrl)
    syncProgress(0, currentTrack.duration)
  }, [currentTrack, syncProgress])

  useEffect(() => {
    if (!currentTrack) {
      return
    }

    if (isPlaying) {
      void playAudio().catch(() => {
        pause()
      })
      return
    }

    pauseAudio()
  }, [currentTrack, isPlaying, pause])

  useEffect(() => {
    setAudioVolume(volume)
  }, [volume])

  return null
}
