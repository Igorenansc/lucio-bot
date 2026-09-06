import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import RecommendationService from '../../../src/music/recommendation/RecommendationService.js'

import { createTrack } from '../../helpers/createTrack.js'

function createYoutubeProvider ({ related = [], fallbackId = null } = {}) {
  const calls = {
    getRelated: [],
    getAutoplayVideoId: []
  }

  return {
    calls,

    async getRelated (videoId) {
      calls.getRelated.push(videoId)

      return related
    },

    async getAutoplayVideoId (videoId) {
      calls.getAutoplayVideoId.push(videoId)

      return fallbackId
    }
  }
}

function createNode (
  resolver = () => ({
    loadType: 'empty',
    data: {}
  })
) {
  const calls = []

  return {
    calls,

    rest: {
      async resolve (identifier) {
        calls.push(identifier)

        return resolver(identifier)
      }
    }
  }
}

function createCandidate (videoId, title = `Candidate ${videoId}`) {
  return {
    videoId,
    title
  }
}

describe('RecommendationService', () => {
  test('retorna null para track que não é do YouTube', async () => {
    const track = createTrack('A')

    track.info.sourceName = 'spotify'

    const node = createNode()

    const youtubeProvider = createYoutubeProvider()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, null)

    assert.equal(youtubeProvider.calls.getRelated.length, 0)

    assert.equal(node.calls.length, 0)
  })

  test('retorna null quando track não possui identifier', async () => {
    const track = createTrack('A')

    track.info.identifier = null

    const node = createNode()

    const youtubeProvider = createYoutubeProvider()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, null)

    assert.equal(youtubeProvider.calls.getRelated.length, 0)
  })

  test('ignora a própria música atual', async () => {
    const track = createTrack('A')

    const youtubeProvider = createYoutubeProvider({
      related: [createCandidate('A', 'Track A')]
    })

    const node = createNode()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, null)

    /*
     * O candidato foi eliminado antes
     * mesmo de chegar ao Lavalink.
     */
    assert.equal(node.calls.length, 0)
  })

  test('ignora músicas presentes no histórico recente', async () => {
    const track = createTrack('A')

    const recent = createTrack('B')

    const youtubeProvider = createYoutubeProvider({
      related: [createCandidate('B', 'Track B')]
    })

    const node = createNode()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track, [recent])

    assert.equal(result, null)

    assert.equal(node.calls.length, 0)
  })

  test('ignora música equivalente pelo título normalizado', async () => {
    const track = createTrack('A')

    const recent = createTrack('B', {
      title: 'Daft Punk - Get Lucky'
    })

    const youtubeProvider = createYoutubeProvider({
      related: [createCandidate('C', 'Daft Punk - Get Lucky (Official Video)')]
    })

    const node = createNode()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track, [recent])

    assert.equal(result, null)

    assert.equal(node.calls.length, 0)
  })

  test('retorna o primeiro candidato reproduzível', async () => {
    const track = createTrack('A')

    const expected = createTrack('C')

    const youtubeProvider = createYoutubeProvider({
      related: [createCandidate('B'), createCandidate('C')]
    })

    const node = createNode(identifier => {
      if (identifier.endsWith('B')) {
        return {
          loadType: 'empty',
          data: {}
        }
      }

      if (identifier.endsWith('C')) {
        return {
          loadType: 'track',
          data: expected
        }
      }

      return {
        loadType: 'empty',
        data: {}
      }
    })

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, expected)

    assert.deepEqual(node.calls, [
      'https://www.youtube.com/watch?v=B',
      'https://www.youtube.com/watch?v=C'
    ])
  })

  test('continua para o próximo candidato quando resolve lança erro', async () => {
    const track = createTrack('A')

    const expected = createTrack('C')

    const youtubeProvider = createYoutubeProvider({
      related: [createCandidate('B'), createCandidate('C')]
    })

    const node = createNode(identifier => {
      if (identifier.endsWith('B')) {
        throw new Error('Falha simulada')
      }

      return {
        loadType: 'track',
        data: expected
      }
    })

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, expected)

    assert.equal(node.calls.length, 2)
  })

  test('usa fallback quando nenhum related é reproduzível', async () => {
    const track = createTrack('A')

    const fallbackTrack = createTrack('FALLBACK')

    const youtubeProvider = createYoutubeProvider({
      related: [],
      fallbackId: 'FALLBACK'
    })

    const node = createNode(identifier => {
      if (identifier.endsWith('FALLBACK')) {
        return {
          loadType: 'track',
          data: fallbackTrack
        }
      }

      return {
        loadType: 'empty',
        data: {}
      }
    })

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, fallbackTrack)

    assert.deepEqual(youtubeProvider.calls.getAutoplayVideoId, ['A'])
  })

  test('não usa fallback quando ele está no histórico', async () => {
    const track = createTrack('A')

    const recent = createTrack('B')

    const youtubeProvider = createYoutubeProvider({
      related: [],
      fallbackId: 'B'
    })

    const node = createNode()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track, [recent])

    assert.equal(result, null)

    /*
     * Não tenta resolver porque o ID
     * já foi eliminado.
     */
    assert.equal(node.calls.length, 0)
  })

  test('retorna null quando não existe fallback', async () => {
    const track = createTrack('A')

    const youtubeProvider = createYoutubeProvider({
      related: [],
      fallbackId: null
    })

    const node = createNode()

    const service = new RecommendationService(node, youtubeProvider)

    const result = await service.getNext(track)

    assert.equal(result, null)
  })
})
