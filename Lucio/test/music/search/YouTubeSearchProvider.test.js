import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import YouTubeSearchProvider from '../../../src/music/search/YouTubeSearchProvider.js'

import { SearchType } from '../../../src/music/search/SearchType.js'

function createYoutube ({ videos = [], playlists = [] } = {}) {
  const calls = []

  return {
    calls,

    async search (query) {
      calls.push(query)

      return {
        videos,
        playlists
      }
    }
  }
}

function createVideo (id, overrides = {}) {
  return {
    id,
    title: { text: `Video ${id}` },
    author: { name: 'Artist' },
    duration: {
      text: '4:09',
      seconds: 249
    },
    ...overrides
  }
}

describe('YouTubeSearchProvider', () => {
  test('não busca query vazia', async () => {
    const youtube = createYoutube()

    const provider = new YouTubeSearchProvider(youtube)

    assert.deepEqual(await provider.search('   '), [])
    assert.equal(youtube.calls.length, 0)
  })

  test('mapeia vídeos e respeita o limite', async () => {
    const youtube = createYoutube({
      videos: [createVideo('A'), createVideo('B')]
    })

    const provider = new YouTubeSearchProvider(youtube)

    const result = await provider.search('daft punk', SearchType.VIDEO, 1)

    assert.deepEqual(result, [
      {
        videoId: 'A',
        title: 'Video A',
        author: 'Artist',
        duration: '4:09',
        durationSeconds: 249
      }
    ])
  })

  test('usa fallback quando vídeo não tem metadados', async () => {
    const youtube = createYoutube({
      videos: [
        {
          id: 'A',
          title: 'Título cru',
          author: null,
          duration: null
        }
      ]
    })

    const provider = new YouTubeSearchProvider(youtube)

    const [video] = await provider.search('x', SearchType.VIDEO)

    assert.equal(video.title, 'Título cru')
    assert.equal(video.author, 'Desconhecido')
    assert.equal(video.duration, null)
  })

  test('mapeia playlists e extrai autor do metadata', async () => {
    const youtube = createYoutube({
      playlists: [
        {
          content_id: 'PL1',
          metadata: {
            title: { text: 'Discovery' },
            metadata: {
              metadata_rows: [
                {
                  metadata_parts: [{ text: { text: 'Daft Punk' } }]
                }
              ]
            }
          }
        }
      ]
    })

    const provider = new YouTubeSearchProvider(youtube)

    const result = await provider.search('discovery', SearchType.PLAYLIST)

    assert.deepEqual(result, [
      {
        playlistId: 'PL1',
        title: 'Discovery',
        author: 'Daft Punk'
      }
    ])
  })

  test('ignora playlist sem id', async () => {
    const youtube = createYoutube({
      playlists: [
        {
          title: { text: 'Sem id' }
        }
      ]
    })

    const provider = new YouTubeSearchProvider(youtube)

    assert.deepEqual(
      await provider.search('x', SearchType.PLAYLIST),
      []
    )
  })

  test('usa playlist.id como fallback de content_id', async () => {
    const youtube = createYoutube({
      playlists: [
        {
          id: 'PL2',
          title: { text: 'Mix' },
          author: { name: 'Autor' }
        }
      ]
    })

    const provider = new YouTubeSearchProvider(youtube)

    const [playlist] = await provider.search('mix', SearchType.PLAYLIST)

    assert.equal(playlist.playlistId, 'PL2')
    assert.equal(playlist.author, 'Autor')
  })
})
