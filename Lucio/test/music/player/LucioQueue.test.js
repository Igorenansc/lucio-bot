import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import LucioQueue from '../../../src/music/player/LucioQueue.js'

import { createTrack } from '../../helpers/createTrack.js'

describe('LucioQueue', () => {
  test('começa vazia', () => {
    const queue = new LucioQueue()

    assert.equal(queue.size, 0)

    assert.equal(queue.isEmpty, true)
  })

  test('add adiciona ao final', () => {
    const queue = new LucioQueue()

    const a = createTrack('A')

    const b = createTrack('B')

    queue.add(a)
    queue.add(b)

    assert.deepEqual(queue.toArray(), [a, b])
  })

  test('addNext adiciona ao início', () => {
    const queue = new LucioQueue()

    const a = createTrack('A')

    const b = createTrack('B')

    queue.add(a)

    queue.addNext(b)

    assert.deepEqual(queue.toArray(), [b, a])
  })

  test('next remove e retorna a primeira track', () => {
    const queue = new LucioQueue()

    const a = createTrack('A')

    const b = createTrack('B')

    queue.add(a)
    queue.add(b)

    assert.equal(queue.next(), a)

    assert.deepEqual(queue.toArray(), [b])
  })

  test('next retorna null quando vazia', () => {
    const queue = new LucioQueue()

    assert.equal(queue.next(), null)
  })

  test('remove exclui uma posição específica', () => {
    const queue = new LucioQueue()

    const a = createTrack('A')

    const b = createTrack('B')

    const c = createTrack('C')

    queue.add(a)
    queue.add(b)
    queue.add(c)

    const removed = queue.remove(1)

    assert.equal(removed, b)

    assert.deepEqual(queue.toArray(), [a, c])
  })

  test('remove rejeita índice inválido', () => {
    const queue = new LucioQueue()

    assert.throws(() => queue.remove(0), RangeError)
  })

  test('clear esvazia a fila', () => {
    const queue = new LucioQueue()

    queue.add(createTrack('A'))

    queue.add(createTrack('B'))

    queue.clear()

    assert.equal(queue.size, 0)

    assert.equal(queue.isEmpty, true)
  })

  test('shuffle embaralha somente as tracks da fila', () => {
    const queue = new LucioQueue()

    const a = createTrack('A')
    const b = createTrack('B')
    const c = createTrack('C')

    queue.addMany([a, b, c])

    const originalRandom = Math.random

    Math.random = () => 0

    try {
      queue.shuffle()
    } finally {
      Math.random = originalRandom
    }

    assert.deepEqual(queue.toArray(), [b, c, a])
  })

  test('toArray não expõe o array interno', () => {
    const queue = new LucioQueue()

    queue.add(createTrack('A'))

    const copy = queue.toArray()

    copy.length = 0

    assert.equal(queue.size, 1)
  })
})
