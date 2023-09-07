export default (client, message) => {
  if (!message.content.startsWith(client.prefix) || message.author.bot) return;
  
  const args = message.content.slice(client.prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();
  
  if (commandName) {
    // console.log(client.commands)
    const command = client.commands.get(commandName);
    if (!command) return
    try {
      command.run(client, message, args);
    } catch (error) {
      console.error(error);
      message.reply("There was an error while executing this command.");
    }
  }
}