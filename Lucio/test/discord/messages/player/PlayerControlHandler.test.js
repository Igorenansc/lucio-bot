import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { PermissionFlagsBits } from 'discord.js'

import PlayerControlHandler from '../../../../src/discord/messages/player/PlayerControlHandler.js'

import { createButtonInteraction } from '../../../helpers/discord/createButtonInteraction.js'

import { createPlayerMock } from '../../../helpers/player/createPlayerMock.js'

import { createPlayerManagerMock } from '../../../helpers/player/createPlayerManagerMock.js'

function createDependencies (player = createPlayerMock()) {
  const playerManager = createPlayerManagerMock(player)

  const playerMessageController = {
    calls: {
      recreate: []
    },

    async recreate (guildId) {
      this.calls.recreate.push(guildId)
    }
  }

  const queueMessageService = {
    calls: [],

    build (targetPlayer) {
      this.calls.push(targetPlayer)

      return {
        content: 'queue-message'
      }
    }
  }

  const handler = new PlayerControlHandler({
    playerManager,
    playerMessageController,
    queueMessageService
  })

  return {
    handler,
    player,
    playerManager,
    playerMessageController,
    queueMessageService
  }
}

describe('PlayerControlHandler', () => {
  test('pause/resume pausa quando tocando', async () => {
    const player = createPlayerMock({
      paused: false
    })

    const { handler } = createDependencies(player)

    const { interaction } = createButtonInteraction({
      customId: 'music_play_pause'
    })

    await handler.execute(interaction)

    assert.equal(player.calls.pause, 1)
  })

  test('skip chama player.skip', async () => {
    const { handler, player } = createDependencies()

    const { interaction } = createButtonInteraction({
      customId: 'music_skip'
    })

    await handler.execute(interaction)

    assert.equal(player.calls.skip, 1)
  })

  test('volume up aumenta em 25%', async () => {
    const volume = 50

    const player = createPlayerMock({
      volume
    })

    const { handler } = createDependencies(player)

    const { interaction } = createButtonInteraction({
      customId: 'music_volume_up'
    })

    await handler.execute(interaction)

    assert.deepEqual(player.calls.setVolume, [Math.round(volume * 1.25)])
  })

  test('volume up diminui em 20%', async () => {
    const volume = 50

    const player = createPlayerMock({
      volume
    })

    const { handler } = createDependencies(player)

    const { interaction } = createButtonInteraction({
      customId: 'music_volume_down'
    })

    await handler.execute(interaction)

    assert.deepEqual(player.calls.setVolume, [Math.round(volume * 0.8)])
  })

  test('refresh recria mensagem', async () => {
    const { handler, playerMessageController } = createDependencies()

    const { interaction } = createButtonInteraction({
      customId: 'music_refresh'
    })

    await handler.execute(interaction)

    assert.deepEqual(playerMessageController.calls.recreate, ['guild-1'])
  })

  test('queue usa QueueMessageService', async () => {
    const { handler, queueMessageService } = createDependencies()

    const { interaction, calls } = createButtonInteraction({
      customId: 'music_queue'
    })

    await handler.execute(interaction)

    assert.equal(queueMessageService.calls.length, 1)

    assert.equal(calls.reply[0].content, 'queue-message')
  })
})

describe('PlayerControlHandler - canal', () => {
  const protectedButtons = [
    'music_play_pause',
    'music_stop',
    'music_skip',
    'music_volume_up',
    'music_volume_down'
  ]

  for (const customId of protectedButtons) {
    test(`${customId} exige mesma call`, async () => {
      const { handler } = createDependencies()

      const { interaction, calls } = createButtonInteraction({
        customId,
        userChannelId: 'voice-2',
        botChannelId: 'voice-1'
      })

      await handler.execute(interaction)

      assert.equal(
        calls.reply[0].content,
        'Você precisa estar no mesmo canal de voz que eu.'
      )
    })
  }

  for (const customId of ['music_queue', 'music_refresh']) {
    test(`${customId} funciona fora da call`, async () => {
      const { handler } = createDependencies()

      const { interaction, calls } = createButtonInteraction({
        customId,

        userChannelId: null
      })

      await handler.execute(interaction)

      /*
       * Se a validação fosse aplicada,
       * haveria uma resposta de erro.
       *
       * music_queue responde normalmente;
       * refresh usa deferUpdate.
       */
      const blocked = calls.reply.some(
        payload => payload.content === 'Você precisa estar em um canal de voz.'
      )

      assert.equal(blocked, false)
    })
  }
})

describe('PlayerControlHandler - permissões de texto', () => {
  test('music_queue não cria queue sem EmbedLinks', async () => {
    const { handler, queueMessageService } = createDependencies()

    const { interaction, calls } = createButtonInteraction({
      customId: 'music_queue',

      textPermissionsDenied: [PermissionFlagsBits.EmbedLinks]
    })

    await handler.execute(interaction)

    assert.equal(queueMessageService.calls.length, 0)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para enviar embeds neste canal.'
    )
  })

  test('music_refresh não recria PlayerMessage sem SendMessages', async () => {
    const { handler, playerMessageController } = createDependencies()

    const { interaction, calls } = createButtonInteraction({
      customId: 'music_refresh',

      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    await handler.execute(interaction)

    assert.equal(playerMessageController.calls.recreate.length, 0)

    assert.equal(calls.deferUpdate, 0)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para enviar mensagens neste canal.'
    )
  })

  test('music_skip não depende das permissões de texto', async () => {
    const { handler, player } = createDependencies()

    const { interaction } = createButtonInteraction({
      customId: 'music_skip',

      textPermissionsDenied: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ]
    })

    await handler.execute(interaction)

    assert.equal(player.calls.skip, 1)
  })

  test('music_stop não depende das permissões de texto', async () => {
    const { handler, playerManager } = createDependencies()

    const { interaction } = createButtonInteraction({
      customId: 'music_stop',

      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    await handler.execute(interaction)

    assert.deepEqual(playerManager.calls.destroy, ['guild-1'])
  })
})
