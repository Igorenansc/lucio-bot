import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import VoiceChannelValidator from '../../src/voice/VoiceChannelValidator.js'

function createInteraction ({
  userChannelId = 'voice-1',
  botChannelId = 'voice-1'
} = {}) {
  const member = {
    voice: {
      channel: userChannelId
        ? {
            id: userChannelId
          }
        : null
    }
  }

  return {
    user: {
      id: 'user-1'
    },

    guild: {
      members: {
        me: {
          voice: {
            channelId: botChannelId
          }
        },

        async fetch () {
          return member
        }
      }
    }
  }
}

describe('VoiceChannelValidator', () => {
  test('userInVoice rejeita usuário fora da call', async () => {
    const interaction = createInteraction({
      userChannelId: null
    })

    const result = await VoiceChannelValidator.userInVoice(interaction)

    assert.equal(result.valid, false)

    assert.equal(result.message, 'Você precisa estar em um canal de voz.')
  })

  test('userInVoice retorna canal do usuário', async () => {
    const interaction = createInteraction({
      userChannelId: 'voice-7'
    })

    const result = await VoiceChannelValidator.userInVoice(interaction)

    assert.equal(result.valid, true)

    assert.equal(result.channel.id, 'voice-7')
  })

  test('sameChannel permite usuário na mesma call do bot', async () => {
    const interaction = createInteraction({
      userChannelId: 'voice-1',
      botChannelId: 'voice-1'
    })

    const result = await VoiceChannelValidator.sameChannel(interaction)

    assert.equal(result.valid, true)

    assert.equal(result.channel.id, 'voice-1')
  })

  test('sameChannel rejeita usuário em outra call', async () => {
    const interaction = createInteraction({
      userChannelId: 'voice-2',
      botChannelId: 'voice-1'
    })

    const result = await VoiceChannelValidator.sameChannel(interaction)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Você precisa estar no mesmo canal de voz que eu.'
    )
  })

  test('sameChannel rejeita quando o bot não está conectado', async () => {
    const interaction = createInteraction({
      userChannelId: 'voice-1',
      botChannelId: null
    })

    const result = await VoiceChannelValidator.sameChannel(interaction)

    assert.equal(result.valid, false)

    assert.equal(result.message, 'Eu não estou conectado a um canal de voz.')
  })

  test('sameChannel mantém prioridade do erro de usuário fora da call', async () => {
    const interaction = createInteraction({
      userChannelId: null,
      botChannelId: null
    })

    const result = await VoiceChannelValidator.sameChannel(interaction)

    assert.equal(result.valid, false)

    assert.equal(result.message, 'Você precisa estar em um canal de voz.')
  })
})
