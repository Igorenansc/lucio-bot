export const data = {
  name: "ping",
  description: "Mostra a latência dos comandos do bot",
  options: [],
};
export async function run(client, interaction) {
  const isLegacy = !interaction?.options;
  const reply = (isLegacy)
    ? await interaction.reply({ content: "Lúcio está pensando..." })
    : await interaction.deferReply({ fetchReply: true });

  const edit = (isLegacy) ? "edit" : "editReply";

  return ((isLegacy) ? reply : interaction)[edit]({ content: `pong! ${client.ws.ping}ms` });
}
