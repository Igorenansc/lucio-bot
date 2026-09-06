import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { execute, autocomplete } from '../../../src/discord/commands/play.js'

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

describe('/p', () => {
  test('encaminha query para PlayRequestService', async () => {
    const { interaction } = createCommandInteraction({
      query: 'get lucky'
    })

    const playRequestService = createPlayRequestService()

    await execute(interaction, {
      playRequestService
    })

    assert.equal(playRequestService.calls.length, 1)

    assert.equal(playRequestService.calls[0].query, 'get lucky')

    assert.equal(playRequestService.calls[0].interaction, interaction)
  })
})

describe('/p autocomplete', () => {
  test('não pesquisa query vazia', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: '   '
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

    assert.deepEqual(calls.respond, [[]])

    assert.equal(autocompleteService.calls.length, 0)
  })

  test('autocomplete do play pesquisa vídeos', async () => {
    const { interaction } = createCommandInteraction({
      query: 'daft punk'
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

    assert.equal(autocompleteService.calls.length, 1)

    assert.equal(autocompleteService.calls[0].query, 'daft punk')

    /*
     * Como /play usa vídeo por padrão,
     * dependendo de como você escreveu
     * play.js o type pode ser omitido
     * e cair no default do service.
     */
    assert.match(autocompleteService.calls[0].key, /:video$/)
  })

  test('formata resultado de vídeo', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'get lucky'
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

  test('formata vídeo sem duração como AO VIVO', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'live'
    })

    const autocompleteService = {
      async search () {
        return [
          {
            videoId: 'live123',
            title: 'Live Test',
            duration: null
          }
        ]
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.equal(calls.respond[0][0].name, '🎵 [AO VIVO] - Live Test')
  })

  test('limita nome da choice a 100 caracteres', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'teste'
    })

    const autocompleteService = {
      async search () {
        return [
          {
            videoId: 'long',
            title: 'A'.repeat(150),
            duration: '3:00'
          }
        ]
      }
    }

    await autocomplete(interaction, {
      autocompleteService
    })

    assert.equal(calls.respond[0][0].name.length, 100)

    assert.equal(calls.respond[0][0].name.endsWith('...'), true)
  })

  test('retorna lista vazia quando autocomplete falha', async () => {
    const { interaction, calls } = createCommandInteraction({
      query: 'erro'
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
