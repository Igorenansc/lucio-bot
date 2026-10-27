import { MessageFlags } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'
import VoicePermissionValidator from '../../discord/permissions/VoicePermissionValidator.js'

import { formatDuration } from '../../utils/formatDuration.js'

import { logger } from '../../app/config/logger.js'

const playRequestLogger = logger.child({
  component: 'PlayRequestService'
})

export default class PlayRequestService {
  constructor ({ playerManager, searchService }) {
    this.playerManager = playerManager
    this.searchService = searchService
  }

  async execute ({ interaction, query, searchType }) {
    /*
     * get() já devolve null e agenda a destruição de um player
     * inconsistente. Isso é síncrono, então a validação de canal
     * e o deferReply não ficam presos em um teardown remoto.
     */
    let player = this.playerManager.get(interaction.guildId)

    const voiceValidation = player
      ? await VoiceChannelValidator.sameChannel(interaction)
      : await VoiceChannelValidator.userInVoice(interaction)

    if (!voiceValidation.valid) {
      await interaction.reply({
        content: voiceValidation.message,
        flags: MessageFlags.Ephemeral
      })

      return false
    }

    if (!player) {
      const permissionValidation = VoicePermissionValidator.validate(
        interaction.guild.members.me,
        voiceValidation.channel
      )

      if (!permissionValidation.valid) {
        await interaction.reply({
          content: permissionValidation.message,
          flags: MessageFlags.Ephemeral
        })

        return false
      }
    }

    await interaction.deferReply()

    try {
      /*
       * Agora que a interação já foi confirmada, podemos esperar
       * a limpeza de um fantasma sem estourar o timeout de 3 s.
       */
      player = await this.playerManager.reconcile(interaction.guildId)

      const result = await this.searchService.search(query, searchType)

      if (
        result.type === 'empty' ||
        result.type === 'error' ||
        result.tracks.length === 0
      ) {
        await interaction.editReply('Não encontrei nenhuma música.')

        return false
      }

      if (!player) {
        player = await this.playerManager.create({
          guildId: interaction.guildId,
          channelId: voiceValidation.channel.id,
          textChannel: interaction.channel,
          shardId: interaction.guild.shardId
        })
      }

      if (result.type === 'playlist') {
        await this.#enqueuePlaylist(player, result, interaction)

        return true
      }

      const track = this.#addRequester(result.tracks[0], interaction)

      await player.enqueue(track)

      const duration = track.info.isStream
        ? 'AO VIVO'
        : formatDuration(track.info.length)

      await interaction.editReply(
        `**${track.info.title} - [${duration}]** adicionada!`
      )

      return true
    } catch (error) {
      playRequestLogger.error(
        {
          err: error,
          guildId: interaction.guildId,
          userId: interaction.user.id,
          query
        },
        'Erro ao processar pedido de reprodução'
      )

      try {
        await interaction.editReply(
          'Ocorreu um erro ao processar sua música. Tente novamente.'
        )
      } catch (replyError) {
        playRequestLogger.error(
          { err: replyError, guildId: interaction.guildId },
          'Não foi possível responder ao erro de reprodução'
        )
      }

      return false
    }
  }

  async #enqueuePlaylist (player, result, interaction) {
    const tracks = result.tracks.map(track =>
      this.#addRequester(track, interaction)
    )

    await player.enqueueMany(tracks)

    const name = result.playlist?.name ?? 'Playlist'

    await interaction.editReply(
      `A playlist **${name}** com **${tracks.length}** músicas foi adicionada!`
    )
  }

  #addRequester (track, interaction) {
    return {
      ...track,
      userData: {
        ...track.userData,
        requester: {
          id: interaction.user.id,
          username: interaction.user.username,
          displayName:
            interaction.member?.displayName ??
            interaction.user.displayName ??
            interaction.user.username
        }
      }
    }
  }
}
