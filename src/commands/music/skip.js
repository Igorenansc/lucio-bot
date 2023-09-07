import { useMainPlayer } from "discord-player";

export const data = {
  name: "skip",
  description: "Pula a música tocando atualmente",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });
    
  const edit = (isLegacy) ? 'edit' : 'editReply';

  const player = useMainPlayer();
  const queue = player.nodes.get(interaction.guild);
  
  if (!queue || !queue.node.isPlaying) return ((isLegacy) ? reply : interaction)[edit]('Não há músicas tocando no momento.')

  const { currentTrack } = queue;
  queue.node.skip();
  
  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]('Não há músicas tocando no momento.');
  return ((isLegacy) ? reply : interaction)[edit]({ content: `A música **${currentTrack.title}** foi pulada!` });
}