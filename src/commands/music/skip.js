import { useMainPlayer } from "discord-player";

export const data = {
  name: "skip",
  description: "Pula a música tocando atualmente",
  options: [
    {
      name: "qtd",
      description: "Numero de músicas a serem puladas.",
      required: false,
      min_value: 1,
      type: 4,
    },
  ],
};

export async function run(_client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const player = useMainPlayer();
  const queue = player.nodes.get(interaction.guild);
  if (!queue || !queue.node.isPlaying) return ((isLegacy) ? reply : interaction)[edit]("Não há músicas tocando no momento.")

  try {
    if (interaction.member.voice.channel.id !== queue.channel.id) {
      return ((isLegacy) ? reply : interaction)[edit]({
        content: "Você precisa estar no mesmo canal de voz que eu."
      });
    }
  } catch (e) {
    console.log(e.message)
    return ((isLegacy) ? reply : interaction)[edit]({ content: "Você precisa estar conectado a um chat de voz!" });
  }

  let amount = (isLegacy)
    ? Number(interaction.content.slice(6).trim())
    : Number(interaction.options.get("qtd")?.value);

  amount = (typeof amount === "number" && amount >= 1 && queue.tracks.data.length >= amount) ? amount - 1 : 0;

  const { currentTrack } = queue;
  queue.node.skipTo(amount);

  if (!currentTrack) return ((isLegacy) ? reply : interaction)[edit]("Não há músicas tocando no momento.");
  return ((isLegacy) ? reply : interaction)[edit]({
    content: (!amount) ? `A música **${currentTrack.title}** foi pulada!`
    : `**${amount + 1}** músicas foram puladas!`
  });
  // return ((isLegacy) ? reply : interaction)[edit]({ content: `A música **${currentTrack.title}** foi pulada!` });
}
