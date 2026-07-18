import type { Track, UserPlaylist, UserPlaylistTrack } from '@/entities/track/model/types'
import { tonalizDb } from '@/lib/db/app-db'

export interface CreatePlaylistInput {
  title: string
  description?: string | null
}

export interface UpdatePlaylistInput {
  title?: string
  description?: string | null
}

export type AddTrackToPlaylistResult =
  | { status: 'added'; playlistTrack: UserPlaylistTrack }
  | { status: 'already-added'; playlistTrack: UserPlaylistTrack }

export interface AddTracksToPlaylistSummary {
  addedCount: number
  alreadyAddedCount: number
  playlistTracks: UserPlaylistTrack[]
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function now() {
  return new Date().toISOString()
}

export async function createUserPlaylist(input: CreatePlaylistInput): Promise<UserPlaylist> {
  const title = input.title.trim()

  if (!title) {
    throw new Error('Playlist title is required.')
  }

  const timestamp = now()
  const playlist: UserPlaylist = {
    id: createId('playlist'),
    title,
    description: input.description?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await tonalizDb.playlists.add(playlist)

  return playlist
}

export async function getUserPlaylists(): Promise<UserPlaylist[]> {
  const playlists = await tonalizDb.playlists.orderBy('updatedAt').reverse().toArray()
  return playlists
}

export async function getUserPlaylistById(playlistId: string): Promise<UserPlaylist | undefined> {
  return tonalizDb.playlists.get(playlistId)
}

export async function updateUserPlaylist(playlistId: string, input: UpdatePlaylistInput): Promise<UserPlaylist | null> {
  const playlist = await tonalizDb.playlists.get(playlistId)

  if (!playlist) {
    return null
  }

  const nextPlaylist: UserPlaylist = {
    ...playlist,
    title: input.title?.trim() || playlist.title,
    description: input.description === undefined ? playlist.description : input.description?.trim() || null,
    updatedAt: now(),
  }

  await tonalizDb.playlists.put(nextPlaylist)

  return nextPlaylist
}

export async function deleteUserPlaylist(playlistId: string): Promise<void> {
  await tonalizDb.transaction('rw', tonalizDb.playlists, tonalizDb.playlistTracks, async () => {
    await tonalizDb.playlistTracks.where('playlistId').equals(playlistId).delete()
    await tonalizDb.playlists.delete(playlistId)
  })
}

export async function getUserPlaylistTracks(playlistId: string): Promise<UserPlaylistTrack[]> {
  const tracks = await tonalizDb.playlistTracks.where('playlistId').equals(playlistId).sortBy('position')
  return tracks
}

export async function getAllUserPlaylistTracks(): Promise<UserPlaylistTrack[]> {
  const tracks = await tonalizDb.playlistTracks.toArray()
  return tracks.sort((left, right) => left.position - right.position)
}

export async function addTrackToUserPlaylist(playlistId: string, track: Track): Promise<AddTrackToPlaylistResult> {
  const timestamp = now()

  return tonalizDb.transaction('rw', tonalizDb.playlists, tonalizDb.playlistTracks, async () => {
    const existingTrack = await tonalizDb.playlistTracks.where('[playlistId+trackId]').equals([playlistId, track.id]).first()

    if (existingTrack) {
      return { status: 'already-added', playlistTrack: existingTrack }
    }

    const position = await tonalizDb.playlistTracks.where('playlistId').equals(playlistId).count()
    const playlistTrack: UserPlaylistTrack = {
      id: createId('playlist-track'),
      playlistId,
      trackId: track.id,
      track,
      addedAt: timestamp,
      position,
    }

    await tonalizDb.playlistTracks.add(playlistTrack)
    await tonalizDb.playlists.update(playlistId, { updatedAt: timestamp })

    return { status: 'added', playlistTrack }
  })
}

export async function addTracksToUserPlaylist(playlistId: string, tracks: Track[]): Promise<AddTracksToPlaylistSummary> {
  const uniqueTracks = Array.from(new Map(tracks.map((track) => [track.id, track])).values())
  const timestamp = now()

  return tonalizDb.transaction('rw', tonalizDb.playlists, tonalizDb.playlistTracks, async () => {
    const existingTracks = await tonalizDb.playlistTracks.where('playlistId').equals(playlistId).sortBy('position')
    const existingTrackIds = new Set(existingTracks.map((playlistTrack) => playlistTrack.trackId))
    let nextPosition = existingTracks.length
    let addedCount = 0
    let alreadyAddedCount = 0
    const playlistTracks: UserPlaylistTrack[] = []

    for (const track of uniqueTracks) {
      if (existingTrackIds.has(track.id)) {
        alreadyAddedCount += 1
        continue
      }

      const playlistTrack: UserPlaylistTrack = {
        id: createId('playlist-track'),
        playlistId,
        trackId: track.id,
        track,
        addedAt: timestamp,
        position: nextPosition,
      }

      nextPosition += 1
      addedCount += 1
      playlistTracks.push(playlistTrack)
    }

    if (playlistTracks.length > 0) {
      await tonalizDb.playlistTracks.bulkAdd(playlistTracks)
      await tonalizDb.playlists.update(playlistId, { updatedAt: timestamp })
    }

    return { addedCount, alreadyAddedCount, playlistTracks }
  })
}

export async function removeTrackFromUserPlaylist(playlistId: string, trackId: string): Promise<void> {
  await tonalizDb.transaction('rw', tonalizDb.playlists, tonalizDb.playlistTracks, async () => {
    const existingTrack = await tonalizDb.playlistTracks.where('[playlistId+trackId]').equals([playlistId, trackId]).first()

    if (!existingTrack) {
      return
    }

    await tonalizDb.playlistTracks.delete(existingTrack.id)

    const remainingTracks = await getUserPlaylistTracks(playlistId)
    await Promise.all(
      remainingTracks.map((playlistTrack, position) =>
        tonalizDb.playlistTracks.update(playlistTrack.id, { position }),
      ),
    )
    await tonalizDb.playlists.update(playlistId, { updatedAt: now() })
  })
}
