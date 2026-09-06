import { MessageFlags } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'
import VoicePermissionValidator from '../../discord/permissions/VoicePermissionValidator.js'

import { formatDuration } from '../../utils/formatDuration.js'

export default class PlayRequestService {
  constructor ({ playerManager, searchService }) {
    this.playerManager = playerManager
    this.searchService = searchService
  }

  async execute ({ interaction, query }) {
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

    const result = await this.searchService.search(query)

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
