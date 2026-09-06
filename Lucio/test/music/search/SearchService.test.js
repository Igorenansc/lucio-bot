import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import SearchService from '../../../src/music/search/SearchService.js'

function createShoukaku (resolveResult) {
  const calls = []

  const node = {
    state: 1,

    rest: {
      async resolve (identifier) {
        calls.push(identifier)
        return resolveResult
      }
    }
  }

  return {
    shoukaku: {
      nodes: new Map([['local', node]])
    },
    calls
  }
}

function createPlaylistProvider (result) {
  const calls = []

  return {
    calls,

    async getPlaylist (playlistId) {
      calls.push(playlistId)
      return result
    }
  }
}

describe('SearchService', () => {
  test('usa Lavalink normalmente para busca textual', async () => {
    const track = {
      encoded: 'encoded-A',
      info: {
        identifier: 'A'
      }
    }

    const { shoukaku, calls } = createShoukaku({
      loadType: 'search',
      data: [track]
    })

    const provider = createPlaylistProvider()

    const service = new SearchService(shoukaku, provider)

    const result = await service.search('get lucky')

    assert.equal(calls[0], 'ytsearch:get lucky')

    assert.equal(result.tracks[0], track)

    assert.equal(provider.calls.length, 0)
  })

  test('mantém playlist válida retornada pelo Lavalink', async () => {
    const lavalinkTrack = {
      encoded: 'A',
      info: {
        identifier: 'A'
      }
    }

    const { shoukaku } = createShoukaku({
      loadType: 'playlist',
      data: {
        info: {
          name: 'Playlist Lavalink'
        },
        tracks: [lavalinkTrack]
      }
    })

    const provider = createPlaylistProvider()

    const service = new SearchService(shoukaku, provider)

    const result = await service.search(
      'https://www.youtube.com/playlist?list=PL123'
    )

    assert.equal(result.type, 'playlist')

    assert.equal(provider.calls.length, 0)
  })

  test('usa YouTubePlaylistProvider quando Lavalink retorna error', async () => {
    const lazyTrack = {
      encoded: null,
      info: {
        identifier: 'A',
        uri: 'https://www.youtube.com/watch?v=A'
      }
    }

    const { shoukaku, calls } = createShoukaku({
      loadType: 'error',
      data: {
        message: 'playlist failed'
      }
    })

    const provider = createPlaylistProvider({
      type: 'playlist',
      playlist: {
        name: 'Fallback'
      },

      tracks: [lazyTrack]
    })

    const service = new SearchService(shoukaku, provider)

    const result = await service.search(
      'https://www.youtube.com/playlist?list=PL123'
    )

    assert.deepEqual(provider.calls, ['PL123'])

    assert.equal(result.type, 'playlist')

    assert.equal(result.tracks[0], lazyTrack)

    /*
     * Esta é a garantia principal:
     * apenas a URL da playlist foi enviada
     * ao Lavalink.
     *
     * Nenhuma faixa individual foi resolvida.
     */
    assert.equal(calls.length, 1)
  })

  test('usa fallback quando Lavalink retorna empty', async () => {
    const { shoukaku } = createShoukaku({
      loadType: 'empty',
      data: {}
    })

    const provider = createPlaylistProvider({
      type: 'playlist',
      playlist: {
        name: 'Fallback'
      },

      tracks: [
        {
          encoded: null,
          info: {
            identifier: 'A'
          }
        }
      ]
    })

    const service = new SearchService(shoukaku, provider)

    const result = await service.search(
      'https://www.youtube.com/playlist?list=PL123'
    )

    assert.equal(result.type, 'playlist')

    assert.equal(provider.calls.length, 1)
  })

  test('retorna empty se fallback não encontrar tracks', async () => {
    const { shoukaku } = createShoukaku({
      loadType: 'error',
      data: {}
    })

    const provider = createPlaylistProvider({
      type: 'playlist',
      playlist: {
        name: 'Vazia'
      },

      tracks: []
    })

    const service = new SearchService(shoukaku, provider)

    const result = await service.search(
      'https://www.youtube.com/playlist?list=PL123'
    )

    assert.equal(result.type, 'empty')

    assert.deepEqual(result.tracks, [])
  })

  test('não usa provider para URL de vídeo comum', async () => {
    const { shoukaku } = createShoukaku({
      loadType: 'track',
      data: {
        encoded: 'A',
        info: {
          identifier: 'A'
        }
      }
    })

    const provider = createPlaylistProvider()

    const service = new SearchService(shoukaku, provider)

    await service.search('https://www.youtube.com/watch?v=A')

    assert.equal(provider.calls.length, 0)
  })

  test('lança erro sem node disponível', async () => {
    const shoukaku = {
      nodes: new Map([['local', { state: 0 }]])
    }

    const service = new SearchService(shoukaku, createPlaylistProvider())

    await assert.rejects(
      () => service.search('teste'),
      /Nenhum node Lavalink disponível/
    )
  })
})
