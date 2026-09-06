export default class InteractionRouter {
  constructor ({ commandManager, playerControlHandler, queueMessageHandler }) {
    this.commandManager = commandManager

    this.playerControlHandler = playerControlHandler

    this.queueMessageHandler = queueMessageHandler
  }

  async handle (interaction) {
    if (interaction.isAutocomplete()) {
      await this.commandManager.executeAutocomplete(interaction)

      return
    }

    if (interaction.isChatInputCommand()) {
      await this.commandManager.execute(interaction)

      return
    }

    if (interaction.isButton()) {
      await this.#handleButton(interaction)

      return
    }

    if (interaction.isStringSelectMenu()) {
      await this.#handleSelectMenu(interaction)
    }
  }

  async #handleButton (interaction) {
    if (interaction.customId.startsWith('music_')) {
      await this.playerControlHandler.execute(interaction)

      return
    }

    if (interaction.customId.startsWith('queue_message_')) {
      await this.queueMessageHandler.execute(interaction)
    }
  }

  async #handleSelectMenu (interaction) {
    if (interaction.customId.startsWith('queue_message_')) {
      await this.queueMessageHandler.execute(interaction)
    }
  }
}
