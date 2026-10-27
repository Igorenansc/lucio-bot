import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import QueueMessageService from '../../../../src/discord/messages/queue/QueueMessageService.js'

import { createTrack } from '../../../helpers/createTrack.js'

function createPlayer ({
  tracks = [],
  currentTrack = createTrack('now'),
  position = 0,
  autoplay = true
} = {}) {
  return {
    currentTrack,
    position,
    autoplay,
    volume: 10,

    queue: {
      toArray () {
        return tracks
      }
    }
  }
}

function getQueueField (payload) {
  return payload.embeds[0].data.fields.find(
    field => field.name === ':notes: Queue'
  )
}

function getButtons (payload) {
  return payload.components[0].components.map(button => button.data)
}

describe('QueueMessageService', () => {
  test('monta fila vazia sem quebrar', () => {
    const service = new QueueMessageService()

    const payload = service.build(createPlayer())

    assert.equal(payload.embeds.length, 1)

    assert.equal(payload.components.length, 2)

    assert.match(getQueueField(payload).value, /cricket/)

    const page = getButtons(payload).find(
      button => button.custom_id?.startsWith('queue_message_page_display')
    )

    assert.equal(page.label, '1 / 1')
  })

  test('pagina 10 faixas e desabilita botões nas bordas', () => {
    const service = new QueueMessageService()

    const tracks = Array.from({ length: 12 }, (_, index) =>
      createTrack(`track-${index}`)
    )

    const firstPage = service.build(createPlayer({ tracks }))

    const queueText = getQueueField(firstPage).value

    assert.match(queueText, /\*\*1 - \*\*/)
    assert.match(queueText, /\*\*10 - \*\*/)
    assert.doesNotMatch(queueText, /\*\*11 - \*\*/)

    const firstButtons = getButtons(firstPage)

    const previous = firstButtons.find(button =>
      button.custom_id?.startsWith('queue_message_previous')
    )

    const next = firstButtons.find(button =>
      button.custom_id?.startsWith('queue_message_next')
    )

    assert.equal(previous.disabled, true)
    assert.equal(next.disabled, false)

    const secondPage = service.build(createPlayer({ tracks }), 10)

    const secondButtons = getButtons(secondPage)

    const secondPrevious = secondButtons.find(button =>
      button.custom_id?.startsWith('queue_message_previous')
    )

    const secondNext = secondButtons.find(button =>
      button.custom_id?.startsWith('queue_message_next')
    )

    assert.equal(secondPrevious.disabled, false)
    assert.equal(secondNext.disabled, true)
    assert.match(getQueueField(secondPage).value, /\*\*11 - \*\*/)
  })

  test('trunca títulos longos para respeitar o limite do embed', () => {
    const service = new QueueMessageService()

    const tracks = Array.from({ length: 10 }, (_, index) =>
      createTrack(`long-${index}`, {
        title: 'T'.repeat(100)
      })
    )

    const payload = service.build(createPlayer({ tracks }))

    const value = getQueueField(payload).value

    assert.ok(value.length <= 1024)
    assert.match(value, /\.\.\.$/)
  })

  test('mostra AO VIVO para stream', () => {
    const service = new QueueMessageService()

    const track = createTrack('live')

    track.info.isStream = true

    const payload = service.build(
      createPlayer({
        tracks: [track],
        currentTrack: track
      })
    )

    assert.match(getQueueField(payload).value, /AO VIVO/)
    assert.match(payload.embeds[0].data.fields[2].value, /AO VIVO/)
  })

  test('expõe botão de fechar a fila com customId estável', () => {
    const service = new QueueMessageService()

    const payload = service.build(createPlayer())

    const close = getButtons(payload).find(
      button => button.custom_id === 'queue_message_remove'
    )

    assert.equal(close.label, '✖')
  })
})
