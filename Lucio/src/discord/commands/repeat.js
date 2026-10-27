import { MessageFlags, InteractionContextType, SlashCommandBuilder } from 'discord.js'

import { RepeatMode } from '../../music/player/RepeatMode.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('repeat')
  .setDescription('Altera o modo de repetição.')
  .setContexts(InteractionContextType.Guild)
  .addStringOption(option =>
    option
      .setName('mode')
      .setDescription('Modo de repetição.')
      .setRequired(true)
      .addChoices(
        {
          name: 'Desligado',
          value: RepeatMode.OFF
        },
        {
          name: 'Música',
          value: RepeatMode.TRACK
        },
        {
          name: 'Fila',
          value: RepeatMode.QUEUE
        }
      )
  )

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

  const mode = interaction.options.getString('mode', true)

  player.setRepeatMode(mode)

  const labels = {
    [RepeatMode.OFF]: 'desligado',
    [RepeatMode.TRACK]: 'música atual',
    [RepeatMode.QUEUE]: 'fila'
  }

  await interaction.reply(`Repeat configurado para: **${labels[mode]}**`)
}
