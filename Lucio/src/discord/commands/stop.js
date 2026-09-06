import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Encerra a reprodução e desconecta o bot.')

export async function execute (interaction, { playerManager }) {
  const player = playerManager.get(interaction.guildId)

  if (!player) {
    await interaction.reply({
      content: 'Não existe um player ativo neste servidor.',
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

  await playerManager.destroy(interaction.guildId)

  await interaction.reply('Reprodução encerrada.')
}
