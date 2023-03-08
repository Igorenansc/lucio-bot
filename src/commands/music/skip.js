import store from "../../redux/store.js";

export const data = {
  name: "skip",
  description: "Pula a música tocando atualmente",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  const { player, currentTrack } = store.getState();

  if (player) await player.stop();
  
  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]('Não há múscias tocando no momento.');
  return ((isLegacy) ? reply : interaction)[edit]({ content: `A música **${currentTrack[0].title}** foi pulada!` });
}