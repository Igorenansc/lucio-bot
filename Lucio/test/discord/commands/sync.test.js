import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { execute } from '../../../src/discord/commands/sync.js'

import OwnerService from '../../../src/discord/permissions/OwnerService.js'

import { createCommandInteraction } from '../../helpers/discord/createCommandInteraction.js'

function createCommandManager (count = 2) {
  return {
    calls: 0,

    getCommandData () {
      this.calls++

      return Array.from({ length: count }, (_, index) => ({
        name: `command-${index}`
      }))
    }
  }
}

function createRegisterCommands () {
  const calls = []

  return {
    calls,

    async register (commandManager) {
      calls.push(commandManager)
    }
  }
}

describe('/sync', () => {
  test('rejeita usuário que não é dono', async () => {
    const ownerService = new OwnerService({
      owners: ['outro-usuario']
    })

    const commandManager = createCommandManager()

    const registrar = createRegisterCommands()

    const { interaction, calls } = createCommandInteraction()

    await execute(interaction, {
      ownerService,
      commandManager,
      registerCommands: registrar.register
    })

    assert.equal(
      calls.reply[0].content,
      'Você não tem permissão para usar este comando.'
    )

    assert.equal(calls.deferReply, 0)

    assert.equal(registrar.calls.length, 0)
  })

  test('dono ressincroniza os comandos', async () => {
    const ownerService = new OwnerService({
      owners: ['user-1']
    })

    const commandManager = createCommandManager(3)

    const registrar = createRegisterCommands()

    const { interaction, calls } = createCommandInteraction()

    await execute(interaction, {
      ownerService,
      commandManager,
      registerCommands: registrar.register
    })

    assert.deepEqual(registrar.calls, [commandManager])

    assert.equal(calls.deferReply, 1)

    assert.equal(
      calls.editReply[0],
      'Slash commands sincronizados: **3** comando(s).'
    )
  })

  test('responde erro quando o registro falha', async () => {
    const ownerService = new OwnerService({
      owners: ['user-1']
    })

    const commandManager = createCommandManager()

    const { interaction, calls } = createCommandInteraction()

    await execute(interaction, {
      ownerService,
      commandManager,

      async registerCommands () {
        throw new Error('Falha simulada')
      }
    })

    assert.equal(calls.deferReply, 1)

    assert.equal(
      calls.editReply[0],
      'Não foi possível sincronizar os slash commands.'
    )
  })
})
