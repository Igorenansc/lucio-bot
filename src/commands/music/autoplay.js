import { QueueRepeatMode, useMasterPlayer } from "discord-player";

export const data = {
  name: "autoplay",
  description: "Habilita o autoplay.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...'})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });

  const edit = (isLegacy) ? 'edit' : 'editReply';

  const player = useMasterPlayer();
  const queue  = player.nodes.get(interaction.guild);

  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há fila de músicas.')
  
  queue.setRepeatMode( QueueRepeatMode[(queue.repeatMode === 3) ? 'OFF' : 'AUTOPLAY'] );
  
  return ((isLegacy) ? reply : interaction)[edit]({ content: `O autoplay foi ${ (queue.repeatMode === 3) ? 'habilitado!' : 'desabilitado!'}` });
}