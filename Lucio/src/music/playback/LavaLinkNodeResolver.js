export default class LavalinkNodeResolver {
  constructor (shoukaku) {
    this.shoukaku = shoukaku
  }

  getAvailableNode () {
    const node = [...this.shoukaku.nodes.values()].find(
      node => node.state === 1
    )

    if (!node) {
      throw new Error('Nenhum node Lavalink disponível.')
    }

    return node
  }
}
