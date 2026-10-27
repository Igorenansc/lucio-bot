import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import GuildSettingsService from '../../../src/music/settings/GuildSettingsService.js'

describe('GuildSettingsService', () => {
  test('usa o volume padrão para guild sem setting', () => {
    const service = new GuildSettingsService({
      defaultVolume: 10
    })

    assert.deepEqual(service.get('guild-1'), {
      volume: 10
    })
  })

  test('persiste volume por guild em memória', () => {
    const service = new GuildSettingsService()

    service.setVolume('guild-1', 55)

    assert.equal(service.get('guild-1').volume, 55)
    assert.equal(service.get('guild-2').volume, 10)
  })

  test('normaliza volume para 0-100', () => {
    const service = new GuildSettingsService()

    assert.equal(service.setVolume('guild-1', 150), 100)
    assert.equal(service.get('guild-1').volume, 100)

    assert.equal(service.setVolume('guild-1', -20), 0)
    assert.equal(service.get('guild-1').volume, 0)
  })

  test('ignora volume inválido', () => {
    const service = new GuildSettingsService()

    service.setVolume('guild-1', 50)

    assert.equal(service.setVolume('guild-1', 'abc'), 50)
    assert.equal(service.get('guild-1').volume, 50)
  })
})
