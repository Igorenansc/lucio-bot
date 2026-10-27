import { logger } from '../../app/config/logger.js'

export default class RecommendationService {
  constructor (node, youtubeProvider) {
    this.node = node
    this.youtubeProvider = youtubeProvider

    this.logger = logger.child({
      component: 'RecommendationService'
    })
  }

  async getNext (track, recentTracks = []) {
    if (!this.youtubeProvider) return null

    if (track.info.sourceName !== 'youtube' || !track.info.identifier) {
      return null
    }

    const excludedIds = new Set([
      track.info.identifier,
      ...recentTracks.map(item => item.info.identifier).filter(Boolean)
    ])

    const candidates = await this.youtubeProvider.getRelated(
      track.info.identifier
    )

    for (const candidate of candidates) {
      if (excludedIds.has(candidate.videoId)) {
        continue
      }

      const equivalent = recentTracks.some(recent =>
        this.#sameTrack(candidate, {
          title: recent.info.title
        })
      )

      if (equivalent) {
        continue
      }

      const url = `https://www.youtube.com/watch?v=${candidate.videoId}`

      try {
        const result = await this.node.rest.resolve(url)

        if (result.loadType === 'track') {
          this.logger.debug(
            {
              videoId: candidate.videoId,
              title: candidate.title
            },
            'Candidato de autoplay selecionado'
          )

          return result.data
        }
      } catch (error) {
        this.logger.debug(
          {
            err: error,
            videoId: candidate.videoId
          },
          'Falha ao resolver candidato'
        )
      }
    }

    return this.#getFallback(track, excludedIds)
  }

  async #getFallback (track, excluded) {
    const videoId = await this.youtubeProvider.getAutoplayVideoId(
      track.info.identifier
    )

    if (!videoId || excluded.has(videoId)) {
      return null
    }

    try {
      const result = await this.node.rest.resolve(
        `https://www.youtube.com/watch?v=${videoId}`
      )

      if (result.loadType === 'track') {
        this.logger.debug({ videoId }, 'Usando fallback de autoplay')

        return result.data
      }
    } catch (error) {
      this.logger.warn(
        { trackId: track.info.identifier },
        'Nenhuma recomendação reproduzível encontrada'
      )
    }

    return null
  }

  #normalize (text = '') {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(
        /\b(remaster(ed)?|radio edit|official audio|official video|lyrics?)\b/g,
        ''
      )
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  #sameTrack (a, b) {
    const titleA = this.#normalize(a.title)
    const titleB = this.#normalize(b.title)

    if (!titleA || !titleB) return false

    return titleA === titleB
  }
}
