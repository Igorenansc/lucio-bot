import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { formatDuration } from '../../src/utils/formatDuration.js'

describe('formatDuration', () => {
  test('formata minutos e segundos', () => {
    assert.equal(formatDuration(249_000), '4:09')
    assert.equal(formatDuration(0), '0:00')
    assert.equal(formatDuration(5_000), '0:05')
  })

  test('formata horas com minutos e segundos', () => {
    assert.equal(formatDuration(3_723_000), '1:02:03')
    assert.equal(formatDuration(7_200_000), '2:00:00')
  })

  test('trunca frações de segundo', () => {
    assert.equal(formatDuration(1_999), '0:01')
  })
})
