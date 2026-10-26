import { logger } from '../app/config/logger.js'

export default class VoiceIdleService {
  constructor ({ playerManager, timeout = 60_000 }) {
    this.playerManager = playerManager

    this.timeout = timeout

    this.timers = new Map()

    this.logger = logger.child({
      component: 'VoiceIdleService'
    })
  }

  handle (oldState, newState) {
    const guild = oldState.guild ?? newState.guild

    const player = this.playerManager.get(guild.id)

    if (!player) return

    const botChannel = guild.members.me?.voice.channel

    if (!botChannel) {
      this.cancel(guild.id)

      return
    }

    const relevant =
      oldState.channelId === botChannel.id ||
      newState.channelId === botChannel.id

    if (!relevant) return

    if (this.#hasListeners(botChannel)) {
      this.cancel(guild.id)

      return
    }

    this.schedule(guild)
  }

  schedule (guild) {
    const guildId = guild.id

    if (this.timers.has(guildId)) return

    this.logger.debug({ guildId }, 'Player ficou sozinho; timer iniciado')

    const timer = setTimeout(async () => {
      this.timers.delete(guildId)

      try {
        await this.#disconnectIfStillAlone(guild)
      } catch (error) {
        this.logger.error(
          {
            err: error,
            guildId
          },
          'Erro durante desconexão por inatividade'
        )
      }
    }, this.timeout)

    this.timers.set(guildId, timer)
  }

  cancel (guildId) {
    const timer = this.timers.get(guildId)

    if (!timer) return

    clearTimeout(timer)

    this.timers.delete(guildId)

    this.logger.debug({ guildId }, 'Timer de desconexão cancelado')
  }

  async #disconnectIfStillAlone (guild) {
    const guildId = guild.id

    const player = this.playerManager.get(guildId)

    if (!player) return

    /*
     * Consultamos novamente o canal atual
     * do bot. Ele pode ter sido movido
     * enquanto o timer estava correndo.
     */
    const botChannel = guild.members.me?.voice.channel

    if (!botChannel) return

    /*
     * Alguém pode ter voltado justamente
     * antes do timer terminar.
     */
    if (this.#hasListeners(botChannel)) {
      this.logger.debug({ guildId }, 'Usuário retornou ao canal')

      return
    }

    this.logger.info({ guildId }, 'Desconectando player por inatividade')

    await this.playerManager.destroy(guildId, 'voice-idle')
  }

  #hasListeners (channel) {
    return channel.members.some(member => !member.user.bot)
  }

  destroy () {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }

    this.timers.clear()
  }
}
