import LucioPlayer from './LucioPlayer.js'
import RecommendationService from '../recommendation/RecommendationService.js'

import { logger } from '../../app/config/logger.js'

export default class PlayerManager {
  constructor (
    shoukaku,
    youtubeProvider,
    playerMessageController,
    trackResolver
  ) {
    this.shoukaku = shoukaku

    this.youtubeProvider = youtubeProvider

    this.playerMessageController = playerMessageController

    this.trackResolver = trackResolver

    this.logger = logger.child({
      component: 'PlayerManager'
    })

    this.players = new Map()
  }

  get (guildId) {
    return this.players.get(guildId) ?? null
  }

  async create ({ guildId, channelId, textChannel, shardId }) {
    const existing = this.players.get(guildId)

    if (existing) {
      return existing
    }

    const engine = await this.shoukaku.joinVoiceChannel({
      guildId,
      channelId,
      shardId,
      deaf: true
    })

    const recommendationService = new RecommendationService(
      engine.node,
      this.youtubeProvider
    )

    const player = new LucioPlayer(
      engine,
      recommendationService,
      this.trackResolver
    )

    player.voiceChannelId = channelId

    this.players.set(guildId, player)

    this.playerMessageController.bind({
      guildId,
      channel: textChannel,
      player
    })

    this.logger.info(
      {
        guildId,
        channelId
      },
      'Player criado'
    )

    return player
  }

  async destroy (guildId) {
    const player = this.players.get(guildId)

    if (!player) {
      return false
    }

    /*
     * Primeiro avisamos a UI.
     */
    player.emit('playerDestroy')

    this.logger.info(
      {
        guildId
      },
      'Player destruído'
    )

    this.playerMessageController.unbind(guildId)

    await player.stop()

    await this.shoukaku.leaveVoiceChannel(guildId)

    this.players.delete(guildId)

    return true
  }
}
