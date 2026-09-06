import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import TextPermissionValidator from '../permissions/TextPermissionValidator.js'

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Mostra a fila de reprodução.')

export async function execute (
  interaction,
  { playerManager, queueMessageService }
) {
  const player = playerManager.get(interaction.guildId)

  if (!player?.currentTrack) {
    await interaction.reply({
      content: 'Não há nenhuma música tocando.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  const textValidation = TextPermissionValidator.validate(
    interaction.guild.members.me,
    interaction.channel
  )

  if (!textValidation.valid) {
    await interaction.reply({
      content: textValidation.message,
      flags: MessageFlags.Ephemeral
    })

    return
  }

  await interaction.reply(queueMessageService.build(player))
}
