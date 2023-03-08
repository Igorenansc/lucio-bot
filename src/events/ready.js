export default (client) => {
  console.log('Client is up')

  client.application.commands.set([...client.commands.map(v => v.data)])
}