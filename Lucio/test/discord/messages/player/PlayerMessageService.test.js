import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { PermissionFlagsBits } from 'discord.js'

import PlayerMessageService from '../../../../src/discord/messages/player/PlayerMessageService.js'

import { createPermissions } from '../../../helpers/discord/createPermissions.js'

import { createTrack } from '../../../helpers/createTrack.js'

function createMessage () {
  const calls = {
    edit: [],
    delete: 0
  }

  return {
    id: 'message-1',

    calls,

    async edit (payload) {
      calls.edit.push(payload)

      return this
    },

    async delete () {
      calls.delete++
    }
  }
}

function createChannel ({ textPermissionsDenied = [] } = {}) {
  const calls = {
    send: []
  }

  const botMember = {}

  const guild = {
    members: {
      me: botMember
    }
  }

  return {
    id: 'text-1',

    guild,

    calls,

    permissionsFor (member) {
      assert.equal(member, botMember)

      return createPermissions(textPermissionsDenied)
    },

    async send (payload) {
      calls.send.push(payload)

      const message = createMessage()

      message.id = `message-${calls.send.length}`

      return message
    }
  }
}

function createPlayer ({ currentTrack = createTrack('A') } = {}) {
  return {
    currentTrack,
    paused: false,
    volume: 50
  }
}

describe('PlayerMessageService', () => {
  test('não envia PlayerMessage sem SendMessages', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel({
      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    const result = await service.createOrUpdate(
      'guild-1',
      channel,
      createPlayer()
    )

    assert.equal(result, null)
    assert.equal(channel.calls.send.length, 0)
  })

  test('não envia PlayerMessage sem EmbedLinks', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel({
      textPermissionsDenied: [PermissionFlagsBits.EmbedLinks]
    })

    const result = await service.createOrUpdate(
      'guild-1',
      channel,
      createPlayer()
    )

    assert.equal(result, null)
    assert.equal(channel.calls.send.length, 0)
  })

  test('recreate sem permissão não apaga a PlayerMessage existente', async () => {
    const service = new PlayerMessageService()

    const allowedChannel = createChannel()

    const player = createPlayer()

    const message = await service.createOrUpdate(
      'guild-1',
      allowedChannel,
      player
    )

    const deniedChannel = createChannel({
      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    const result = await service.recreate('guild-1', deniedChannel, player)

    assert.equal(result, null)

    assert.equal(message.calls.delete, 0)

    assert.equal(deniedChannel.calls.send.length, 0)
  })

  test('continua funcionando quando a permissão volta', async () => {
    const service = new PlayerMessageService()

    const player = createPlayer()

    const deniedChannel = createChannel({
      textPermissionsDenied: [PermissionFlagsBits.SendMessages]
    })

    const firstResult = await service.createOrUpdate(
      'guild-1',
      deniedChannel,
      player
    )

    assert.equal(firstResult, null)

    const allowedChannel = createChannel()

    const secondResult = await service.createOrUpdate(
      'guild-1',
      allowedChannel,
      player
    )

    assert.ok(secondResult)

    assert.equal(allowedChannel.calls.send.length, 1)
  })

  test('cria uma mensagem quando ainda não existe uma armazenada', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    const message = await service.createOrUpdate('guild-1', channel, player)

    assert.equal(channel.calls.send.length, 1)

    assert.equal(message.id, 'message-1')
  })

  test('reutiliza o objeto Message armazenado em updates posteriores', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    const message = await service.createOrUpdate('guild-1', channel, player)

    await service.createOrUpdate('guild-1', channel, player)

    /*
     * Só houve um send.
     *
     * O segundo update usou
     * diretamente message.edit().
     */
    assert.equal(channel.calls.send.length, 1)

    assert.equal(message.calls.edit.length, 1)
  })

  test('não tenta criar mensagem sem currentTrack', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer({
      currentTrack: null
    })

    const result = await service.createOrUpdate('guild-1', channel, player)

    assert.equal(result, null)

    assert.equal(channel.calls.send.length, 0)
  })

  test('cria nova mensagem se a armazenada não puder mais ser editada', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    const firstMessage = await service.createOrUpdate(
      'guild-1',
      channel,
      player
    )

    firstMessage.edit = async () => {
      throw new Error('Unknown Message')
    }

    const secondMessage = await service.createOrUpdate(
      'guild-1',
      channel,
      player
    )

    assert.equal(channel.calls.send.length, 2)

    assert.notEqual(firstMessage, secondMessage)
  })

  test('recreate apaga a antiga e envia uma nova', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    const firstMessage = await service.createOrUpdate(
      'guild-1',
      channel,
      player
    )

    const secondMessage = await service.recreate('guild-1', channel, player)

    assert.equal(firstMessage.calls.delete, 1)

    assert.equal(channel.calls.send.length, 2)

    assert.notEqual(firstMessage, secondMessage)
  })

  test('recreate não envia nova mensagem se player está idle', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    const firstMessage = await service.createOrUpdate(
      'guild-1',
      channel,
      player
    )

    player.currentTrack = null

    const result = await service.recreate('guild-1', channel, player)

    assert.equal(firstMessage.calls.delete, 1)

    assert.equal(result, null)

    assert.equal(channel.calls.send.length, 1)
  })

  test('delete usa diretamente Message.delete', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    const message = await service.createOrUpdate('guild-1', channel, player)

    await service.delete('guild-1')

    assert.equal(message.calls.delete, 1)
  })

  test('delete ignora guild sem mensagem', async () => {
    const service = new PlayerMessageService()

    await assert.doesNotReject(() => service.delete('guild-inexistente'))
  })

  test('delete tolera mensagem removida externamente', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const message = await service.createOrUpdate(
      'guild-1',
      channel,
      createPlayer()
    )

    message.delete = async () => {
      throw new Error('Unknown Message')
    }

    await assert.doesNotReject(() => service.delete('guild-1'))

    /*
     * Uma segunda chamada prova que a
     * referência antiga foi descartada.
     */
    await assert.doesNotReject(() => service.delete('guild-1'))
  })
  test('serializa updates simultâneos e cria apenas uma mensagem', async () => {
    const service = new PlayerMessageService()

    const channel = createChannel()

    const player = createPlayer()

    await Promise.all([
      service.createOrUpdate('guild-1', channel, player),
      service.createOrUpdate('guild-1', channel, player),
      service.createOrUpdate('guild-1', channel, player)
    ])

    assert.equal(channel.calls.send.length, 1)
  })
})
