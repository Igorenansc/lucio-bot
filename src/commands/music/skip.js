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

  const { queue } = await store.getState();
  
  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há músicas tocando no momento.')

  const currentTrack = queue.current;
  queue.skip();
  
  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]('Não há músicas tocando no momento.');
  return ((isLegacy) ? reply : interaction)[edit]({ content: `A música **${currentTrack.title}** foi pulada!` });
}