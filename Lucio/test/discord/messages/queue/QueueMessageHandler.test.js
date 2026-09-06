import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { PermissionFlagsBits } from 'discord.js'

import QueueMessageHandler from '../../../../src/discord/messages/queue/QueueMessageHandler.js'

import { createPlayerMock } from '../../../helpers/player/createPlayerMock.js'

import { createPlayerManagerMock } from '../../../helpers/player/createPlayerManagerMock.js'

import { createPermissions } from '../../../helpers/discord/createPermissions.js'

function createQueueInteraction ({
  customId,
  selectedValue = null,
  textPermissionsDenied = []
} = {}) {
  const calls = {
    reply: [],
    update: [],
    deferUpdate: 0,
    delete: 0,
    send: []
  }

  const botMember = {}

  const guild = {
    members: {
      me: botMember
    }
  }

  const channel = {
    guild,

    permissionsFor (member) {
      assert.equal(member, botMember)

      return createPermissions(textPermissionsDenied)
    },

    async send (payload) {
      calls.send.push(payload)
    }
  }

  const interaction = {
    guildId: 'guild-1',

    guild,

    channel,

    customId,

    values: selectedValue !== null ? [selectedValue] : [],

    message: {
      async delete () {
        calls.delete++
      }
    },

    async reply (payload) {
      calls.reply.push(payload)
    },

    async update (payload) {
      calls.update.push(payload)
    },

    async deferUpdate () {
      calls.deferUpdate++
    },

    isButton () {
      return customId !== 'queue_message_page'
    },

    isStringSelectMenu () {
      return customId === 'queue_message_page'
    }
  }

  return {
    interaction,
    calls
  }
}

function createQueueMessageService () {
  const calls = []

  return {
    calls,

    build (player, index = 0) {
      calls.push({
        player,
        index
      })

      return {
        content: `queue:${index}`
      }
    }
  }
}

function createHandler (player = createPlayerMock()) {
  const playerManager = createPlayerManagerMock(player)

  const queueMessageService = createQueueMessageService()

  const handler = new QueueMessageHandler({
    playerManager,
    queueMessageService
  })

  return {
    handler,
    player,
    playerManager,
    queueMessageService
  }
}

describe('QueueMessageHandler', () => {
  test('previous volta 10 posições', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_previous:20'
    })

    await handler.execute(interaction)

    assert.equal(calls.update.length, 1)

    assert.equal(queueMessageService.calls[0].index, 10)
  })

  test('previous nunca usa índice negativo', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction } = createQueueInteraction({
      customId: 'queue_message_previous:0'
    })

    await handler.execute(interaction)

    assert.equal(queueMessageService.calls[0].index, 0)
  })

  test('next avança 10 posições', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_next:10'
    })

    await handler.execute(interaction)

    assert.equal(calls.update.length, 1)

    assert.equal(queueMessageService.calls[0].index, 20)
  })

  test('page display apenas atualiza a mensagem atual', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_page_display:20'
    })

    await handler.execute(interaction)

    assert.equal(calls.update.length, 1)

    assert.equal(calls.delete, 0)

    assert.equal(calls.send.length, 0)

    assert.equal(queueMessageService.calls[0].index, 20)
  })

  test('select menu abre diretamente a página selecionada', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_page',
      selectedValue: '30'
    })

    await handler.execute(interaction)

    assert.equal(calls.update.length, 1)

    assert.equal(queueMessageService.calls[0].index, 30)
  })

  test('refresh apaga e recria a QueueMessage', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_refresh:10'
    })

    await handler.execute(interaction)

    assert.equal(calls.deferUpdate, 1)

    assert.equal(calls.delete, 1)

    assert.equal(calls.send.length, 1)

    assert.equal(queueMessageService.calls[0].index, 10)

    assert.deepEqual(calls.send[0], {
      content: 'queue:10'
    })
  })

  test('remove apaga a mensagem sem recriar', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_remove'
    })

    await handler.execute(interaction)

    assert.equal(calls.deferUpdate, 1)

    assert.equal(calls.delete, 1)

    assert.equal(calls.send.length, 0)

    assert.equal(queueMessageService.calls.length, 0)
  })
})

describe('QueueMessageHandler - permissões', () => {
  test('refresh sem SendMessages não apaga a QueueMessage', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_refresh:10',

      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    await handler.execute(interaction)

    assert.equal(calls.deferUpdate, 0)
    assert.equal(calls.delete, 0)
    assert.equal(calls.send.length, 0)

    assert.equal(queueMessageService.calls.length, 0)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para enviar mensagens neste canal.'
    )
  })

  test('next sem EmbedLinks não atualiza a QueueMessage', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_next:0',

      textPermissionsDenied: [PermissionFlagsBits.EmbedLinks]
    })

    await handler.execute(interaction)

    assert.equal(calls.update.length, 0)

    assert.equal(queueMessageService.calls.length, 0)
  })

  test('select sem EmbedLinks não atualiza a QueueMessage', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_page',
      selectedValue: '20',

      textPermissionsDenied: [PermissionFlagsBits.EmbedLinks]
    })

    await handler.execute(interaction)

    assert.equal(calls.update.length, 0)

    assert.equal(queueMessageService.calls.length, 0)
  })

  test('remove continua funcionando sem permissões de texto', async () => {
    const { handler, queueMessageService } = createHandler()

    const { interaction, calls } = createQueueInteraction({
      customId: 'queue_message_remove',

      textPermissionsDenied: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ]
    })

    await handler.execute(interaction)

    assert.equal(calls.deferUpdate, 1)
    assert.equal(calls.delete, 1)

    assert.equal(queueMessageService.calls.length, 0)
  })
})
