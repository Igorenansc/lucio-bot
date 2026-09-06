import { Innertube } from 'youtubei.js'

import { SearchType } from './SearchType.js'

export default class YouTubeSearchProvider {
  constructor (youtube) {
    this.youtube = youtube
  }

  static async create () {
    const youtube = await Innertube.create()

    return new YouTubeSearchProvider(youtube)
  }

  async search (query, type = SearchType.VIDEO, limit = 10) {
    if (!query?.trim()) return []

    if (type === SearchType.PLAYLIST) {
      return this.#searchPlaylists(query, limit)
    }

    return this.#searchVideos(query, limit)
  }

  async #searchVideos (query, limit) {
    const result = await this.youtube.search(query)

    return result.videos.slice(0, limit).map(video => ({
      videoId: video.id,
      title: video.title?.text ?? video.title ?? 'Sem título',
      author: video.author?.name ?? video.author?.text ?? 'Desconhecido',
      duration: video.duration?.text ?? null,
      durationSeconds: video.duration?.seconds ?? null
    }))
  }

  async #searchPlaylists (query, limit) {
    const result = await this.youtube.search(query)

    return (result.playlists ?? [])
      .slice(0, limit)
      .map(playlist => ({
        playlistId: playlist.content_id ?? playlist.id ?? null,

        title:
          playlist.metadata?.title?.text ??
          playlist.title?.text ??
          playlist.title ??
          'Sem título',

        author: this.#extractPlaylistAuthor(playlist)
      }))
      .filter(playlist => playlist.playlistId)
  }

  #extractPlaylistAuthor (playlist) {
    return (
      playlist.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text
        ?.text ??
      playlist.author?.name ??
      playlist.author?.text ??
      null
    )
  }
}
