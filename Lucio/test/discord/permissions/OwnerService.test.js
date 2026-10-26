import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import OwnerService from '../../../src/discord/permissions/OwnerService.js'

describe('OwnerService', () => {
  test('reconhece um dono configurado', () => {
    const service = new OwnerService({
      owners: ['user-1', 'user-2']
    })

    assert.equal(service.isOwner('user-1'), true)
    assert.equal(service.isOwner('user-2'), true)
  })

  test('rejeita usuário fora da lista', () => {
    const service = new OwnerService({
      owners: ['user-1']
    })

    assert.equal(service.isOwner('user-2'), false)
  })

  test('lista vazia rejeita todos', () => {
    const service = new OwnerService()

    assert.equal(service.isOwner('user-1'), false)
  })

  test('rejeita userId vazio', () => {
    const service = new OwnerService({
      owners: ['user-1']
    })

    assert.equal(service.isOwner(null), false)
    assert.equal(service.isOwner(''), false)
  })
})
