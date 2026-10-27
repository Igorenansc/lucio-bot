import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import CommandManager from '../../../src/discord/commands/CommandManager.js'

const commandsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/discord/commands'
)

function createCommand (name, { autocomplete = null } = {}) {
  const calls = {
    execute: [],
    autocomplete: []
  }

  const command = {
    calls,

    data: {
      name,

      toJSON () {
        return { name }
      }
    },

    async execute (interaction, context) {
      calls.execute.push({ interaction, context })
    }
  }

  if (autocomplete) {
    command.autocomplete = async (interaction, context) => {
      calls.autocomplete.push({ interaction, context })
    }
  }

  return command
}

describe('CommandManager', () => {
  test('registra e executa um comando com contexto', async () => {
    const manager = new CommandManager({ value: 1 })

    const command = createCommand('test')

    manager.register(command)

    const interaction = { commandName: 'test' }

    await manager.execute(interaction)

    assert.equal(command.calls.execute.length, 1)
    assert.equal(command.calls.execute[0].context.value, 1)
  })

  test('não executa autocomplete quando o comando não define', async () => {
    const manager = new CommandManager()

    manager.register(createCommand('test'))

    await manager.executeAutocomplete({ commandName: 'test' })

    assert.equal(manager.get('test').calls.autocomplete.length, 0)
  })

  test('executa autocomplete quando existe', async () => {
    const manager = new CommandManager({ value: 2 })

    const command = createCommand('test', { autocomplete: true })

    manager.register(command)

    await manager.executeAutocomplete({ commandName: 'test' })

    assert.equal(command.calls.autocomplete.length, 1)
    assert.equal(command.calls.autocomplete[0].context.value, 2)
  })

  test('rejeita comando duplicado', () => {
    const manager = new CommandManager()

    manager.register(createCommand('test'))

    assert.throws(
      () => manager.register(createCommand('test')),
      /já está registrado/
    )
  })

  test('rejeita comando sem data.name ou execute', () => {
    const manager = new CommandManager()

    assert.throws(() => manager.register({ data: {} }), /data.name/)

    assert.throws(
      () => manager.register({ data: { name: 'x' } }),
      /execute/
    )
  })

  test('getCommandData serializa os comandos', () => {
    const manager = new CommandManager()

    manager.register(createCommand('a'))
    manager.register(createCommand('b'))

    assert.deepEqual(manager.getCommandData(), [
      { name: 'a' },
      { name: 'b' }
    ])
  })

  test('carrega os comandos reais do diretório', async () => {
    const manager = new CommandManager()

    await manager.loadFrom(commandsDirectory)

    assert.ok(manager.get('p'))
    assert.ok(manager.get('yt'))
    assert.ok(manager.get('stop'))
    assert.ok(manager.get('sync'))
  })

  test('execute rejeita comando desconhecido', async () => {
    const manager = new CommandManager()

    await assert.rejects(
      () => manager.execute({ commandName: 'missing' }),
      /Comando desconhecido/
    )
  })
})
