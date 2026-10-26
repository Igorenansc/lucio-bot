import { logger } from '../app/config/logger.js'

const voiceLogger = logger.child({
  component: 'VoiceStateService'
})

export default class VoiceStateService {
  constructor ({ client, playerManager, voiceIdleService }) {
    this.client = client

    this.playerManager = playerManager

    this.voiceIdleService = voiceIdleService
  }

  async handle (oldState, newState) {
    const guild = newState.guild ?? oldState.guild

    if (!guild) return

    const isBot = newState.id === this.client.user?.id

    /*
     * Eventos de outros membros continuam sendo
     * responsabilidade do VoiceIdleService.
     */
    if (!isBot) {
      this.voiceIdleService.handle(oldState, newState)

      return
    }

    const oldChannelId = oldState.channelId

    const newChannelId = newState.channelId

    /*
     * Bot saiu do canal: kick, canal apagado, desconexão manual
     * ou perda da conexão. Aqui o player precisa morrer.
     */
    if (oldChannelId && !newChannelId) {
      voiceLogger.info(
        {
          guildId: guild.id,
          channelId: oldChannelId
        },
        'Bot desconectado do canal de voz'
      )

      this.voiceIdleService.cancel(guild.id)

      await this.playerManager.destroy(guild.id, 'voice-disconnected')

      return
    }

    /*
     * Bot entrou ou foi movido. Atualiza a posição sem tocar
     * em fila, faixa atual ou painel.
     */
    if (newChannelId && oldChannelId !== newChannelId) {
      const moved = this.playerManager.handleVoiceMove(
        guild.id,
        newChannelId
      )

      voiceLogger.info(
        {
          guildId: guild.id,
          from: oldChannelId,
          to: newChannelId,
          moved
        },
        'Bot movido de canal de voz'
      )

      this.voiceIdleService.handle(oldState, newState)

      return
    }

    /*
     * Mute/deafen ou atualização no mesmo canal. Não mexe no
     * player; só deixa o idle recalcular quem está no canal.
     */
    if (newChannelId) {
      this.playerManager.handleVoiceMove(guild.id, newChannelId)

      this.voiceIdleService.handle(oldState, newState)
    }
  }
}
