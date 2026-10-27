import { MessageFlags, InteractionContextType, SlashCommandBuilder } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pausa a música atual.')
  .setContexts(InteractionContextType.Guild)

export async function execute (interaction, { playerManager }) {
  const player = playerManager.get(interaction.guildId)

  if (!player?.currentTrack) {
    await interaction.reply({
      content: 'Não há nenhuma música tocando.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  const voiceValidation = await VoiceChannelValidator.sameChannel(interaction)

  if (!voiceValidation.valid) {
    await interaction.reply({
      content: voiceValidation.message,
      flags: MessageFlags.Ephemeral
    })

    return
  }

  if (player.paused) {
    await interaction.reply({
      content: 'A música já está pausada.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  await player.pause()

  await interaction.reply(`Pausado: **${player.currentTrack.info.title}**`)
}
