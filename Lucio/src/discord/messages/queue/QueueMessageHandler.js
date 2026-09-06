import { MessageFlags } from 'discord.js'

import TextPermissionValidator from '../../permissions/TextPermissionValidator.js'

export default class QueueMessageHandler {
  constructor ({ playerManager, queueMessageService }) {
    this.playerManager = playerManager

    this.queueMessageService = queueMessageService
  }

  async execute (interaction) {
    const player = this.playerManager.get(interaction.guildId)

    if (!player) {
      try {
        await interaction.message.delete()
      } catch {
        await interaction.reply({
          content: 'Não existe uma fila.',
          flags: MessageFlags.Ephemeral
        })
      }

      return
    }

    if (
      interaction.customId !== 'queue_message_remove' &&
      !(await this.#validateText(interaction))
    ) {
      return
    }

    if (interaction.isStringSelectMenu()) {
      await this.#handleSelect(interaction, player)

      return
    }

    if (!interaction.isButton()) return

    const [action, rawIndex] = interaction.customId.split(':')

    const currentIndex = Number(rawIndex ?? 0)

    switch (action) {
      case 'queue_message_previous':
        await this.#previous(interaction, player, currentIndex)
        break

      case 'queue_message_next':
        await this.#next(interaction, player, currentIndex)
        break

      case 'queue_message_refresh':
        await this.#refresh(interaction, player, currentIndex)
        break

      case 'queue_message_page_display':
        await this.#update(interaction, player, currentIndex)
        break

      case 'queue_message_remove':
        await this.#remove(interaction)
        break
    }
  }

  async #validateText (interaction) {
    const validation = TextPermissionValidator.validate(
      interaction.guild.members.me,
      interaction.channel
    )

    if (validation.valid) {
      return true
    }

    await interaction.reply({
      content: validation.message,
      flags: MessageFlags.Ephemeral
    })

    return false
  }

  async #previous (interaction, player, currentIndex) {
    const newIndex = Math.max(0, currentIndex - 10)

    await interaction.update(this.queueMessageService.build(player, newIndex))
  }

  async #next (interaction, player, currentIndex) {
    const newIndex = currentIndex + 10

    await interaction.update(this.queueMessageService.build(player, newIndex))
  }

  async #refresh (interaction, player, currentIndex) {
    await interaction.deferUpdate()

    const channel = interaction.channel

    const payload = this.queueMessageService.build(player, currentIndex)

    await interaction.message.delete()

    await channel.send(payload)
  }

  async #update (interaction, player, currentIndex) {
    await interaction.update(
      this.queueMessageService.build(player, currentIndex)
    )
  }

  async #remove (interaction) {
    await interaction.deferUpdate()

    await interaction.message.delete()
  }

  async #handleSelect (interaction, player) {
    if (interaction.customId !== 'queue_message_page') {
      return
    }

    const selectedIndex = Number(interaction.values[0])

    await interaction.update(
      this.queueMessageService.build(player, selectedIndex)
    )
  }
}
