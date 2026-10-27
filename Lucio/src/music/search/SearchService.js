import LavalinkNodeResolver from '../playback/LavaLinkNodeResolver.js'

import { SearchType } from './SearchType.js'

export default class SearchService {
  constructor (
    shoukaku,
    youtubePlaylistProvider,
    youtubeSearchProvider = null
  ) {
    this.shoukaku = shoukaku

    this.youtubePlaylistProvider = youtubePlaylistProvider

    this.youtubeSearchProvider = youtubeSearchProvider
  }

  async search (query, type = SearchType.VIDEO) {
    /*
     * Playlist por texto não existe no ytsearch do Lavalink.
     * Para esse caso usamos a busca de playlists do youtubei
     * e resolvemos o primeiro resultado, mantendo a semântica
     * do /yt com tipo=playlist.
     */
    if (type === SearchType.PLAYLIST && !this.#isUrl(query)) {
      return await this.#searchPlaylistByQuery(query)
    }

    const node = new LavalinkNodeResolver(this.shoukaku).getAvailableNode()

    const identifier = this.#isUrl(query) ? query : `ytsearch:${query}`

    const result = await node.rest.resolve(identifier)

    if (
      this.#isYoutubePlaylistUrl(identifier) &&
      !this.#hasPlayablePlaylist(result)
    ) {
      return await this.#resolveYoutubePlaylist(identifier)
    }

    return this.#normalizeResult(result)
  }

  async #searchPlaylistByQuery (query) {
    if (!this.youtubeSearchProvider || !this.youtubePlaylistProvider) {
      return this.#empty()
    }

    const results = await this.youtubeSearchProvider.search(
      query,
      SearchType.PLAYLIST,
      1
    )

    const playlistId = results[0]?.playlistId

    if (!playlistId) return this.#empty()

    const playlist = await this.youtubePlaylistProvider.getPlaylist(playlistId)

    if (!playlist || playlist.tracks.length === 0) {
      return this.#empty()
    }

    return playlist
  }

  #empty () {
    return {
      type: 'empty',
      tracks: [],
      playlist: null
    }
  }

  #isYoutubePlaylistUrl (value) {
    try {
      const url = new URL(value)

      const hostname = url.hostname.replace(/^www\./, '')

      return (
        (hostname === 'youtube.com' || hostname === 'music.youtube.com') &&
        url.pathname === '/playlist' &&
        Boolean(url.searchParams.get('list'))
      )
    } catch {
      return false
    }
  }

  #hasPlayablePlaylist (result) {
    return (
      result?.loadType === 'playlist' &&
      Array.isArray(result.data?.tracks) &&
      result.data.tracks.length > 0
    )
  }

  async #resolveYoutubePlaylist (url) {
    if (!this.youtubePlaylistProvider) return this.#empty()

    const playlistId = new URL(url).searchParams.get('list')

    const playlist = await this.youtubePlaylistProvider.getPlaylist(playlistId)

    if (!playlist || playlist.tracks.length === 0) {
      return this.#empty()
    }

    return playlist
  }

  #normalizeResult (result) {
    switch (result.loadType) {
      case 'track':
        return {
          type: 'track',
          tracks: [result.data],
          playlist: null
        }

      case 'search':
        return {
          type: 'search',
          tracks: result.data ?? [],
          playlist: null
        }

      case 'playlist':
        return {
          type: 'playlist',
          tracks: result.data?.tracks ?? [],
          playlist: result.data?.info ?? null
        }

      case 'empty':
        return {
          type: 'empty',
          tracks: [],
          playlist: null
        }

      case 'error':
        return {
          type: 'error',
          tracks: [],
          playlist: null,
          error: result.data
        }

      default:
        return {
          type: 'unknown',
          tracks: [],
          playlist: null
        }
    }
  }

  #isUrl (value) {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
}
