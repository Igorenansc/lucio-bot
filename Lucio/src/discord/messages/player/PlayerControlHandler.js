import { MessageFlags } from 'discord.js'

import VoiceChannelValidator from '../../../voice/VoiceChannelValidator.js'
import TextPermissionValidator from '../../permissions/TextPermissionValidator.js'

export default class PlayerControlHandler {
  constructor ({ playerManager, playerMessageController, queueMessageService }) {
    this.playerManager = playerManager

    this.playerMessageController = playerMessageController

    this.queueMessageService = queueMessageService
  }

  async execute (interaction) {
    const player = this.playerManager.get(interaction.guildId)

    if (!player) {
      try {
        await interaction.message.delete()
      } catch {
        await interaction.reply({
          content: 'Não existe um player ativo.',
          flags: MessageFlags.Ephemeral
        })
      }

      return
    }

    switch (interaction.customId) {
      case 'music_play_pause':
        if (!(await this.#validateControl(interaction))) return

        await this.#playPause(interaction, player)

        break

      case 'music_stop':
        if (!(await this.#validateControl(interaction))) return

        await this.#stop(interaction)

        break

      case 'music_skip':
        if (!(await this.#validateControl(interaction))) return

        await this.#skip(interaction, player)

        break

      case 'music_queue':
        if (!(await this.#validateText(interaction))) return
        await this.#queue(interaction, player)

        break

      case 'music_refresh':
        if (!(await this.#validateText(interaction))) return
        await this.#refresh(interaction)

        break

      case 'music_volume_up':
        if (!(await this.#validateControl(interaction))) return

        await this.#volume(interaction, player)

        break

      case 'music_volume_down':
        if (!(await this.#validateControl(interaction))) return

        await this.#volume(interaction, player, false)

        break

      default:
        return
    }
  }

  async #validateControl (interaction) {
    const validation = await VoiceChannelValidator.sameChannel(interaction)

    if (validation.valid) return true

    await interaction.reply({
      content: validation.message,
      flags: MessageFlags.Ephemeral
    })

    return false
  }

  async #validateText (interaction) {
    const validation = TextPermissionValidator.validate(
      interaction.guild.members.me,
      interaction.channel
    )

    if (validation.valid) return true

    await interaction.reply({
      content: validation.message,
      flags: MessageFlags.Ephemeral
    })

    return false
  }

  async #playPause (interaction, player) {
    await interaction.deferUpdate()

    if (player.paused) {
      await player.resume()
    } else {
      await player.pause()
    }
  }

  async #skip (interaction, player) {
    await interaction.deferUpdate()

    await player.skip()
  }

  async #stop (interaction) {
    await interaction.deferUpdate()

    await this.playerManager.destroy(interaction.guildId, 'button-stop')
  }

  async #volume (interaction, player, toIncrease = true) {
    await interaction.deferUpdate()

    const multiplier = toIncrease ? 1.25 : 0.8

    let amount = Math.round(player.volume * multiplier)
    amount = amount > 0 ? amount : 1

    await player.setVolume(amount)
  }

  async #refresh (interaction) {
    await interaction.deferUpdate()

    await this.playerMessageController.recreate(interaction.guildId)
  }

  async #queue (interaction, player) {
    await interaction.reply(this.queueMessageService.build(player))
  }
}
