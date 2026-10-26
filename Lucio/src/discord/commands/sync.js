import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import { logger } from '../../app/config/logger.js'

const commandLogger = logger.child({
  component: 'SyncCommand'
})

export const data = new SlashCommandBuilder()
  .setName('sync')
  .setDescription('Ressincroniza os slash commands (somente donos).')

export async function execute (
  interaction,
  { ownerService, commandManager, registerCommands }
) {
  if (!ownerService?.isOwner(interaction.user.id)) {
    await interaction.reply({
      content: 'Você não tem permissão para usar este comando.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral
  })

  try {
    const count = commandManager.getCommandData().length

    await registerCommands(commandManager)

    commandLogger.info(
      {
        userId: interaction.user.id,
        count
      },
      'Slash commands sincronizados'
    )

    await interaction.editReply(
      `Slash commands sincronizados: **${count}** comando(s).`
    )
  } catch (error) {
    commandLogger.error(
      {
        err: error,
        userId: interaction.user.id
      },
      'Falha ao sincronizar slash commands'
    )

    await interaction.editReply(
      'Não foi possível sincronizar os slash commands.'
    )
  }
}
