import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import LucioPlayer from '../../../src/music/player/LucioPlayer.js'

import { RepeatMode } from '../../../src/music/player/RepeatMode.js'

import MockEngine from '../../helpers/MockEngine.js'

import { createTrack } from '../../helpers/createTrack.js'

function createRecommendationService (recommendation = null) {
  const calls = []

  return {
    calls,

    async getNext (track, history) {
      calls.push({
        track,
        history
      })

      return recommendation
    }
  }
}

function createPlayer (recommendation = null) {
  const engine = new MockEngine()

  const recommendationService = createRecommendationService(recommendation)

  const trackResolver = {
    calls: [],
    async resolve (track) {
      this.calls.push(track)
      return track
    }
  }

  const player = new LucioPlayer(engine, recommendationService, trackResolver)

  return {
    player,
    engine,
    recommendationService,
    trackResolver
  }
}

/*
 * EventEmitter não aguarda listeners async.
 * Isso nos permite esperar o listener "end"
 * terminar antes das assertions.
 */
function flushEvents () {
  return new Promise(resolve => setImmediate(resolve))
}

describe('LucioPlayer', () => {
  test('enqueue inicia imediatamente quando não existe track atual', async () => {
    const { player, engine } = createPlayer()

    const track = createTrack('A')

    await player.enqueue(track)

    assert.equal(player.currentTrack, track)

    assert.deepEqual(engine.playTrackCalls, [
      {
        track: {
          encoded: track.encoded
        }
      }
    ])

    assert.equal(player.queue.size, 0)
  })

  test('enqueue adiciona à fila quando já existe uma track atual', async () => {
    const { player } = createPlayer()

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    assert.equal(player.currentTrack, a)

    assert.deepEqual(player.queue.toArray(), [b])
  })

  test('pause e resume alteram engine e estado', async () => {
    const { player, engine } = createPlayer()

    await player.enqueue(createTrack('A'))

    await player.pause()

    assert.equal(player.paused, true)

    assert.deepEqual(engine.setPausedCalls, [true])

    await player.resume()

    assert.equal(player.paused, false)

    assert.deepEqual(engine.setPausedCalls, [true, false])
  })

  test('volume é limitado entre 0 e 100', async () => {
    const { player, engine } = createPlayer()

    await player.setVolume(150)

    assert.equal(player.volume, 100)

    await player.setVolume(-20)

    assert.equal(player.volume, 0)

    assert.deepEqual(engine.setVolumeCalls, [10, 100, 0])
  })

  test('setRepeatMode rejeita modo inválido', () => {
    const { player } = createPlayer()

    assert.throws(
      () => player.setRepeatMode('banana'),

      TypeError
    )
  })

  test('toca a próxima track quando a atual termina', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    engine.emit('end', {
      track: a,
      reason: 'finished'
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.history, [a])

    assert.equal(player.queue.size, 0)
  })

  test('RepeatMode.TRACK repete a mesma música', async () => {
    const { player, engine } = createPlayer()

    const a = createTrack('A')

    await player.enqueue(a)

    player.setRepeatMode(RepeatMode.TRACK)

    engine.emit('end', {
      track: a,
      reason: 'finished'
    })

    await flushEvents()

    assert.equal(player.currentTrack, a)

    assert.deepEqual(player.history, [])

    assert.equal(engine.playTrackCalls.length, 2)
  })

  test('RepeatMode.QUEUE devolve a track terminada ao final da fila', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    player.setRepeatMode(RepeatMode.QUEUE)

    engine.emit('end', {
      track: a,
      reason: 'finished'
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.queue.toArray(), [a])
  })

  test('autoplay busca recomendação quando a fila acaba', async () => {
    const recommended = createTrack('B')

    const { player, engine, recommendationService } = createPlayer(recommended)

    const a = createTrack('A')

    await player.enqueue(a)

    engine.emit('end', {
      track: a,
      reason: 'finished'
    })

    await flushEvents()

    assert.equal(recommendationService.calls.length, 1)

    assert.equal(recommendationService.calls[0].track, a)

    assert.equal(player.currentTrack, recommended)
  })

  test('entra em idle quando fila termina e autoplay está desligado', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    let idleTrack = null

    player.on('playerIdle', track => {
      idleTrack = track
    })

    await player.enqueue(a)

    engine.emit('end', {
      track: a,
      reason: 'finished'
    })

    await flushEvents()

    assert.equal(player.currentTrack, null)

    assert.equal(idleTrack, a)
  })

  test('skip adiciona atual ao histórico e toca próxima', async () => {
    const { player } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    const result = await player.skip()

    assert.equal(result, true)

    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.history, [a])
  })

  test('skip entra em idle quando não existe próxima track', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    await player.enqueue(a)

    const result = await player.skip()

    assert.equal(result, false)

    assert.equal(player.currentTrack, null)

    assert.equal(engine.stopTrackCalls, 1)
  })

  test('skip pode pular várias músicas sem reproduzir as intermediárias', async () => {
    const { player, trackResolver } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')
    const b = createTrack('B')
    const c = createTrack('C')
    const d = createTrack('D')
    const e = createTrack('E')

    await player.enqueue(a)
    await player.enqueueMany([b, c, d, e])

    const result = await player.skip(3)

    assert.equal(result, true)
    assert.equal(player.currentTrack, d)
    assert.deepEqual(player.history, [a, b, c])
    assert.deepEqual(player.queue.toArray(), [e])

    /*
     * B e C foram descartadas diretamente da fila.
     * Apenas A (enqueue inicial) e D (nova atual) precisaram ser resolvidas.
     */
    assert.deepEqual(trackResolver.calls, [a, d])
  })

  test('skip rejeita quantidade maior que a atual mais a fila', async () => {
    const { player } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')
    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    await assert.rejects(() => player.skip(3), RangeError)

    assert.equal(player.currentTrack, a)
    assert.deepEqual(player.queue.toArray(), [b])
    assert.deepEqual(player.history, [])
  })

  test('shuffle embaralha somente a fila e mantém a track atual', async () => {
    const { player } = createPlayer()

    const a = createTrack('A')
    const b = createTrack('B')
    const c = createTrack('C')
    const d = createTrack('D')

    await player.enqueue(a)
    await player.enqueueMany([b, c, d])

    const originalRandom = Math.random

    Math.random = () => 0

    let stateChange = null

    player.on('stateChange', event => {
      stateChange = event
    })

    try {
      const result = player.shuffle()

      assert.equal(result, true)
    } finally {
      Math.random = originalRandom
    }

    assert.equal(player.currentTrack, a)
    assert.deepEqual(player.queue.toArray(), [c, d, b])
    assert.deepEqual(stateChange, {
      type: 'queue'
    })
  })

  test('shuffle retorna false quando há menos de duas músicas na fila', async () => {
    const { player } = createPlayer()

    const a = createTrack('A')
    const b = createTrack('B')

    await player.enqueue(a)

    assert.equal(player.shuffle(), false)

    await player.enqueue(b)

    assert.equal(player.shuffle(), false)
    assert.equal(player.currentTrack, a)
    assert.deepEqual(player.queue.toArray(), [b])
  })

  test('previous toca a última track do histórico e devolve atual à fila', async () => {
    const { player } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    await player.skip()

    assert.equal(player.currentTrack, b)

    const result = await player.previous()

    assert.equal(result, true)

    assert.equal(player.currentTrack, a)

    assert.deepEqual(player.queue.toArray(), [b])
  })

  test('TrackException avança para próxima música da fila', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Falha simulada'
      }
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.history, [a])

    assert.equal(player.queue.size, 0)
  })

  test('TrackStuck avança para próxima música', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    engine.emit('stuck', {
      track: a,
      thresholdMs: 10_000
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.history, [a])
  })

  test('falha entra em idle quando não há próxima música', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    let idleTrack = null

    player.on('playerIdle', track => {
      idleTrack = track
    })

    await player.enqueue(a)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Falha simulada'
      }
    })

    await flushEvents()

    assert.equal(player.currentTrack, null)

    assert.equal(idleTrack, a)

    assert.equal(engine.stopTrackCalls, 1)

    assert.deepEqual(player.history, [a])
  })

  test('TrackException ignora RepeatMode.TRACK', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    player.setRepeatMode(RepeatMode.TRACK)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Falha simulada'
      }
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    assert.equal(engine.playTrackCalls.length, 2)

    assert.equal(engine.playTrackCalls[1].track.encoded, b.encoded)
  })

  test('TrackException ignora RepeatMode.QUEUE', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    player.setRepeatMode(RepeatMode.QUEUE)

    const a = createTrack('A')

    const b = createTrack('B')

    await player.enqueue(a)
    await player.enqueue(b)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Falha simulada'
      }
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    /*
     * A falhou e não deve voltar
     * para o fim da fila.
     */
    assert.deepEqual(player.queue.toArray(), [])

    assert.deepEqual(player.history, [a])
  })

  test('ignora falha atrasada de uma track que não é mais atual', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    const c = createTrack('C')

    await player.enqueue(a)
    await player.enqueue(b)
    await player.enqueue(c)

    await player.skip()

    assert.equal(player.currentTrack, b)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Evento atrasado'
      }
    })

    await flushEvents()

    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.queue.toArray(), [c])
  })

  test('exception e stuck da mesma track não iniciam duas recuperações', async () => {
    const { player, engine } = createPlayer()

    player.setAutoplay(false)

    const a = createTrack('A')

    const b = createTrack('B')

    const c = createTrack('C')

    await player.enqueue(a)
    await player.enqueue(b)
    await player.enqueue(c)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Falha simulada'
      }
    })

    engine.emit('stuck', {
      track: a,

      thresholdMs: 10_000
    })

    await flushEvents()

    /*
     * Só B deve ter sido consumida.
     * C precisa continuar na fila.
     */
    assert.equal(player.currentTrack, b)

    assert.deepEqual(player.queue.toArray(), [c])

    assert.deepEqual(player.history, [a])
  })

  test('falha usa autoplay quando fila está vazia', async () => {
    const recommended = createTrack('B')

    const { player, engine, recommendationService } = createPlayer(recommended)

    const a = createTrack('A')

    await player.enqueue(a)

    engine.emit('exception', {
      track: a,
      exception: {
        message: 'Falha simulada'
      }
    })

    await flushEvents()

    assert.equal(recommendationService.calls.length, 1)

    assert.equal(recommendationService.calls[0].track, a)

    assert.equal(player.currentTrack, recommended)
  })

  test('play usa TrackResolver antes de enviar track ao engine', async () => {
    const { player, trackResolver } = createPlayer()

    const track = createTrack('A')

    await player.play(track)

    assert.deepEqual(trackResolver.calls, [track])
  })

  test('play substitui track lazy pela versão resolvida', async () => {
    const engine = new MockEngine()

    const recommendationService = createRecommendationService()

    const lazyTrack = {
      encoded: null,

      info: {
        identifier: 'A',

        title: 'Lazy A',

        uri: 'https://www.youtube.com/watch?v=A'
      },

      userData: {
        unresolved: true
      }
    }

    const resolvedTrack = createTrack('A')

    const trackResolver = {
      async resolve () {
        return resolvedTrack
      }
    }

    const player = new LucioPlayer(engine, recommendationService, trackResolver)

    await player.play(lazyTrack)

    assert.equal(player.currentTrack, resolvedTrack)

    assert.equal(engine.playTrackCalls[0].track.encoded, resolvedTrack.encoded)
  })
  test('enqueueMany adiciona playlist com um único stateChange de fila', async () => {
    const { player } = createPlayer()

    const stateChanges = []
    player.on('stateChange', event => stateChanges.push(event))

    const a = createTrack('A')
    const b = createTrack('B')
    const c = createTrack('C')

    await player.enqueueMany([a, b, c])

    assert.equal(player.currentTrack.info.identifier, 'A')
    assert.deepEqual(
      player.queue.toArray().map(track => track.info.identifier),
      ['B', 'C']
    )
    assert.equal(stateChanges.filter(event => event.type === 'queue').length, 1)
  })
})
