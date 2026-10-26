import { createPlayerMock } from './createPlayerMock.js'

export function createPlayerManagerMock (player = null) {
  const calls = {
    get: [],
    reconcile: [],
    create: [],
    destroy: []
  }

  let currentPlayer = player

  return {
    calls,

    get (guildId) {
      calls.get.push(guildId)

      return currentPlayer
    },

    async reconcile (guildId) {
      calls.reconcile.push(guildId)

      return currentPlayer
    },

    async create (options) {
      calls.create.push(options)

      currentPlayer = createPlayerMock({
        currentTrack: false
      })

      return currentPlayer
    },

    async destroy (guildId) {
      calls.destroy.push(guildId)

      const existed = Boolean(currentPlayer)

      currentPlayer = null

      return existed
    },

    get currentPlayer () {
      return currentPlayer
    }
  }
}
