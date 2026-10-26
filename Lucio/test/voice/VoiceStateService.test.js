import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import VoiceStateService from '../../src/voice/VoiceStateService.js'

const BOT_ID = 'bot-1'

const guild = {
  id: 'guild-1'
}

function createPlayerManager () {
  const calls = {
    move: [],
    destroy: []
  }

  return {
    calls,

    handleVoiceMove (guildId, channelId) {
      calls.move.push({
        guildId,
        channelId
      })

      return true
    },

    async destroy (guildId, reason) {
      calls.destroy.push({
        guildId,
        reason
      })

      return true
    }
  }
}

function createVoiceIdleService () {
  const calls = {
    handle: [],
    cancel: []
  }

  return {
    calls,

    handle (oldState, newState) {
      calls.handle.push({
        oldState,
        newState
      })
    },

    cancel (guildId) {
      calls.cancel.push(guildId)
    }
  }
}

function createService () {
  const playerManager = createPlayerManager()

  const voiceIdleService = createVoiceIdleService()

  const service = new VoiceStateService({
    client: {
      user: {
        id: BOT_ID
      }
    },

    playerManager,
    voiceIdleService
  })

  return {
    service,
    playerManager,
    voiceIdleService
  }
}

function createState (id, channelId) {
  return {
    id,
    channelId,
    guild
  }
}

describe('VoiceStateService', () => {
  test('bot movido mantém player e atualiza a posição', async () => {
    const { service, playerManager, voiceIdleService } = createService()

    await service.handle(
      createState(BOT_ID, 'voice-1'),
      createState(BOT_ID, 'voice-2')
    )

    assert.deepEqual(playerManager.calls.move, [
      {
        guildId: 'guild-1',
        channelId: 'voice-2'
      }
    ])

    assert.equal(playerManager.calls.destroy.length, 0)

    assert.equal(voiceIdleService.calls.handle.length, 1)

    assert.equal(voiceIdleService.calls.cancel.length, 0)
  })

  test('bot desconectado destrói o player e cancela o idle', async () => {
    const { service, playerManager, voiceIdleService } = createService()

    await service.handle(
      createState(BOT_ID, 'voice-1'),
      createState(BOT_ID, null)
    )

    assert.deepEqual(playerManager.calls.destroy, [
      {
        guildId: 'guild-1',
        reason: 'voice-disconnected'
      }
    ])

    assert.deepEqual(voiceIdleService.calls.cancel, ['guild-1'])

    assert.equal(voiceIdleService.calls.handle.length, 0)
  })

  test('bot entrando no canal apenas atualiza a posição', async () => {
    const { service, playerManager, voiceIdleService } = createService()

    await service.handle(
      createState(BOT_ID, null),
      createState(BOT_ID, 'voice-2')
    )

    assert.deepEqual(playerManager.calls.move, [
      {
        guildId: 'guild-1',
        channelId: 'voice-2'
      }
    ])

    assert.equal(playerManager.calls.destroy.length, 0)

    assert.equal(voiceIdleService.calls.handle.length, 1)
  })

  test('mute/deafen no mesmo canal não destrói o player', async () => {
    const { service, playerManager, voiceIdleService } = createService()

    await service.handle(
      createState(BOT_ID, 'voice-1'),
      createState(BOT_ID, 'voice-1')
    )

    assert.equal(playerManager.calls.destroy.length, 0)

    assert.equal(voiceIdleService.calls.handle.length, 1)
  })

  test('evento de outro membro é delegado ao VoiceIdleService', async () => {
    const { service, playerManager, voiceIdleService } = createService()

    await service.handle(
      createState('user-1', 'voice-1'),
      createState('user-1', 'voice-2')
    )

    assert.equal(voiceIdleService.calls.handle.length, 1)

    assert.equal(playerManager.calls.move.length, 0)

    assert.equal(playerManager.calls.destroy.length, 0)
  })

  test('ignora evento sem guild', async () => {
    const { service, playerManager, voiceIdleService } = createService()

    await service.handle(
      {
        id: BOT_ID,
        channelId: 'voice-1',
        guild: null
      },
      {
        id: BOT_ID,
        channelId: null,
        guild: null
      }
    )

    assert.equal(playerManager.calls.destroy.length, 0)

    assert.equal(voiceIdleService.calls.handle.length, 0)
  })
})
