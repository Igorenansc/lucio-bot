import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import {
  execute,
  autocomplete
} from '../../../src/discord/commands/youtubeSearch.js'

import { SearchType } from '../../../src/music/search/SearchType.js'

import { createCommandInteraction } from '../../helpers/discord/createCommandInteraction.js'

function createPlayRequestService () {
  const calls = []

  return {
    calls,

    async execute (request) {
      calls.push(request)

      return true
    }
  }
}

describe('/yt', () => {
  test('encaminha URL escolhida para PlayRequestService', async () => {
    const url = 'https://www.youtube.com/watch?v=abc123'

    const { interaction } = createCommandInteraction({
      options: {
        tipo: SearchType.VIDEO,
        busca: url
      }
    })

    const playRequestService = createPlayRequestService()

    await execute(interaction, {
      playRequestService
    })

    assert.equal(playRequestService.calls.length, 1)

    assert.equal(playRequestService.calls[0].query, url)

    assert.equal(playRequestService.calls[0].interaction, interaction)

    assert.equal(playRequestService.calls[0].searchType, SearchType.VIDEO)
  })

  test('encaminha tipo playlist para busca por texto', async () => {
    const { interaction } = createCommandInteraction({
      options: {
        tipo: SearchType.PLAYLIST,
        busca: 'daft punk'
      }
    })

    const playRequestService = createPlayRequestService()

    await execute(interaction, {
      playRequestService
    })

    assert.equal(playRequestService.calls[0].searchType, SearchType.PLAYLIST)
  })
})

describe('/yt autocomplete', () => {
  test('não pesquisa query vazia', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: '   ',
      options: {
        tipo: SearchType.VIDEO
      }
    })

    const autocompleteService = {
      calls: [],

      async search () {
        this.calls.push(true)

        return []
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.deepEqual(calls.respond, [[]])

    assert.equal(autocompleteService.calls.length, 0)
  })

  test('não pesquisa enquanto tipo não foi escolhido', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'daft punk',
      options: {
        tipo: null
      }
    })

    const autocompleteService = {
      calls: [],

      async search () {
        this.calls.push(true)

        return []
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.deepEqual(calls.respond, [[]])

    assert.equal(autocompleteService.calls.length, 0)
  })

  test('busca vídeos quando tipo é VIDEO', async () => {
    const { interaction } = createCommandInteraction({
      query: 'daft punk',
      options: {
        tipo: SearchType.VIDEO
      }
    })

    const autocompleteService = {
      calls: [],

      async search (key, query, type) {
        this.calls.push({
          key,
          query,
          type
        })

        return []
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.deepEqual(autocompleteService.calls[0], {
      key: 'guild-1:user-1:video',
      query: 'daft punk',
      type: SearchType.VIDEO
    })
  })

  test('busca playlists quando tipo é PLAYLIST', async () => {
    const { interaction } = createCommandInteraction({
      query: 'daft punk',
      options: {
        tipo: SearchType.PLAYLIST
      }
    })

    const autocompleteService = {
      calls: [],

      async search (key, query, type) {
        this.calls.push({
          key,
          query,
          type
        })

        return []
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.equal(autocompleteService.calls[0].type, SearchType.PLAYLIST)

    assert.match(autocompleteService.calls[0].key, /:playlist$/)
  })

  test('formata resultado de vídeo', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'get lucky',
      options: {
        tipo: SearchType.VIDEO
      }
    })

    const autocompleteService = {
      async search () {
        return [
          {
            videoId: 'abc123',
            title: 'Daft Punk - Get Lucky',
            duration: '4:09'
          }
        ]
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.deepEqual(calls.respond[0], [
      {
        name: '🎵 [4:09] - Daft Punk - Get Lucky',
        value: 'https://www.youtube.com/watch?v=abc123'
      }
    ])
  })

  test('formata resultado de playlist', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'discovery',
      options: {
        tipo: SearchType.PLAYLIST
      }
    })

    const autocompleteService = {
      async search () {
        return [
          {
            playlistId: 'PL123',
            title: 'Discovery'
          }
        ]
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.deepEqual(calls.respond[0], [
      {
        name: '🎶 Discovery',
        value: 'https://www.youtube.com/playlist?list=PL123'
      }
    ])
  })

  test('playlist e vídeo usam cache keys diferentes', async () => {
    const calls = []

    const autocompleteService = {
      async search (key, query, type) {
        calls.push({
          key,
          query,
          type
        })

        return []
      }
    }

    const first = createCommandInteraction({
      query: 'daft punk',
      options: {
        tipo: SearchType.VIDEO
      }
    })

    const second = createCommandInteraction({
      query: 'daft punk',
      options: {
        tipo: SearchType.PLAYLIST
      }
    })

    await autocomplete(first.interaction, {
      autocompleteService
    })

    await autocomplete(second.interaction, {
      autocompleteService
    })

    assert.notEqual(calls[0].key, calls[1].key)

    assert.equal(calls[0].key, 'guild-1:user-1:video')

    assert.equal(calls[1].key, 'guild-1:user-1:playlist')
  })

  test('retorna lista vazia quando autocomplete falha', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'erro',
      options: {
        tipo: SearchType.VIDEO
      }
    })

    const autocompleteService = {
      async search () {
        throw new Error('Falha simulada')
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.deepEqual(calls.respond, [[]])
  })
})
