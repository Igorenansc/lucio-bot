import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import PlayerManager from '../../../src/music/player/PlayerManager.js'

import MockEngine from '../../helpers/MockEngine.js'

import { createTrack } from '../../helpers/createTrack.js'

const GUILD_ID = 'guild-1'

function createShoukaku () {
  const connections = new Map()

  const players = new Map()

  const calls = {
    join: [],
    leave: []
  }

  return {
    connections,
    players,
    calls,

    async joinVoiceChannel (options) {
      calls.join.push(options)

      connections.set(options.guildId, {
        channelId: options.channelId
      })

      const engine = new MockEngine()

      engine.guildId = options.guildId

      players.set(options.guildId, engine)

      return engine
    },

    async leaveVoiceChannel (guildId) {
      calls.leave.push(guildId)

      connections.delete(guildId)

      players.delete(guildId)
    }
  }
}

function createPlayerMessageController () {
  const calls = {
    bind: [],
    unbind: []
  }

  return {
    calls,

    bind (payload) {
      calls.bind.push(payload)
    },

    unbind (guildId) {
      calls.unbind.push(guildId)
    }
  }
}

function createManager (
  shoukaku,
  { voiceCloseGraceMs = 1_000, nodeDownGraceMs = 60_000 } = {}
) {
  const playerMessageController = createPlayerMessageController()

  const manager = new PlayerManager(
    shoukaku,
    {},
    playerMessageController,
    {
      async resolve (track) {
        return track
      }
    },
    {
      voiceCloseGraceMs,
      watchdogIntervalMs: 60_000,
      nodeDownGraceMs
    }
  )

  return {
    manager,
    playerMessageController
  }
}

function createOptions () {
  return {
    guildId: GUILD_ID,
    channelId: 'voice-1',
    textChannel: {
      id: 'text-1'
    },
    shardId: 0
  }
}

async function flush (times = 2) {
  for (let index = 0; index < times; index++) {
    await new Promise(resolve => setImmediate(resolve))
  }
}

describe('PlayerManager', () => {
  test('cria player e vincula o painel', async () => {
    const shoukaku = createShoukaku()

    const { manager, playerMessageController } = createManager(shoukaku)

    const player = await manager.create(createOptions())

    assert.equal(manager.players.get(GUILD_ID), player)

    assert.equal(player.voiceChannelId, 'voice-1')

    assert.equal(shoukaku.calls.join.length, 1)

    assert.equal(playerMessageController.calls.bind.length, 1)

    assert.equal(manager.isHealthy(GUILD_ID), true)
  })

  test('movimento preserva fila, faixa atual e painel', async () => {
    const shoukaku = createShoukaku()

    const { manager, playerMessageController } = createManager(shoukaku)

    const player = await manager.create(createOptions())

    await player.enqueue(createTrack('A'))

    shoukaku.connections.get(GUILD_ID).channelId = 'voice-2'

    const moved = manager.handleVoiceMove(GUILD_ID, 'voice-2')

    assert.equal(moved, true)

    assert.equal(player.voiceChannelId, 'voice-2')

    assert.equal(player.currentTrack.info.identifier, 'A')

    assert.equal(player.queue.size, 0)

    assert.equal(playerMessageController.calls.unbind.length, 0)
  })

  test('destroy limpa o Map e sai do canal', async () => {
    const shoukaku = createShoukaku()

    const { manager, playerMessageController } = createManager(shoukaku)

    await manager.create(createOptions())

    const destroyed = await manager.destroy(GUILD_ID, 'test')

    assert.equal(destroyed, true)

    assert.equal(manager.players.has(GUILD_ID), false)

    assert.deepEqual(shoukaku.calls.leave, [GUILD_ID])

    assert.deepEqual(playerMessageController.calls.unbind, [GUILD_ID])
  })

  test('destroy limpa o estado mesmo se player.stop falhar', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    await manager.create(createOptions())

    shoukaku.players.get(GUILD_ID).stopTrack = async () => {
      throw new Error('node offline')
    }

    await manager.destroy(GUILD_ID, 'test')

    assert.equal(manager.players.has(GUILD_ID), false)

    assert.deepEqual(shoukaku.calls.leave, [GUILD_ID])
  })

  test('destroy é idempotente em chamadas concorrentes', async () => {
    const shoukaku = createShoukaku()

    const { manager, playerMessageController } = createManager(shoukaku)

    await manager.create(createOptions())

    const results = await Promise.all([
      manager.destroy(GUILD_ID, 'first'),
      manager.destroy(GUILD_ID, 'second')
    ])

    assert.equal(manager.players.size, 0)

    assert.equal(results[0], true)

    assert.equal(results[1], false)

    assert.equal(shoukaku.calls.leave.length, 1)

    assert.equal(playerMessageController.calls.unbind.length, 1)
  })

  test('create substitui um player fantasma', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    const original = await manager.create(createOptions())

    shoukaku.connections.get(GUILD_ID).channelId = null

    const replacement = await manager.create(createOptions())

    assert.notEqual(replacement, original)

    assert.equal(manager.players.get(GUILD_ID), replacement)

    assert.equal(shoukaku.calls.join.length, 2)

    assert.equal(shoukaku.calls.leave.length, 1)
  })

  test('get devolve null e agenda limpeza para player inconsistente', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    await manager.create(createOptions())

    shoukaku.connections.get(GUILD_ID).channelId = null

    assert.equal(manager.get(GUILD_ID), null)

    await flush()

    assert.equal(manager.players.has(GUILD_ID), false)
  })

  test('reconcile limpa conexão órfã sem player', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    shoukaku.connections.set(GUILD_ID, {
      channelId: null
    })

    const player = await manager.reconcile(GUILD_ID)

    assert.equal(player, null)

    assert.deepEqual(shoukaku.calls.leave, [GUILD_ID])
  })

  test('reconcile atualiza o canal de um player saudável', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    const player = await manager.create(createOptions())

    shoukaku.connections.get(GUILD_ID).channelId = 'voice-2'

    const reconciled = await manager.reconcile(GUILD_ID)

    assert.equal(reconciled, player)

    assert.equal(player.voiceChannelId, 'voice-2')
  })

  test('closed com canal ainda presente mantém o player', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku, {
      voiceCloseGraceMs: 1_000
    })

    const player = await manager.create(createOptions())

    shoukaku.connections.get(GUILD_ID).channelId = 'voice-2'

    shoukaku.players.get(GUILD_ID).emit('closed', {
      code: 4006,
      reason: 'move',
      byRemote: true
    })

    t.mock.timers.tick(1_000)

    await flush()

    assert.equal(manager.players.get(GUILD_ID), player)

    assert.equal(player.voiceChannelId, 'voice-2')

    assert.equal(shoukaku.calls.leave.length, 0)
  })

  test('closed sem canal destrói o player', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku, {
      voiceCloseGraceMs: 1_000
    })

    await manager.create(createOptions())

    shoukaku.connections.get(GUILD_ID).channelId = null

    shoukaku.players.get(GUILD_ID).emit('closed', {
      code: 4014,
      reason: 'disconnected',
      byRemote: true
    })

    t.mock.timers.tick(1_000)

    await flush()

    assert.equal(manager.players.has(GUILD_ID), false)

    assert.deepEqual(shoukaku.calls.leave, [GUILD_ID])
  })

  test('sweep destrói player sem conexão saudável', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    await manager.create(createOptions())

    shoukaku.connections.get(GUILD_ID).channelId = null

    await manager.sweep()

    assert.equal(manager.players.has(GUILD_ID), false)

    assert.deepEqual(shoukaku.calls.leave, [GUILD_ID])
  })

  test('watchdog destrói player com node desconectado após grace', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku, {
      nodeDownGraceMs: 0
    })

    await manager.create(createOptions())

    shoukaku.players.get(GUILD_ID).node = {
      state: 0
    }

    await manager.sweep()

    assert.equal(manager.players.has(GUILD_ID), false)

    assert.deepEqual(shoukaku.calls.leave, [GUILD_ID])
  })

  test('volume persiste entre players da mesma guild', async () => {
    const shoukaku = createShoukaku()

    const { manager } = createManager(shoukaku)

    const first = await manager.create(createOptions())

    await first.setVolume(42)

    await manager.destroy(GUILD_ID, 'test-volume')

    const second = await manager.create(createOptions())

    assert.equal(second.volume, 42)

    assert.equal(shoukaku.players.get(GUILD_ID).volume, 42)
  })
})
