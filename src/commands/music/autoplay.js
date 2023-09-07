import { QueueRepeatMode, useMainPlayer } from "discord-player";

export const data = {
  name: "autoplay",
  description: "Habilita o autoplay.",
  options: [],
};

export async function run(_client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });

  const edit = (isLegacy) ? 'edit' : 'editReply';

  const player = useMainPlayer();
  const queue  = player.nodes.get(interaction.guild);

  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há fila de músicas.')
  
  const isAutoPlaying = queue.repeatMode === 3;
  
  queue.setRepeatMode( QueueRepeatMode[(isAutoPlaying) ? 'OFF' : 'AUTOPLAY'] );
  
  return ((isLegacy) ? reply : interaction)[edit]({ content: `O autoplay foi ${ (isAutoPlaying) ? 'desabilitado!' : 'habilitado!'}` });
}