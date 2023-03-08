import store from "../../redux/store.js";

export const data = {
  name: "stop",
  description: "Para a execução da fila de músicas e remove o bot.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  const { queue } = await store.getState();

  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há música tocando no momento.')

  queue.destroy();

  await store.dispatch({ type: 'DESTROY_QUEUE' });
  
  return ((isLegacy) ? reply : interaction)[edit]({ content: "A fila foi limpa e o bot removido!" });
}