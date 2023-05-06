export default (client) => {
  console.log("I'm alive")

  client.application.commands.set([...client.commands.map((command) => command.data)])
}