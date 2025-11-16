import queueMessage from "../../utils/queueMessage.js";

export const data = {
  name: "q",
  description: "Mostra a música atual e as próximas 10 a serem tocadas.",
  options: [],
};

export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..."})
    : await interaction.deferReply({ ephemeral: false, fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  const { player } = (client[interaction.guild.id]?.player) ? client[interaction.guild.id] : { player: null };

  if (!player || !player.queue.current || !player.playing) return ((isLegacy) ? reply : interaction)[edit]("Não há música tocando no momento.")

  try {
    const queueMsg = queueMessage(player);

    return ((isLegacy) ? reply : interaction)[edit](queueMsg);
  } catch (e) {
    console.log(e);
    return ((isLegacy) ? reply : interaction)[edit]("Algo deu errado!");
  }
}
