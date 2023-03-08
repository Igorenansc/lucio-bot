export default (client, interaction) => {
  if (!interaction.isCommand()) return;

  try {
    client.commands.get(interaction.commandName)?.run(client, interaction);
  } catch (e) {
    console.log(e);
    interaction.reply({ content: "Ocorreu um erro ao executar o comando!"});
  }
}