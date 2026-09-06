import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import YouTubePlaylistProvider from '../../../src/music/search/YouTubePlaylistProvider.js'

function createYoutube (playlist) {
  const calls = []

  return {
    calls,

    async getPlaylist (playlistId) {
      calls.push(playlistId)
      return playlist
    }
  }
}

describe('YouTubePlaylistProvider', () => {
  test('retorna null sem playlistId', async () => {
    const youtube = createYoutube({})

    const provider = new YouTubePlaylistProvider(youtube)

    const result = await provider.getPlaylist(null)

    assert.equal(result, null)

    assert.equal(youtube.calls.length, 0)
  })

  test('converte itens em tracks lazy', async () => {
    const youtube = createYoutube({
      info: {
        title: 'Minha Playlist'
      },

      items: [
        {
          id: 'A',
          title: {
            text: 'Track A'
          },
          author: {
            name: 'Artista A'
          },
          duration: {
            text: '4:09'
          }
        }
      ]
    })

    const provider = new YouTubePlaylistProvider(youtube)

    const result = await provider.getPlaylist('PL123')

    assert.equal(result.type, 'playlist')

    assert.equal(result.playlist.name, 'Minha Playlist')

    assert.equal(result.tracks.length, 1)

    const track = result.tracks[0]

    assert.equal(track.encoded, null)

    assert.equal(track.info.identifier, 'A')

    assert.equal(track.info.title, 'Track A')

    assert.equal(track.info.author, 'Artista A')

    assert.equal(track.info.length, 249_000)

    assert.equal(track.info.uri, 'https://www.youtube.com/watch?v=A')

    assert.equal(track.userData.unresolved, true)
  })

  test('ignora itens sem videoId', async () => {
    const youtube = createYoutube({
      info: {
        title: 'Playlist'
      },

      items: [
        {
          title: {
            text: 'Inválida'
          }
        },
        {
          id: 'B',

          title: {
            text: 'Válida'
          },
          duration: {
            text: '3:00'
          }
        }
      ]
    })

    const provider = new YouTubePlaylistProvider(youtube)

    const result = await provider.getPlaylist('PL123')

    assert.equal(result.tracks.length, 1)

    assert.equal(result.tracks[0].info.identifier, 'B')
  })

  test('usa autor padrão quando ausente', async () => {
    const youtube = createYoutube({
      info: {
        title: 'Playlist'
      },

      items: [
        {
          id: 'A',
          title: {
            text: 'Track'
          },
          duration: {
            text: '1:00'
          }
        }
      ]
    })

    const provider = new YouTubePlaylistProvider(youtube)

    const result = await provider.getPlaylist('PL123')

    assert.equal(result.tracks[0].info.author, 'Desconhecido')
  })

  test('converte duração HH:MM:SS corretamente', async () => {
    const youtube = createYoutube({
      info: {
        title: 'Playlist'
      },

      items: [
        {
          id: 'A',
          title: {
            text: 'Long Track'
          },
          duration: {
            text: '1:02:03'
          }
        }
      ]
    })

    const provider = new YouTubePlaylistProvider(youtube)

    const result = await provider.getPlaylist('PL123')

    assert.equal(result.tracks[0].info.length, 3_723_000)
  })

  test('usa zero quando duração é inválida', async () => {
    const youtube = createYoutube({
      info: {
        title: 'Playlist'
      },

      items: [
        {
          id: 'A',
          title: {
            text: 'Track'
          },

          duration: {
            text: 'invalid'
          }
        }
      ]
    })

    const provider = new YouTubePlaylistProvider(youtube)

    const result = await provider.getPlaylist('PL123')

    assert.equal(result.tracks[0].info.length, 0)
  })
})
