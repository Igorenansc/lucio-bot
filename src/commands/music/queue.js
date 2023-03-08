import store from "../../redux/store.js";
import { parse_duration } from './play.js';

export const data = {
  name: "q",
  description: "Mostra a música atual e as próximas 10 a serem tocadas.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';
  
  const { playlist, currentTrack } = store.getState();

  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]('Não há músicas tocando no momento.');

  let queueStr = '';
  let slicedPlaylist = playlist.slice(0, 10);

  slicedPlaylist.forEach((music, i) => {
    queueStr += `**${i + 1} - ** ${music[0].title} - ${parse_duration(music[0].duration)}\n`;
  })
  
  const response = {
    title: `${currentTrack[0].title} - ${parse_duration(currentTrack[0].duration)}`,
    description: queueStr,
    color: 0x00ff00, // Verde
  }

  return ((isLegacy) ? reply : interaction)[edit]({ embeds: [response] });
}