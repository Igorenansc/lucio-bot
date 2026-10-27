import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import InteractionRouter from '../../../src/discord/interactions/InteractionRouter.js'

function createDependencies () {
  const calls = {
    autocomplete: [],
    command: [],
    player: [],
    queue: []
  }

  const commandManager = {
    async executeAutocomplete (interaction) {
      calls.autocomplete.push(interaction)
    },

    async execute (interaction) {
      calls.command.push(interaction)
    }
  }

  const playerControlHandler = {
    async execute (interaction) {
      calls.player.push(interaction)
    }
  }

  const queueMessageHandler = {
    async execute (interaction) {
      calls.queue.push(interaction)
    }
  }

  return {
    calls,
    router: new InteractionRouter({
      commandManager,
      playerControlHandler,
      queueMessageHandler
    })
  }
}

function createInteraction (kind, customId = null) {
  return {
    customId,
    isAutocomplete: () => kind === 'autocomplete',
    isChatInputCommand: () => kind === 'command',
    isButton: () => kind === 'button',
    isStringSelectMenu: () => kind === 'select'
  }
}

describe('InteractionRouter', () => {
  test('roteia autocomplete para o CommandManager', async () => {
    const { router, calls } = createDependencies()

    await router.handle(createInteraction('autocomplete'))

    assert.equal(calls.autocomplete.length, 1)
  })

  test('roteia chat input para o CommandManager', async () => {
    const { router, calls } = createDependencies()

    await router.handle(createInteraction('command'))

    assert.equal(calls.command.length, 1)
  })

  test('roteia botão music_ para o PlayerControlHandler', async () => {
    const { router, calls } = createDependencies()

    await router.handle(createInteraction('button', 'music_skip'))

    assert.equal(calls.player.length, 1)
  })

  test('roteia botão queue_message_ para o QueueMessageHandler', async () => {
    const { router, calls } = createDependencies()

    await router.handle(
      createInteraction('button', 'queue_message_next:10')
    )

    assert.equal(calls.queue.length, 1)
  })

  test('roteia select queue_message_ para o QueueMessageHandler', async () => {
    const { router, calls } = createDependencies()

    await router.handle(
      createInteraction('select', 'queue_message_page')
    )

    assert.equal(calls.queue.length, 1)
  })

  test('ignora botão desconhecido', async () => {
    const { router, calls } = createDependencies()

    await router.handle(createInteraction('button', 'unknown'))

    assert.equal(calls.player.length, 0)
    assert.equal(calls.queue.length, 0)
  })

  test('ignora select desconhecido', async () => {
    const { router, calls } = createDependencies()

    await router.handle(createInteraction('select', 'unknown'))

    assert.equal(calls.queue.length, 0)
  })

  test('ignora interação de outro tipo', async () => {
    const { router, calls } = createDependencies()

    await router.handle(createInteraction('modal'))

    assert.equal(calls.command.length, 0)
    assert.equal(calls.player.length, 0)
    assert.equal(calls.queue.length, 0)
  })
})
