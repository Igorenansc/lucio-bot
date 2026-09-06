import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js'

import { formatDuration } from '../../../utils/formatDuration.js'

import TextPermissionValidator from '../../permissions/TextPermissionValidator.js'

import { logger } from '../../../app/config/logger.js'

const messageLogger = logger.child({
  component: 'PlayerMessageService'
})

export default class PlayerMessageService {
  constructor () {
    /* Map<guildId, Message> */
    this.messages = new Map()

    /*
     * Serializa create/edit/delete por guild. EventEmitter não aguarda
     * listeners async; sem isso trackStart + stateChange simultâneos podem
     * executar vários channel.send() antes de `messages.set()`.
     */
    this.operations = new Map()
  }

  async createOrUpdate (guildId, channel, player) {
    return await this.#runExclusive(guildId, async () => {
      if (!player.currentTrack) return null
      if (!this.#canUseChannel(guildId, channel)) return null

      const payload = this.#buildMessage(player)

      const message = this.messages.get(guildId)

      if (message) {
        try {
          await message.edit(payload)

          return message
        } catch {
          this.messages.delete(guildId)
        }
      }

      const newMessage = await channel.send(payload)

      this.messages.set(guildId, newMessage)

      return newMessage
    })
  }

  async recreate (guildId, channel, player) {
    return await this.#runExclusive(guildId, async () => {
      /*
       * Sem permissão:
       * preserva mensagem existente.
       */
      if (!this.#canUseChannel(guildId, channel)) {
        return null
      }

      const message = this.messages.get(guildId)

      this.messages.delete(guildId)

      if (message) {
        try {
          await message.delete()
        } catch (error) {
          // mantenha aqui o tratamento
          // que você já possui
        }
      }

      /*
       * Player idle:
       * a antiga foi limpa,
       * mas não criamos outra.
       */
      if (!player.currentTrack) {
        return null
      }

      const payload = this.#buildMessage(player)

      const newMessage = await channel.send(payload)

      this.messages.set(guildId, newMessage)

      return newMessage
    })
  }

  async delete (guildId) {
    return await this.#runExclusive(guildId, async () => {
      const message = this.messages.get(guildId)

      if (!message) return

      this.messages.delete(guildId)

      try {
        await message.delete()
      } catch {
        // mensagem já pode ter sido removida
      }
    })
  }

  async #runExclusive (guildId, operation) {
    const previous = this.operations.get(guildId) ?? Promise.resolve()

    const current = previous.catch(() => {}).then(operation)

    this.operations.set(guildId, current)

    try {
      return await current
    } finally {
      if (this.operations.get(guildId) === current) {
        this.operations.delete(guildId)
      }
    }
  }

  #buildMessage (player) {
    const track = player.currentTrack

    const playPauseButton = new ButtonBuilder()
      .setCustomId('music_play_pause')
      .setLabel('Pausar / Retomar')
      .setStyle(ButtonStyle.Secondary)

    const stopButton = new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Parar‎')
      .setStyle(ButtonStyle.Danger)

    const skipButton = new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Pular')
      .setStyle(ButtonStyle.Primary)

    const volumeUpButton = new ButtonBuilder()
      .setCustomId('music_volume_up')
      .setLabel('‎ ‎Vol +‎ ‎')
      .setStyle(ButtonStyle.Success)

    const volumeDownButton = new ButtonBuilder()
      .setCustomId('music_volume_down')
      .setLabel('‎ Vol -‎ ')
      .setStyle(ButtonStyle.Success)

    const refreshButton = new ButtonBuilder()
      .setCustomId('music_refresh')
      .setLabel('‎ ‎ ‎ ‎↻‎ ‎ ‎ ‎ ')
      .setStyle(ButtonStyle.Secondary)

    const queueButton = new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('‎ ‎ ‎ 🖥‎ ‎ ‎ ')
      .setStyle(ButtonStyle.Secondary)

    const actionRow1 = new ActionRowBuilder().addComponents(
      playPauseButton,
      stopButton,
      skipButton
    )

    const actionRow2 = new ActionRowBuilder().addComponents(
      queueButton,
      refreshButton,
      volumeUpButton,
      volumeDownButton
    )

    const embed = new EmbedBuilder()
      .setAuthor({
        name: track.info.author
      })
      .setTitle(track.info.title)
      .setURL(track.info.uri)
      .setDescription(
        track.info.isStream
          ? ':red_circle: **AO VIVO**'
          : `\`[0:00] / [${formatDuration(track.info.length)}]\``
      )

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl)
    }

    return {
      embeds: [embed],
      components: [actionRow1, actionRow2]
    }
  }

  #canUseChannel (guildId, channel) {
    const validation = TextPermissionValidator.validate(
      channel.guild?.members?.me,
      channel
    )

    if (validation.valid) {
      return true
    }

    messageLogger.warn(
      {
        guildId,
        channelId: channel.id,
        reason: validation.message
      },
      'PlayerMessage indisponível por falta de permissão'
    )

    return false
  }
}
