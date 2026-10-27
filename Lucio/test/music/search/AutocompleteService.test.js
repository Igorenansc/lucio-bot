import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import AutocompleteService from '../../../src/music/search/AutocompleteService.js'

import { SearchType } from '../../../src/music/search/SearchType.js'

function createSearchProvider (results = []) {
  const calls = []

  return {
    calls,

    async search (query, limit) {
      calls.push({
        query,
        limit
      })

      return results
    }
  }
}

describe('AutocompleteService', () => {
  test('ignora queries menores que o mínimo', async () => {
    const provider = createSearchProvider()

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 0,
      cacheTtl: 30_000,
      limit: 10
    })

    const result = await service.search('guild:user', 'ab')

    assert.deepEqual(result, [])

    assert.equal(provider.calls.length, 0)
  })

  test('executa busca após atingir tamanho mínimo', async () => {
    const expected = [
      {
        videoId: '1',
        title: 'Track 1'
      }
    ]

    const provider = createSearchProvider(expected)

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 0,
      cacheTtl: 30_000,
      limit: 10
    })

    const result = await service.search('guild:user', 'daft')

    assert.deepEqual(result, expected)

    assert.equal(provider.calls.length, 1)

    assert.equal(provider.calls[0].query, 'daft')
  })

  test('normaliza espaços e caixa', async () => {
    const provider = createSearchProvider([])

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 0,
      cacheTtl: 30_000,
      limit: 10
    })

    await service.search('guild:user', '  DaFt PuNk  ')

    assert.equal(provider.calls[0].query, 'daft punk')
  })

  test('usa cache para queries repetidas', async () => {
    const provider = createSearchProvider([
      {
        videoId: '1'
      }
    ])

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 0,
      cacheTtl: 30_000,
      limit: 10
    })

    await service.search('guild:user', 'daft punk')

    await service.search('guild:user', 'daft punk')

    assert.equal(provider.calls.length, 1)
  })

  test('descarta uma query antiga quando outra chega', async () => {
    const provider = createSearchProvider([
      {
        videoId: '1'
      }
    ])

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 10,
      cacheTtl: 30_000,
      limit: 10
    })

    const first = service.search('guild:user', 'daf')

    const second = service.search('guild:user', 'daft')

    const [firstResult, secondResult] = await Promise.all([first, second])

    assert.deepEqual(firstResult, [])

    assert.equal(provider.calls.length, 1)

    assert.equal(provider.calls[0].query, 'daft')

    assert.deepEqual(secondResult, [{ videoId: '1' }])
  })

  test('encaminha tipo para SearchProvider', async () => {
    const provider = {
      calls: [],

      async search (query, type, limit) {
        this.calls.push({
          query,
          type,
          limit
        })

        return []
      }
    }

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 0,
      cacheTtl: 30_000,
      limit: 10
    })

    await service.search('guild:user', 'daft punk', SearchType.PLAYLIST)

    assert.equal(provider.calls[0].type, SearchType.PLAYLIST)
  })

  test('mantém caches separados para vídeo e playlist', async () => {
    const provider = {
      calls: [],

      async search (query, type) {
        this.calls.push({
          query,
          type
        })

        return [
          {
            type
          }
        ]
      }
    }

    const service = new AutocompleteService(provider, {
      minQueryLength: 3,
      debounceMs: 0,
      cacheTtl: 30_000,
      limit: 10
    })

    const video = await service.search(
      'user-video',
      'daft punk',
      SearchType.VIDEO
    )

    const playlist = await service.search(
      'user-playlist',
      'daft punk',
      SearchType.PLAYLIST
    )

    assert.equal(provider.calls.length, 2)

    assert.equal(video[0].type, SearchType.VIDEO)

    assert.equal(playlist[0].type, SearchType.PLAYLIST)
  })

  test('sem provider retorna lista vazia', async () => {
    const service = new AutocompleteService(null, {
      debounceMs: 0
    })

    const result = await service.search('key', 'query')

    assert.deepEqual(result, [])
  })

  test('aborta quando o provider passa do timeout', async () => {
    const provider = {
      search () {
        return new Promise(() => {})
      }
    }

    const service = new AutocompleteService(provider, {
      debounceMs: 0,
      timeoutMs: 20
    })

    await assert.rejects(
      () => service.search('key', 'query'),
      /Timeout na busca de autocomplete/
    )
  })
})
