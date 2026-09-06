import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('autoplay')
  .setDescription('Ativa ou desativa recomendações automáticas.')

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

  const enabled = !player.autoplay

  player.setAutoplay(enabled)

  await interaction.reply(
    enabled ? 'Autoplay **ativado**.' : 'Autoplay **desativado**.'
  )
}
