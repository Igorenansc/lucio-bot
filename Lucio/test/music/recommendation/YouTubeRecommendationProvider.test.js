import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import YouTubeRecommendationProvider from '../../../src/music/recommendation/YouTubeRecommendationProvider.js'

function createYoutube ({ related = null, info = null } = {}) {
  const calls = {
    related: [],
    info: []
  }

  return {
    calls,

    music: {
      async getRelated (videoId) {
        calls.related.push(videoId)

        return related
      }
    },

    async getInfo (videoId) {
      calls.info.push(videoId)

      return info
    }
  }
}

function createRelatedShelf (contents) {
  return {
    contents: [
      {
        type: 'MusicCarouselShelf',
        header: {
          title: {
            text: 'You might also like'
          }
        },
        contents
      }
    ]
  }
}

describe('YouTubeRecommendationProvider', () => {
  test('retorna vazio quando não há related', async () => {
    const youtube = createYoutube()

    const provider = new YouTubeRecommendationProvider(youtube)

    assert.deepEqual(await provider.getRelated('A'), [])
  })

  test('retorna vazio quando não existe a shelf esperada', async () => {
    const youtube = createYoutube({
      related: {
        contents: [
          {
            type: 'MusicCarouselShelf',
            header: {
              title: {
                text: 'Outra shelf'
              }
            },
            contents: []
          }
        ]
      }
    })

    const provider = new YouTubeRecommendationProvider(youtube)

    assert.deepEqual(await provider.getRelated('A'), [])
  })

  test('mapeia músicas da shelf You might also like', async () => {
    const youtube = createYoutube({
      related: createRelatedShelf([
        {
          type: 'MusicResponsiveListItem',
          item_type: 'song',
          id: 'B',
          title: { text: 'Track B' },
          artists: [
            { name: 'Artist 1' },
            { text: 'Artist 2' }
          ],
          album: { name: 'Album' }
        },
        {
          type: 'MusicResponsiveListItem',
          item_type: 'video',
          id: 'C'
        },
        {
          type: 'MusicResponsiveListItem',
          item_type: 'song'
        }
      ])
    })

    const provider = new YouTubeRecommendationProvider(youtube)

    assert.deepEqual(await provider.getRelated('A'), [
      {
        videoId: 'B',
        title: { text: 'Track B' },
        artists: ['Artist 1', 'Artist 2'],
        album: 'Album'
      }
    ])
  })

  test('retorna autoplay video id', async () => {
    const youtube = createYoutube({
      info: {
        autoplay_video_endpoint: {
          payload: {
            videoId: 'next'
          }
        }
      }
    })

    const provider = new YouTubeRecommendationProvider(youtube)

    assert.equal(await provider.getAutoplayVideoId('A'), 'next')
  })

  test('retorna null quando não há autoplay', async () => {
    const youtube = createYoutube({
      info: {}
    })

    const provider = new YouTubeRecommendationProvider(youtube)

    assert.equal(await provider.getAutoplayVideoId('A'), null)
  })
})
