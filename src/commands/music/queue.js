import store from "../../redux/store.js";

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

  const { queue } = await store.getState();

  if (!queue || !queue.playing) return ((isLegacy) ? reply : interaction)[edit]('Não há música tocando no momento.')

  const queueStr = queue.tracks.slice(0, 10).map((music, i) => {
    return `**${i + 1} - ** ${music.title} - ${music.duration}`;
  }).join('\n');
  const currentTrack = queue.current;

  const response = {
    title: `${currentTrack.title} - ${currentTrack.duration}`,
    description: queueStr,
    color: 0x00ff00, // Verde
  }
  
  return ((isLegacy) ? reply : interaction)[edit]({ embeds: [response] });
}