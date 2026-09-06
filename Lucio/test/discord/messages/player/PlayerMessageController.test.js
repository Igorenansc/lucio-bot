import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { EventEmitter } from 'node:events'

import PlayerMessageController from '../../../../src/discord/messages/player/PlayerMessageController.js'

function createPlayerMessageService () {
  const calls = {
    createOrUpdate: [],
    recreate: [],
    delete: []
  }

  return {
    calls,

    async createOrUpdate (guildId, channel, player) {
      calls.createOrUpdate.push({
        guildId,
        channel,
        player
      })
    },

    async recreate (guildId, channel, player) {
      calls.recreate.push({
        guildId,
        channel,
        player
      })
    },

    async delete (guildId) {
      calls.delete.push(guildId)
    }
  }
}

function createPlayer () {
  const player = new EventEmitter()

  player.currentTrack = {
    info: {
      identifier: 'A'
    }
  }

  return player
}

async function flushEvents () {
  await new Promise(resolve => setImmediate(resolve))
}

describe('PlayerMessageController', () => {
  test('trackStart atualiza PlayerMessage', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const player = createPlayer()

    const channel = {
      id: 'text-1'
    }

    controller.bind({
      guildId: 'guild-1',
      channel,
      player
    })

    player.emit('trackStart')

    await flushEvents()

    assert.equal(service.calls.createOrUpdate.length, 1)

    assert.equal(service.calls.createOrUpdate[0].guildId, 'guild-1')
  })

  test('stateChange atualiza PlayerMessage', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const player = createPlayer()

    controller.bind({
      guildId: 'guild-1',
      channel: {
        id: 'text-1'
      },
      player
    })

    player.emit('stateChange')

    await flushEvents()

    assert.equal(service.calls.createOrUpdate.length, 1)
  })

  test('playerIdle remove PlayerMessage', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const player = createPlayer()

    controller.bind({
      guildId: 'guild-1',
      channel: {
        id: 'text-1'
      },
      player
    })

    player.emit('playerIdle')

    await flushEvents()

    assert.deepEqual(service.calls.delete, ['guild-1'])
  })

  test('playerDestroy remove PlayerMessage', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const player = createPlayer()

    controller.bind({
      guildId: 'guild-1',
      channel: {
        id: 'text-1'
      },
      player
    })

    player.emit('playerDestroy')

    await flushEvents()

    assert.deepEqual(service.calls.delete, ['guild-1'])
  })

  test('recreate usa binding existente', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const player = createPlayer()

    const channel = {
      id: 'text-1'
    }

    controller.bind({
      guildId: 'guild-1',
      channel,
      player
    })

    const result = await controller.recreate('guild-1')

    assert.equal(result, true)

    assert.equal(service.calls.recreate.length, 1)

    assert.equal(service.calls.recreate[0].channel, channel)
  })

  test('recreate retorna false sem binding', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const result = await controller.recreate('guild-inexistente')

    assert.equal(result, false)
  })

  test('unbind remove listeners do player', async () => {
    const service = createPlayerMessageService()

    const controller = new PlayerMessageController(service)

    const player = createPlayer()

    controller.bind({
      guildId: 'guild-1',
      channel: {
        id: 'text-1'
      },
      player
    })

    controller.unbind('guild-1')

    player.emit('trackStart')

    player.emit('stateChange')

    player.emit('playerIdle')

    await flushEvents()

    assert.equal(service.calls.createOrUpdate.length, 0)

    assert.equal(service.calls.delete.length, 0)
  })
})
