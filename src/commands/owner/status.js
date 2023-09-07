
export const data = {
  name: "status",
  description: "Muda o status do bot!",
  options: [{
    name: "mensagem",
    description: "Mensagem que aparecerá no status do bot!",
    required: true,
    type: 3,
  }],
};
export async function run(client, interaction) {
  try {
    if (!client.owners.includes(interaction.member.id)) return interaction.reply({ content: `Você não tem permissão para usar esse comando.` });
    const option = (interaction.options) ? interaction.options.getString('status', true) : interaction.content.slice(8).trim();

    if (option !== 'clear') {
      client.user.setActivity({
        name: option,
        type: 0,
      });
    } else
      client.user.setActivity();

    interaction.reply({ content: `Status alterado para: ${option}`, ephemeral: true });
  } catch (e) {
    interaction.reply({ content: 'Ocorreu um erro ao executar o commando', ephemeral: true });
  }
}