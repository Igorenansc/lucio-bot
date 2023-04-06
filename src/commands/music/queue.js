import { useMasterPlayer } from "discord-player";
import { EmbedBuilder } from "discord.js";

export const data = {
  name: "q",
  description: "Mostra a música atual e as próximas 10 a serem tocadas.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  const player = useMasterPlayer();
  const queue = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying) return ((isLegacy) ? reply : interaction)[edit]('Não há música tocando no momento.')
  
  try {
    const queueStr = queue.tracks.data.slice(0, 10).map((music, i) => {
      return `**${i + 1} - ** ${music.title} - ${music.duration}`;
    }).join('\n');
    const { currentTrack } = queue;
    const tracksQueue = `${queueStr} ${((queue.tracks.data.length - 10) > 0) ? `\n e mais ${queue.tracks.data.length - 10}...` : ''}`

    const QueueRepeatMode = {
      0: 'OFF',
      1: 'TRACK',
      2: 'QUEUE',
      3: 'AUTOPLAY',
    }

    const response = new EmbedBuilder()
      .setColor('Green')
      .setTimestamp()
      .addFields(
        {
          name: ":musical_note: Tocando Agora",
          value: `${queue.currentTrack.title}\n${queue.node.createProgressBar()}\n`,
          inline: true,
        },
        {
          name: ":notes: Queue",
          value: tracksQueue,
          inline: false,
        }
      )

    return ((isLegacy) ? reply : interaction)[edit]({ embeds: [response] });
  } catch (e) {
    console.log(e);
    return ((isLegacy) ? reply : interaction)[edit]('Algo deu errado!');
  }
}