import { InteractionContextType, SlashCommandBuilder } from 'discord.js'

import { SearchType } from '../../music/search/SearchType.js'

import { logger } from '../../app/config/logger.js'

const commandLogger = logger.child({
  component: 'YouTubeCommand'
})

export const data = new SlashCommandBuilder()
  .setName('yt')
  .setDescription('Busca vídeos ou playlists no YouTube.')
  .setContexts(InteractionContextType.Guild)
  .addStringOption(option =>
    option
      .setName('tipo')
      .setDescription('Tipo de conteúdo que deseja buscar.')
      .setRequired(true)
      .addChoices(
        {
          name: 'musica',
          value: SearchType.VIDEO
        },
        {
          name: 'playlist',
          value: SearchType.PLAYLIST
        }
      )
  )
  .addStringOption(option =>
    option
      .setName('busca')
      .setDescription('Digite o que deseja buscar.')
      .setRequired(true)
      .setAutocomplete(true)
  )

export async function autocomplete (interaction, { autocompleteService }) {
  const query = interaction.options.getFocused()

  if (!query?.trim()) {
    await interaction.respond([])

    return
  }

  const type = interaction.options.getString('tipo')

  /*
   * O Discord pode disparar autocomplete
   * antes de o usuário escolher o tipo.
   */
  if (!type) {
    await interaction.respond([])

    return
  }

  const key = `${interaction.guildId}:${interaction.user.id}:${type}`

  try {
    const results = await autocompleteService.search(key, query, type)

    const choices = results.map(result => {
      if (type === SearchType.PLAYLIST) {
        return {
          name: formatChoice(
            result.author
              ? `🎶 ${result.title} — ${result.author}`
              : `🎶 ${result.title}`
          ),
          value: `https://www.youtube.com/playlist?list=${result.playlistId}`
        }
      }

      return {
        name: formatChoice(
          result.duration
            ? `🎵 [${result.duration}] - ${result.title}`
            : `🎵 [AO VIVO] - ${result.title}`
        ),
        value: `https://www.youtube.com/watch?v=${result.videoId}`
      }
    })

    await interaction.respond(choices)
  } catch (error) {
    commandLogger.error(
      {
        err: error,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        query,
        type
      },
      'Erro no autocomplete do /yt'
    )

    await interaction.respond([])
  }
}

export async function execute (interaction, { playRequestService }) {
  const query = interaction.options.getString('busca', true)

  const searchType = interaction.options.getString('tipo', true)

  /*
   * Quando o usuário escolhe um item do autocomplete, query já
   * é a URL exata. Quando ele digita e aperta Enter, o
   * searchType garante que uma busca de playlist não caia no
   * ytsearch de vídeo.
   */
  await playRequestService.execute({
    interaction,
    query,
    searchType
  })
}

function formatChoice (value) {
  return value.length > 100 ? `${value.slice(0, 97)}...` : value
}
