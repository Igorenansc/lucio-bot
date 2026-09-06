import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Pula a música atual ou uma quantidade específica.')
  .addIntegerOption(option =>
    option
      .setName('qtd')
      .setDescription('Quantidade de músicas a pular, contando a atual.')
      .setMinValue(1)
      .setRequired(false)
  )

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

  const amount = interaction.options.getInteger('qtd') ?? 1

  const availableTracks = player.queue.size + 1

  if (amount > availableTracks) {
    await interaction.reply({
      content:
        `Não é possível pular **${amount}** músicas. ` +
        `Há apenas **${availableTracks}** disponíveis entre a atual e a fila.`,
      flags: MessageFlags.Ephemeral
    })

    return
  }

  const skippedTitle = player.currentTrack.info.title

  await player.skip(amount)

  await interaction.reply(
    amount === 1
      ? `A música **${skippedTitle}** foi pulada!`
      : `**${amount}** músicas foram puladas!.`
  )
}
