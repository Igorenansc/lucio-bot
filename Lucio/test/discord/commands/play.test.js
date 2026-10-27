import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import { data, execute } from '../../../src/discord/commands/play.js'

import { createCommandInteraction } from '../../helpers/discord/createCommandInteraction.js'

function createPlayRequestService () {
  const calls = []

  return {
    calls,

    async execute (request) {
      calls.push(request)

      return true
    }
  }
}

describe('/p', () => {
  test('encaminha query para PlayRequestService', async () => {
    const { interaction } = createCommandInteraction({
      query: 'get lucky'
    })

    const playRequestService = createPlayRequestService()

    await execute(interaction, {
      playRequestService
    })

    assert.equal(playRequestService.calls.length, 1)

    assert.equal(playRequestService.calls[0].query, 'get lucky')

    assert.equal(playRequestService.calls[0].interaction, interaction)

    assert.equal(playRequestService.calls[0].searchType, undefined)
  })

  test('não usa autocomplete', () => {
    const option = data.options[0]

    assert.notEqual(option.autocomplete, true)
  })
})
