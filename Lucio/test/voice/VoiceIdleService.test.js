import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import VoiceIdleService from '../../src/voice/VoiceIdleService.js'

import { createPlayerManagerMock } from '../helpers/player/createPlayerManagerMock.js'

import {
  createVoiceEnvironment,
  createVoiceState
} from '../helpers/voice/createVoiceEnvironment.js'

async function flushPromises () {
  await Promise.resolve()
  await Promise.resolve()
}

describe('VoiceIdleService', () => {
  test('ignora evento quando não existe player', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock(null)

    const { guild } = createVoiceEnvironment({ humans: 0, bots: 1 })

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.handle(
      createVoiceState(guild, 'voice-1'),
      createVoiceState(guild, null)
    )

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 0)
  })

  test('ignora evento de outro canal', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const { guild } = createVoiceEnvironment({
      channelId: 'voice-1'
    })

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.handle(
      createVoiceState(guild, 'voice-2'),
      createVoiceState(guild, 'voice-3')
    )

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 0)
  })

  test('não agenda desconexão enquanto houver humano', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const { guild } = createVoiceEnvironment({ humans: 1, bots: 1 })

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.handle(
      createVoiceState(guild, 'voice-1'),
      createVoiceState(guild, null)
    )

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 0)
  })

  test('destrói player quando ficam apenas bots', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const { guild } = createVoiceEnvironment({ humans: 0, bots: 2 })

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.handle(
      createVoiceState(guild, 'voice-1'),
      createVoiceState(guild, null)
    )

    assert.equal(playerManager.calls.destroy.length, 0)

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.deepEqual(playerManager.calls.destroy, ['guild-1'])
  })

  test('cancela timer quando humano retorna', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const environment = createVoiceEnvironment({ humans: 0, bots: 1 })

    const { guild } = environment

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.handle(
      createVoiceState(guild, 'voice-1'),

      createVoiceState(guild, null)
    )

    t.mock.timers.tick(10_000)

    environment.addHuman()

    service.handle(
      createVoiceState(guild, null),

      createVoiceState(guild, 'voice-1')
    )

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 0)
  })

  test('verifica novamente o canal antes de destruir', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const environment = createVoiceEnvironment({ humans: 0, bots: 1 })

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.schedule(environment.guild)

    /*
     * Simula alguém entrando sem
     * disparar voiceStateUpdate.
     */
    environment.addHuman()

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 0)
  })

  test('não agenda mais de um timer para mesma guild', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const { guild } = createVoiceEnvironment({ humans: 0 })

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    t.after(() => service.destroy())

    service.schedule(guild)
    service.schedule(guild)
    service.schedule(guild)

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 1)
  })

  test('destroy cancela timers pendentes', async t => {
    t.mock.timers.enable({
      apis: ['setTimeout']
    })

    const playerManager = createPlayerManagerMock({})

    const { guild } = createVoiceEnvironment()

    const service = new VoiceIdleService({
      playerManager,
      timeout: 60_000
    })

    service.schedule(guild)

    service.destroy()

    t.mock.timers.tick(60_000)

    await flushPromises()

    assert.equal(playerManager.calls.destroy.length, 0)
  })
})
