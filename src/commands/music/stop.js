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
  
  const { connection, player } = store.getState();

  // await interaction.guild.members.me.voice.disconnect();

  if (player) player.stop();
  if (!connection) return ((isLegacy) ? reply : interaction)[edit]({ content: "Sem conexão ativa no momento." });

  connection.destroy();
  await store.dispatch({ type: 'STOP_PLAYLIST' });

  return ((isLegacy) ? reply : interaction)[edit]({ content: "A fila foi limpa e o bot removido!" });
}