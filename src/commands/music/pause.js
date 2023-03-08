import store from "../../redux/store.js";

export const data = {
  name: "pause",
  description: "Pausa a música tocando atualmente",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  const { queue, isPaused } = await store.getState();

  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há música tocando no momento.')

  queue.setPaused(!isPaused);
  
  await store.dispatch({ type: 'TOGGLE_PAUSE' });
  
  return ((isLegacy) ? reply : interaction)[edit]({ content: `Música ${(isPaused) ? 'retomada' : 'pausada'}!` });
}