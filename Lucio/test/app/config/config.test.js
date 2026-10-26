import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { parseIdList } from '../../../src/app/config/config.js'

describe('parseIdList', () => {
  test('aceita vírgula, ponto e vírgula e espaços', () => {
    assert.deepEqual(
      parseIdList('111,222;333 444'),
      ['111', '222', '333', '444']
    )
  })

  test('aceita quebra de linha e tabs', () => {
    assert.deepEqual(parseIdList('111\n222\t333'), ['111', '222', '333'])
  })

  test('remove vazios e duplicados', () => {
    assert.deepEqual(parseIdList(' 111, 111,, 222, '), ['111', '222'])
  })

  test('valor vazio vira lista vazia', () => {
    assert.deepEqual(parseIdList(''), [])
    assert.deepEqual(parseIdList(undefined), [])
  })
})
