import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { EventEmitter } from 'node:events'

import { registerEvents } from '../../../src/app/events/registerEvents.js'

async function flush () {
  await new Promise(resolve => setImmediate(resolve))
}

function createDependencies (error) {
  const client = new EventEmitter()

  const shoukaku = new EventEmitter()

  const interactionRouter = {
    async handle () {
      throw error
    }
  }

  const voiceStateService = {
    async handle () {}
  }

  registerEvents({
    client,
    shoukaku,
    commandManager: {
      getCommandData: () => []
    },
    interactionRouter,
    voiceStateService
  })

  return {
    client
  }
}

function createInteraction ({ deferred = false } = {}) {
  const calls = {
    reply: [],
    followUp: []
  }

  const interaction = {
    type: 2,
    guildId: 'guild-1',
    user: { id: 'user-1' },

    deferred,
    replied: false,

    isAutocomplete: () => false,

    async reply (payload) {
      calls.reply.push(payload)
    },

    async followUp (payload) {
      calls.followUp.push(payload)
    }
  }

  return {
    interaction,
    calls
  }
}

describe('registerEvents', () => {
  test('responde erro em interação não deferida', async () => {
    const { client } = createDependencies(new Error('falha'))

    const { interaction, calls } = createInteraction()

    client.emit('interactionCreate', interaction)

    await flush()
    await flush()

    assert.equal(calls.reply.length, 1)
    assert.equal(calls.followUp.length, 0)
  })

  test('usa followUp quando a interação já foi deferida', async () => {
    const { client } = createDependencies(new Error('falha'))

    const { interaction, calls } = createInteraction({
      deferred: true
    })

    client.emit('interactionCreate', interaction)

    await flush()
    await flush()

    assert.equal(calls.reply.length, 0)
    assert.equal(calls.followUp.length, 1)
  })
})
