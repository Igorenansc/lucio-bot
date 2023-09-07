import { useMainPlayer } from "discord-player";
import playerMessage from "../../utils/playerMessage.js";

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

  const player = useMainPlayer();
  const queue  = player.nodes.get(interaction.guild);

  if (!queue || !queue.node.isPlaying) return ((isLegacy) ? reply : interaction)[edit]('Não há músicas tocando no momento.')

  playerMessage.delete(queue);
  queue.delete();

  return ((isLegacy) ? reply : interaction)[edit]({ content: "A fila foi limpa e o bot removido!" });
}