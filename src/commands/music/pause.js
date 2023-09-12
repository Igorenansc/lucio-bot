import { useMainPlayer } from "discord-player";

export const data = {
  name: "pause",
  description: "Pausa/retoma a música tocando atualmente",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy) 
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: true, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const player = useMainPlayer();
  const queue = player.nodes.get(interaction.guild);
  if (!queue) return ((isLegacy) ? reply : interaction)[edit]("Não há música tocando no momento.");

  try {
    if (interaction.member.voice.channel.id !== queue.channel.id) {
      return ((isLegacy) ? reply : interaction)[edit]({ 
        content: "Você precisa estar no mesmo canal de voz que eu."
      });
    }
  } catch (e) {
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  queue.node[queue.node.isPaused() ? "resume" : "pause"]();

  return ((isLegacy) ? reply : interaction)[edit]({ content: (queue.node.isPaused()) ? "Música pausada!" : "Música retomada!" });
}