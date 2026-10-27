import { InteractionContextType, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('p')
  .setDescription('Toca uma música por nome ou URL.')
  .setContexts(InteractionContextType.Guild)
  .addStringOption(option =>
    option
      .setName('query')
      .setDescription('Nome, URL da música ou URL de uma playlist.')
      .setRequired(true)
  )

export async function execute (interaction, { playRequestService }) {
  const query = interaction.options.getString('query', true)

  await playRequestService.execute({
    interaction,
    query
  })
}
