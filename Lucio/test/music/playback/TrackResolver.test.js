import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import TrackResolver from '../../../src/music/playback/TrackResolver.js'

import { createTrack } from '../../helpers/createTrack.js'

function createShoukaku ({ nodeState = 1, resolveResult = null } = {}) {
  const calls = {
    resolve: []
  }

  const node = {
    state: nodeState,

    rest: {
      async resolve (identifier) {
        calls.resolve.push(identifier)

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

describe('TrackResolver', () => {
  test('retorna track já resolvida sem chamar Lavalink', async () => {
    const track = createTrack('A')

    const { shoukaku, calls } = createShoukaku()

    const resolver = new TrackResolver(shoukaku)

    const result = await resolver.resolve(track)

    assert.equal(result, track)

    assert.equal(calls.resolve.length, 0)
  })

  test('resolve track lazy usando uri exata', async () => {
    const lazyTrack = {
      encoded: null,

      info: {
        identifier: 'A',
        title: 'Track A',
        uri: 'https://www.youtube.com/watch?v=A'
      },

      userData: {
        unresolved: true
      }
    }

    const resolvedTrack = createTrack('A')

    const { shoukaku, calls } = createShoukaku({
      resolveResult: {
        loadType: 'track',
        data: resolvedTrack
      }
    })

    const resolver = new TrackResolver(shoukaku)

    const result = await resolver.resolve(lazyTrack)

    assert.equal(calls.resolve.length, 1)

    assert.equal(calls.resolve[0], lazyTrack.info.uri)

    assert.equal(result.encoded, resolvedTrack.encoded)
  })

  test('preserva userData da track lazy', async () => {
    const lazyTrack = {
      encoded: null,

      info: {
        identifier: 'A',
        title: 'Track A',
        uri: 'https://www.youtube.com/watch?v=A'
      },

      userData: {
        unresolved: true,

        requester: {
          id: 'user-1',
          displayName: 'Igor'
        }
      }
    }

    const resolvedTrack = createTrack('A')

    resolvedTrack.userData = {
      origin: 'lavalink'
    }

    const { shoukaku } = createShoukaku({
      resolveResult: {
        loadType: 'track',
        data: resolvedTrack
      }
    })

    const resolver = new TrackResolver(shoukaku)

    const result = await resolver.resolve(lazyTrack)

    assert.deepEqual(result.userData.requester, {
      id: 'user-1',
      displayName: 'Igor'
    })

    assert.equal(result.userData.origin, 'lavalink')
  })

  test('retorna null se Lavalink não retornar track', async () => {
    const lazyTrack = {
      encoded: null,

      info: {
        identifier: 'A',
        uri: 'https://www.youtube.com/watch?v=A'
      },

      userData: {}
    }

    const { shoukaku } = createShoukaku({
      resolveResult: {
        loadType: 'empty',
        data: {}
      }
    })

    const resolver = new TrackResolver(shoukaku)

    const result = await resolver.resolve(lazyTrack)

    assert.equal(result, null)
  })

  test('retorna null para track inválida sem uri', async () => {
    const { shoukaku, calls } = createShoukaku()

    const resolver = new TrackResolver(shoukaku)

    const result = await resolver.resolve({
      encoded: null,
      info: {}
    })

    assert.equal(result, null)

    assert.equal(calls.resolve.length, 0)
  })

  test('lança erro quando não há node disponível', async () => {
    const { shoukaku } = createShoukaku({
      nodeState: 0
    })

    const resolver = new TrackResolver(shoukaku)

    await assert.rejects(
      () =>
        resolver.resolve({
          encoded: null,
          info: {
            uri: 'https://www.youtube.com/watch?v=A'
          }
        }),
      /Nenhum node Lavalink disponível/
    )
  })
})
