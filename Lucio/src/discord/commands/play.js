import { SlashCommandBuilder } from 'discord.js'

import { logger } from '../../app/config/logger.js'

const commandLogger = logger.child({
  component: 'PlayCommand'
})

export const data = new SlashCommandBuilder()
  .setName('p')
  .setDescription('Toca uma música ou adiciona músicas à fila.')
  .addStringOption(option =>
    option
      .setName('query')
      .setDescription('Nome, URL da música ou URL de uma playlist.')
      .setRequired(true)
      .setAutocomplete(true)
  )

export async function autocomplete (interaction, { autocompleteService }) {
  const query = interaction.options.getFocused()

  if (!query?.trim()) {
    await interaction.respond([])

    return
  }

  const key = `${interaction.guildId}:${interaction.user.id}:video`

  try {
    const results = await autocompleteService.search(key, query)

    const choices = results.map(video => ({
      name: formatChoice(
        video.duration
          ? `🎵 [${video.duration}] - ${video.title}`
          : `🎵 [AO VIVO] - ${video.title}`
      ),
      value: `https://www.youtube.com/watch?v=${video.videoId}`
    }))

    await interaction.respond(choices)
  } catch (error) {
    commandLogger.error(
      {
        err: error,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        query
      },
      'Erro no autocomplete'
    )

    await interaction.respond([])
  }
}

export async function execute (interaction, { playRequestService }) {
  const query = interaction.options.getString('query', true)

  await playRequestService.execute({
    interaction,
    query
  })
}

function formatChoice (value) {
  return value.length > 100 ? `${value.slice(0, 97)}...` : value
}
