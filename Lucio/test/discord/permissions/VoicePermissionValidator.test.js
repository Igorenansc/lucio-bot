import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { PermissionFlagsBits } from 'discord.js'

import VoicePermissionValidator from '../../../src/discord/permissions/VoicePermissionValidator.js'

import { createPermissions } from '../../helpers/discord/createPermissions.js'

function createEnvironment (denied = []) {
  const botMember = {}

  const channel = {
    permissionsFor (member) {
      assert.equal(member, botMember)

      return createPermissions(denied)
    }
  }

  return {
    botMember,
    channel
  }
}

describe('VoicePermissionValidator', () => {
  test('aceita quando todas as permissões estão disponíveis', () => {
    const { botMember, channel } = createEnvironment()

    const result = VoicePermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, true)
    assert.equal(result.message, null)
  })

  test('rejeita quando não pode visualizar o canal', () => {
    const { botMember, channel } = createEnvironment([
      PermissionFlagsBits.ViewChannel
    ])

    const result = VoicePermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Não tenho permissão para visualizar esse canal de voz.'
    )
  })

  test('rejeita quando não pode entrar no canal', () => {
    const { botMember, channel } = createEnvironment([
      PermissionFlagsBits.Connect
    ])

    const result = VoicePermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Não tenho permissão para entrar nesse canal de voz.'
    )
  })

  test('rejeita quando não pode falar no canal', () => {
    const { botMember, channel } = createEnvironment([
      PermissionFlagsBits.Speak
    ])

    const result = VoicePermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Não tenho permissão para falar nesse canal de voz.'
    )
  })

  test('trata permissionsFor retornando null', () => {
    const botMember = {}

    const channel = {
      permissionsFor () {
        return null
      }
    }

    const result = VoicePermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)
  })
})
