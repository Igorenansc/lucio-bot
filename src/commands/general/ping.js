export const data = {
  name: "ping",
  description: "Mostra a latência dos comandos do bot",
  options: [],
};
export async function run(client, interaction) {
  interaction.reply({ content: `pong! ${client.ws.ping}ms` });
}