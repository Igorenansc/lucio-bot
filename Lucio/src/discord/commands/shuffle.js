import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Embaralha as músicas que estão na fila.')

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

  const shuffled = player.shuffle()

  if (!shuffled) {
    await interaction.reply({
      content: 'É necessário ter pelo menos duas músicas na fila para embaralhar.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  await interaction.reply(
    `Fila embaralhada: **${player.queue.size} músicas**.`
  )
}
