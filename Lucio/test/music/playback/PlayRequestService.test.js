import { describe, test } from 'node:test'

import { PermissionFlagsBits } from 'discord.js'

import assert from 'node:assert/strict'

import PlayRequestService from '../../../src/music/playback/PlayRequestService.js'

import { createTrack } from '../../helpers/createTrack.js'

import { createCommandInteraction } from '../../helpers/discord/createCommandInteraction.js'

import { createPlayerMock } from '../../helpers/player/createPlayerMock.js'

import { createPlayerManagerMock } from '../../helpers/player/createPlayerManagerMock.js'

function createSearchService (result) {
  const calls = []

  return {
    calls,

    async search (query) {
      calls.push(query)
      return result
    }
  }
}

function createService ({ player = null, searchResult } = {}) {
  const playerManager = createPlayerManagerMock(player)

  const searchService = createSearchService(searchResult)

  const service = new PlayRequestService({
    playerManager,
    searchService
  })

  return {
    service,
    playerManager,
    searchService
  }
}

describe('PlayRequestService', () => {
  test('bloqueia usuário fora de canal de voz quando não existe player', async () => {
    const { interaction, calls } = createCommandInteraction({
      userChannelId: null
    })

    const { service, playerManager, searchService } = createService({
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    const result = await service.execute({
      interaction,
      query: 'get lucky'
    })

    assert.equal(result, false)

    assert.equal(calls.reply.length, 1)

    assert.equal(
      calls.reply[0].content,
      'Você precisa estar em um canal de voz.'
    )

    assert.equal(searchService.calls.length, 0)

    assert.equal(playerManager.calls.create.length, 0)
  })

  test('bloqueia criação do player sem permissão para visualizar a call', async () => {
    const { interaction, calls } = createCommandInteraction({
      voicePermissionsDenied: [PermissionFlagsBits.ViewChannel]
    })

    const { service, playerManager, searchService } = createService({
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    const result = await service.execute({
      interaction,
      query: 'track'
    })

    assert.equal(result, false)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para visualizar esse canal de voz.'
    )

    assert.equal(calls.deferReply, 0)
    assert.equal(searchService.calls.length, 0)
    assert.equal(playerManager.calls.create.length, 0)
  })

  test('bloqueia criação do player sem permissão para entrar na call', async () => {
    const { interaction, calls } = createCommandInteraction({
      voicePermissionsDenied: [PermissionFlagsBits.Connect]
    })

    const { service, playerManager, searchService } = createService({
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    const result = await service.execute({
      interaction,
      query: 'track'
    })

    assert.equal(result, false)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para entrar nesse canal de voz.'
    )

    assert.equal(calls.deferReply, 0)
    assert.equal(searchService.calls.length, 0)
    assert.equal(playerManager.calls.create.length, 0)
  })

  test('bloqueia criação do player sem permissão para falar na call', async () => {
    const { interaction, calls } = createCommandInteraction({
      voicePermissionsDenied: [PermissionFlagsBits.Speak]
    })

    const { service, playerManager, searchService } = createService({
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    const result = await service.execute({
      interaction,
      query: 'track'
    })

    assert.equal(result, false)

    assert.equal(
      calls.reply[0].content,
      'Não tenho permissão para falar nesse canal de voz.'
    )

    assert.equal(calls.deferReply, 0)
    assert.equal(searchService.calls.length, 0)
    assert.equal(playerManager.calls.create.length, 0)
  })

  test('não revalida Connect/Speak quando o player já existe', async () => {
    const player = createPlayerMock()

    const { interaction } = createCommandInteraction({
      voicePermissionsDenied: [
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    })

    const { service, searchService, playerManager } = createService({
      player,

      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    const result = await service.execute({
      interaction,
      query: 'track'
    })

    assert.equal(result, true)

    assert.deepEqual(searchService.calls, ['track'])

    assert.equal(playerManager.calls.create.length, 0)
    assert.equal(player.calls.enqueue.length, 1)
  })

  test('bloqueia usuário em outra call quando player já existe', async () => {
    const player = createPlayerMock()

    const { interaction, calls } = createCommandInteraction({
      userChannelId: 'voice-2',
      botChannelId: 'voice-1'
    })

    const { service, searchService } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    const result = await service.execute({
      interaction,
      query: 'get lucky'
    })

    assert.equal(result, false)

    assert.equal(
      calls.reply[0].content,
      'Você precisa estar no mesmo canal de voz que eu.'
    )

    assert.equal(searchService.calls.length, 0)
  })

  test('faz a busca somente depois de validar o canal', async () => {
    const player = createPlayerMock()

    const { interaction } = createCommandInteraction()

    const { service, searchService } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    await service.execute({
      interaction,
      query: 'get lucky'
    })

    assert.deepEqual(searchService.calls, ['get lucky'])
  })

  test('responde quando nenhuma música é encontrada', async () => {
    const { interaction, calls } = createCommandInteraction()

    const { service, playerManager } = createService({
      searchResult: {
        type: 'empty',
        tracks: []
      }
    })

    const result = await service.execute({
      interaction,
      query: 'nada'
    })

    assert.equal(result, false)

    assert.equal(calls.deferReply, 1)

    assert.deepEqual(calls.editReply, ['Não encontrei nenhuma música.'])

    assert.equal(playerManager.calls.create.length, 0)
  })

  test('cria player no canal do usuário quando não existe', async () => {
    const { interaction } = createCommandInteraction({
      userChannelId: 'voice-7'
    })

    const { service, playerManager } = createService({
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    await service.execute({
      interaction,
      query: 'get lucky'
    })

    assert.equal(playerManager.calls.create.length, 1)

    assert.deepEqual(playerManager.calls.create[0], {
      guildId: 'guild-1',
      channelId: 'voice-7',
      textChannel: interaction.channel,
      shardId: 0
    })
  })

  test('reutiliza player existente', async () => {
    const player = createPlayerMock()

    const { interaction } = createCommandInteraction()

    const { service, playerManager } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    await service.execute({
      interaction,
      query: 'get lucky'
    })

    assert.equal(playerManager.calls.create.length, 0)

    assert.equal(player.calls.enqueue.length, 1)
  })

  test('adiciona requester à música', async () => {
    const player = createPlayerMock()

    const { interaction } = createCommandInteraction({
      displayName: 'Igor N.'
    })

    const { service } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [createTrack('A')]
      }
    })

    await service.execute({
      interaction,
      query: 'track'
    })

    const enqueued = player.calls.enqueue[0]

    assert.deepEqual(enqueued.userData.requester, {
      id: 'user-1',
      username: 'test-user',
      displayName: 'Igor N.'
    })
  })

  test('chama enqueue para uma música individual', async () => {
    const player = createPlayerMock()

    const track = createTrack('A')

    const { interaction } = createCommandInteraction()

    const { service } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [track]
      }
    })

    await service.execute({
      interaction,
      query: 'track'
    })

    assert.equal(player.calls.enqueue.length, 1)

    assert.equal(player.calls.enqueue[0].encoded, track.encoded)
  })

  test('formata confirmação de música com duração', async () => {
    const player = createPlayerMock()

    const { interaction, calls } = createCommandInteraction()

    const { service } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [
          createTrack('A', {
            title: 'Get Lucky',
            length: 249_000
          })
        ]
      }
    })

    await service.execute({
      interaction,
      query: 'get lucky'
    })

    assert.equal(calls.editReply[0], '**Get Lucky - [4:09]** adicionada!')
  })

  test('formata stream como AO VIVO', async () => {
    const player = createPlayerMock()

    const track = createTrack('LIVE', {
      title: 'Live Test'
    })

    track.info.isStream = true

    const { interaction, calls } = createCommandInteraction()

    const { service } = createService({
      player,
      searchResult: {
        type: 'track',
        tracks: [track]
      }
    })

    await service.execute({
      interaction,
      query: 'live'
    })

    assert.equal(calls.editReply[0], '**Live Test - [AO VIVO]** adicionada!')
  })

  test('adiciona todas as músicas de uma playlist', async () => {
    const player = createPlayerMock()

    const { interaction } = createCommandInteraction()

    const { service } = createService({
      player,

      searchResult: {
        type: 'playlist',
        tracks: [createTrack('A'), createTrack('B'), createTrack('C')],
        playlist: {
          name: 'Discovery'
        }
      }
    })

    await service.execute({
      interaction,
      query: 'playlist-url'
    })

    assert.deepEqual(
      player.calls.enqueue.map(track => track.info.identifier),
      ['A', 'B', 'C']
    )
  })

  test('adiciona requester a todas as músicas da playlist', async () => {
    const player = createPlayerMock()

    const { interaction } = createCommandInteraction({
      displayName: 'Igor'
    })

    const { service } = createService({
      player,
      searchResult: {
        type: 'playlist',
        tracks: [createTrack('A'), createTrack('B')],
        playlist: {
          name: 'Teste'
        }
      }
    })

    await service.execute({
      interaction,
      query: 'playlist-url'
    })

    for (const track of player.calls.enqueue) {
      assert.equal(track.userData.requester.displayName, 'Igor')
    }
  })

  test('formata confirmação da playlist', async () => {
    const player = createPlayerMock()

    const { interaction, calls } = createCommandInteraction()

    const { service } = createService({
      player,

      searchResult: {
        type: 'playlist',
        tracks: [createTrack('A'), createTrack('B'), createTrack('C')],
        playlist: {
          name: 'Discovery'
        }
      }
    })

    const result = await service.execute({
      interaction,
      query: 'playlist-url'
    })

    assert.equal(result, true)

    assert.equal(
      calls.editReply[0],
      'A playlist **Discovery** com **3** músicas foi adicionada!'
    )
  })
})
