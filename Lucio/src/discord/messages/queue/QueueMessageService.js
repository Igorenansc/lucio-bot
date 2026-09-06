import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'

import { formatDuration } from '../../../utils/formatDuration.js'

export default class QueueMessageService {
  build (player, initialIndex = 0) {
    const tracks = player.queue.toArray()

    const pageSize = 10

    const queueLength = tracks.length

    const maxPage = Math.max(1, Math.ceil(queueLength / pageSize))

    const requestedPage = Math.floor(initialIndex / pageSize)

    const page = Math.min(requestedPage, maxPage - 1)

    const start = page * pageSize

    const end = start + pageSize

    const visible = tracks.slice(start, end)

    const queueText =
      visible.length === 0
        ? ':cricket:‎ ‎ ‎:cricket::cricket:‎ ‎:cricket:'
        : visible
            .map((track, index) => {
              const position = start + index + 1

              const duration = track.info.isStream
                ? 'AO VIVO'
                : formatDuration(track.info.length)

              return (
                `**${position} - ** ` + `${track.info.title} - [${duration}]`
              )
            })
            .join('\n')

    const embed = new EmbedBuilder().setColor(3066993).addFields(
      {
        name: ':musical_note: Tocando Agora',
        value: player.currentTrack?.info?.title ?? 'Nada',
        inline: true
      },
      {
        name: ':loud_sound: Auto Play',
        value: player.autoplay
          ? ':white_check_mark:'
          : ':negative_squared_cross_mark:',
        inline: true
      },
      {
        name: '',
        value: this.#generateProgressBar(player),
        inline: false
      },
      {
        name: ':notes: Queue',
        value: queueText,
        inline: false
      }
    )

    const previous = new ButtonBuilder()
      .setCustomId(`queue_message_previous:${start}`)
      .setLabel('‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎<‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0)

    const refresh = new ButtonBuilder()
      .setCustomId(`queue_message_refresh:${start}`)
      .setLabel('↻')
      .setStyle(ButtonStyle.Secondary)

    const pageDisplay = new ButtonBuilder()
      .setCustomId(`queue_message_page_display:${start}`)
      .setLabel(`${page + 1} / ${maxPage}`)
      .setStyle(ButtonStyle.Secondary)

    const remove = new ButtonBuilder()
      .setCustomId('queue_message_remove')
      .setLabel('✖')
      .setStyle(ButtonStyle.Secondary)

    const next = new ButtonBuilder()
      .setCustomId(`queue_message_next:${start}`)
      .setLabel('‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎>‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= maxPage - 1)

    const row = new ActionRowBuilder().addComponents(
      previous,
      refresh,
      pageDisplay,
      remove,
      next
    )

    const select = new StringSelectMenuBuilder()
      .setCustomId('queue_message_page')
      .setPlaceholder(`${page + 1}`)

    /*
     * Discord limita a quantidade de opções.
     * Mantemos até 25 páginas próximas.
     */
    const firstPage = Math.max(0, page - 12)

    const lastPage = Math.min(maxPage, firstPage + 25)

    for (let i = firstPage; i < lastPage; i++) {
      select.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${i + 1}`)
          .setValue(`${i * pageSize}`)
      )
    }

    const selectRow = new ActionRowBuilder().addComponents(select)

    return {
      embeds: [embed],
      components: [row, selectRow]
    }
  }

  #generateProgressBar (player) {
    const current = player.currentTrack

    if (!current) {
      return '00:00'
    }

    if (current.info.isStream) {
      return ':red_circle: **AO VIVO**'
    }

    const currentTime = player.position ?? 0

    const totalTime = current.info.length

    const barLength = 18

    const ratio = totalTime > 0 ? currentTime / totalTime : 0

    const position = Math.min(barLength, Math.floor(ratio * barLength))

    const bar = '▬'.repeat(position) + '🔘' + '▬'.repeat(barLength - position)

    return (
      `${formatDuration(currentTime)} ` +
      `| ${bar} | ` +
      `${formatDuration(totalTime)}`
    )
  }
}
