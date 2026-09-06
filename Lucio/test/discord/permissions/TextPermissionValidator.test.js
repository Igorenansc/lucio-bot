import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { PermissionFlagsBits } from 'discord.js'

import TextPermissionValidator from '../../../src/discord/permissions/TextPermissionValidator.js'

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

describe('TextPermissionValidator', () => {
  test('aceita quando todas as permissões estão disponíveis', () => {
    const { botMember, channel } = createEnvironment()

    const result = TextPermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, true)
    assert.equal(result.message, null)
  })

  test('rejeita quando não pode visualizar o canal', () => {
    const { botMember, channel } = createEnvironment([
      PermissionFlagsBits.ViewChannel
    ])

    const result = TextPermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Não tenho permissão para visualizar este canal.'
    )
  })

  test('rejeita quando não pode enviar mensagens', () => {
    const { botMember, channel } = createEnvironment([
      PermissionFlagsBits.SendMessages
    ])

    const result = TextPermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Não tenho permissão para enviar mensagens neste canal.'
    )
  })

  test('rejeita quando não pode enviar embeds', () => {
    const { botMember, channel } = createEnvironment([
      PermissionFlagsBits.EmbedLinks
    ])

    const result = TextPermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)

    assert.equal(
      result.message,
      'Não tenho permissão para enviar embeds neste canal.'
    )
  })

  test('trata permissionsFor retornando null', () => {
    const botMember = {}

    const channel = {
      permissionsFor () {
        return null
      }
    }

    const result = TextPermissionValidator.validate(botMember, channel)

    assert.equal(result.valid, false)
  })
})
