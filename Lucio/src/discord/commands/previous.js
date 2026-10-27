import { MessageFlags, InteractionContextType, SlashCommandBuilder } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('previous')
  .setDescription('Volta para a música anterior.')
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

  const changed = await player.previous()

  if (!changed) {
    await interaction.reply({
      content: 'Não há nenhuma música no histórico.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  await interaction.reply(
    `Voltando para: **${player.currentTrack.info.title}**`
  )
}
