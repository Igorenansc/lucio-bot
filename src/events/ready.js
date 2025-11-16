export default (client) => {
  console.log("Client luciov3: I'm alive")

  client.application.commands.set([...client.commands.map((command) => command.data)])
}
