import { useMasterPlayer } from "discord-player";

export const data = {
  name: "pause",
  description: "Pausa/retoma a música tocando atualmente",
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

  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há música tocando no momento.')

  if (!queue.node.isPaused()) {
    queue.node.pause();
  } else {
    queue.node.resume();
  }

  return ((isLegacy) ? reply : interaction)[edit]({ content: (queue.node.isPaused()) ? 'Música pausada!' : 'Música retomada!' });
}