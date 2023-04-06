import { useMasterPlayer } from "discord-player";

export const data = {
  name: "shuffle",
  description: "Embaralha as músicas da fila.",
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

  queue.tracks.shuffle();
  
  return ((isLegacy) ? reply : interaction)[edit]({ content: "As músicas foram embaralhadas!" });
}