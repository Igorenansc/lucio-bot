import { createPlayerMock } from './createPlayerMock.js'

export function createPlayerManagerMock (player = null) {
  const calls = {
    get: [],
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

    async create (options) {
      calls.create.push(options)

      currentPlayer = createPlayerMock({
        currentTrack: false
      })

      return currentPlayer
    },

    async destroy (guildId) {
      calls.destroy.push(guildId)
    },

    get currentPlayer () {
      return currentPlayer
    }
  }
}
