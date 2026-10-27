import { logger } from '../../../app/config/logger.js'

const messageLogger = logger.child({
  component: 'PlayerMessageController'
})

export default class PlayerMessageController {
  constructor (playerMessageService) {
    this.playerMessageService = playerMessageService

    this.bindings = new Map()
  }

  bind ({ guildId, channel, player }) {
    this.unbind(guildId)

    const update = async () => {
      try {
        await this.playerMessageService.createOrUpdate(guildId, channel, player)
      } catch (error) {
        messageLogger.error(
          {
            err: error,
            guildId
          },
          'Falha ao atualizar PlayerMessage'
        )
      }
    }

    const remove = async () => {
      try {
        await this.playerMessageService.delete(guildId)
      } catch (error) {
        messageLogger.error(
          {
            err: error,
            guildId
          },
          'Falha ao remover PlayerMessage'
        )
      }
    }

    player.on('trackLoading', update)

    player.on('trackStart', update)

    player.on('stateChange', update)

    player.on('playerIdle', remove)

    player.on('playerDestroy', remove)

    this.bindings.set(guildId, {
      player,
      channel,
      update,
      remove
    })
  }

  unbind (guildId) {
    const binding = this.bindings.get(guildId)

    if (!binding) return

    binding.player.off('trackLoading', binding.update)

    binding.player.off('trackStart', binding.update)

    binding.player.off('stateChange', binding.update)

    binding.player.off('playerIdle', binding.remove)

    binding.player.off('playerDestroy', binding.remove)

    this.bindings.delete(guildId)
  }

  async recreate (guildId) {
    const binding = this.bindings.get(guildId)

    if (!binding) return false

    await this.playerMessageService.recreate(
      guildId,
      binding.channel,
      binding.player
    )

    return true
  }
}
