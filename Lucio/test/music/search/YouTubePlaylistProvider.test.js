import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import YouTubePlaylistProvider from '../../../src/music/search/YouTubePlaylistProvider.js'

function text (value) {
  return {
    toString () {
      return value
    }
  }
}

describe('YouTubePlaylistProvider', () => {
  test('mapeia LockupView do youtubei.js 18 sem cair em Sem título', async () => {
    const youtube = {
      async getPlaylist () {
        return {
          info: {
            title: text('Minha Playlist')
          },
          items: [
            {
              content_id: 'video-A',
              metadata: {
                title: text('Track A'),
                metadata: {
                  metadata_rows: [
                    {
                      metadata_parts: [
                        { text: text('Artist A') },
                        { text: text('4:09') }
                      ]
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    }

    const provider = new YouTubePlaylistProvider(youtube)
    const result = await provider.getPlaylist('PL123')

    assert.equal(result.playlist.name, 'Minha Playlist')
    assert.equal(result.tracks[0].info.identifier, 'video-A')
    assert.equal(result.tracks[0].info.title, 'Track A')
    assert.equal(result.tracks[0].info.author, 'Artist A')
    assert.equal(result.tracks[0].info.length, 249_000)
  })
})
