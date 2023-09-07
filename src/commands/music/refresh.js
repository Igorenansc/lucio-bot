import { useMainPlayer } from "discord-player";
import { ClientApplication, CommandInteraction } from "discord.js";
import playerMessage from "../../utils/playerMessage.js";

export const data = {
  name: "rf",
  description: "Refaz a mensagem do player de música.",
  options: [],
};

// jsdoc for a command in discord bot
/**
 * @param {ClientApplication} client
 * @param {CommandInteraction} interaction
 */
export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: 'Lúcio está pensando...', ephemeral: true })
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });
  
  const edit = (isLegacy) ? 'edit' : 'editReply';
  const del = (isLegacy) ? 'delete' : 'deleteReply';

  const player = useMainPlayer();
  const queue = player.nodes.get(interaction.guild);

  if (!queue) return ((isLegacy) ? reply : interaction)[edit]('Não há fila de músicas.')
  
  await playerMessage.delete(queue);
  
  const { currentTrack } = queue;
  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]('Não há música tocando no momento.');
  
  await playerMessage.create(queue, currentTrack);
  
  return ((isLegacy) ? reply : interaction)[del]();
}