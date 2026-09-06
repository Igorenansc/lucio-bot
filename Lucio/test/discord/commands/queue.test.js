import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { PermissionFlagsBits } from 'discord.js'

import { execute } from '../../../src/discord/commands/queue.js'

import { createCommandInteraction } from '../../helpers/discord/createCommandInteraction.js'

import { createPlayerMock } from '../../helpers/player/createPlayerMock.js'

import { createPlayerManagerMock } from '../../helpers/player/createPlayerManagerMock.js'

function createQueueMessageService () {
  const calls = []

  return {
    calls,

    build (player) {
      calls.push(player)

      return {
        content: 'queue-message'
      }
    }
  }
}

describe('/queue', () => {
  test('responde quando não existe música tocando', async () => {
    const playerManager = createPlayerManagerMock(null)

    const queueMessageService = createQueueMessageService()

    const { interaction, calls } = createCommandInteraction()

    await execute(interaction, {
      playerManager,
      queueMessageService
    })

    assert.equal(calls.reply[0].content, 'Não há nenhuma música tocando.')

    assert.equal(queueMessageService.calls.length, 0)
  })

  test('envia QueueMessage quando possui permissões', async () => {
    const player = createPlayerMock()

    const playerManager = createPlayerManagerMock(player)

    const queueMessageService = createQueueMessageService()

    const { interaction, calls } = createCommandInteraction()

    await execute(interaction, {
      playerManager,
      queueMessageService
    })

    assert.equal(queueMessageService.calls.length, 1)

    assert.deepEqual(calls.reply[0], {
      content: 'queue-message'
    })
  })

  test('não constrói QueueMessage sem SendMessages', async () => {
    const player = createPlayerMock()

    const playerManager = createPlayerManagerMock(player)

    const queueMessageService = createQueueMessageService()

    const { interaction, calls } = createCommandInteraction({
      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    await execute(interaction, {
      playerManager,
      queueMessageService
    })

    assert.equal(queueMessageService.calls.length, 0)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para enviar mensagens neste canal.'
    )
  })

  test('não constrói QueueMessage sem EmbedLinks', async () => {
    const player = createPlayerMock()

    const playerManager = createPlayerManagerMock(player)

    const queueMessageService = createQueueMessageService()

    const { interaction, calls } = createCommandInteraction({
      textPermissionsDenied: [PermissionFlagsBits.EmbedLinks]
    })

    await execute(interaction, {
      playerManager,
      queueMessageService
    })

    assert.equal(queueMessageService.calls.length, 0)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para enviar embeds neste canal.'
    )
  })
})
