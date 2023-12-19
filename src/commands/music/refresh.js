import { useMainPlayer } from "discord-player";
import playerMessage from "../../utils/playerMessage.js";

export const data = {
  name: "rf",
  description: "Refaz a mensagem do player de música.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando...", ephemeral: true })
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";
  const del = (isLegacy) ? "delete" : "deleteReply";

  const player = useMainPlayer();
  const queue = player.nodes.get(interaction.guild);
  if (!queue) return ((isLegacy) ? reply : interaction)[edit]("Não há fila de músicas.")

  try {
    if (interaction.member.voice.channel.id !== queue.channel.id) {
      return ((isLegacy) ? reply : interaction)[edit]({
        content: "Você precisa estar no mesmo canal de voz que eu."
      });
    }
  } catch (e) {
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  await playerMessage.delete(queue);

  const { currentTrack } = queue;
  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]("Não há música tocando no momento.");

  await playerMessage.create(queue, currentTrack);

  return ((isLegacy) ? reply : interaction)[del]();
}
