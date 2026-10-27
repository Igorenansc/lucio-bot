import { getYouTubeClient } from './YouTubeClient.js'

export default class YouTubePlaylistProvider {
  constructor (youtube) {
    this.youtube = youtube
  }

  static async create () {
    const youtube = await getYouTubeClient()

    return new YouTubePlaylistProvider(youtube)
  }

  async getPlaylist (playlistId) {
    if (!playlistId) {
      return null
    }

    const playlist = await this.youtube.getPlaylist(playlistId)

    const tracks = playlist.items
      .map(item => this.#mapItem(item))
      .filter(Boolean)

    return {
      type: 'playlist',

      playlist: {
        name: this.#extractTitle(playlist)
      },

      tracks
    }
  }

  #mapItem (item) {
    const videoId = item.id ?? item.video_id ?? item.content_id ?? null

    if (!videoId) {
      return null
    }

    /*
     * youtubei.js 17.2+ passou a retornar itens de playlist como LockupView.
     *
     * Formato atual:
     * item.content_id
     * item.metadata.title
     * item.metadata.metadata
     * item.content_image.overlays
     *
     * A duração dos LockupView fica nos badges da thumbnail.
     */
    const metadataTexts = this.#extractMetadataTexts(item)

    const title =
      this.#text(item.metadata?.title) ?? this.#text(item.title) ?? 'Sem título'

    const author =
      this.#text(item.author?.name) ??
      this.#text(item.author) ??
      metadataTexts.find(value => !this.#isDuration(value)) ??
      'Desconhecido'

    return {
      encoded: null,

      info: {
        identifier: videoId,
        title,
        author,
        length: this.#extractDurationMs(item),
        isStream: false,
        uri: `https://www.youtube.com/watch?v=${videoId}`,
        sourceName: 'youtube'
      },

      userData: {
        unresolved: true
      }
    }
  }

  #extractDurationMs (item) {
    /*
     * Renderer antigo do youtubei.js.
     */
    if (
      typeof item.duration?.seconds === 'number' &&
      Number.isFinite(item.duration.seconds)
    ) {
      return item.duration.seconds * 1000
    }

    /*
     * LockupView atual.
     *
     * A duração vem em:
     *
     * content_image
     *   -> overlays[]
     *     -> badges[]
     *       -> text
     *
     * Exemplo: "2:48"
     */
    const overlayDuration = this.#extractDurationFromOverlays(item)

    if (overlayDuration) {
      return this.#durationToMs(overlayDuration)
    }

    /*
     * Fallbacks para outros formatos que o youtubei.js possa retornar.
     */
    const durationText =
      this.#text(item.duration?.text) ??
      this.#text(item.duration) ??
      this.#text(item.duration_text) ??
      this.#extractMetadataTexts(item).find(value => this.#isDuration(value)) ??
      null

    return this.#durationToMs(durationText)
  }

  #extractDurationFromOverlays (item) {
    /*
     * Normalmente content_image é ThumbnailView.
     *
     * Mantemos primary_thumbnail como fallback caso algum renderer
     * encapsule a thumbnail em CollectionThumbnailView.
     */
    const thumbnail =
      item.content_image?.primary_thumbnail ?? item.content_image ?? null

    const overlays = thumbnail?.overlays ?? []

    for (const overlay of overlays) {
      const badges = overlay.badges ?? []

      for (const badge of badges) {
        const text = this.#text(badge.text)

        if (text && this.#isDuration(text)) {
          return text
        }
      }
    }

    return null
  }

  #extractMetadataTexts (item) {
    const rows = item.metadata?.metadata?.metadata_rows ?? []

    return rows.flatMap(row =>
      (row.metadata_parts ?? [])
        .map(part => this.#text(part.text))
        .filter(Boolean)
    )
  }

  #extractTitle (playlist) {
    return (
      this.#text(playlist.info?.title) ??
      this.#text(playlist.metadata?.title) ??
      this.#text(playlist.title) ??
      'Playlist'
    )
  }

  #text (value) {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'string') {
      const normalized = value.trim()

      return normalized || null
    }

    if (typeof value.text === 'string') {
      const normalized = value.text.trim()

      return normalized || null
    }

    /*
     * youtubei.js usa objetos Text em vários pontos.
     */
    if (typeof value.toString === 'function') {
      const normalized = value.toString().trim()

      if (normalized && normalized !== '[object Object]') {
        return normalized
      }
    }

    return null
  }

  #isDuration (value) {
    return /^\d{1,3}:\d{2}(?::\d{2})?$/.test(value)
  }

  #durationToMs (value) {
    if (!value) {
      return 0
    }

    const parts = value.split(':').map(Number)

    if (parts.some(Number.isNaN)) {
      return 0
    }

    let seconds = 0

    for (const part of parts) {
      seconds = seconds * 60 + part
    }

    return seconds * 1000
  }
}
