import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

import {
  execute as executePause,
  data as dataPause
} from '../../../src/discord/commands/pause.js'

import {
  execute as executeResume,
  data as dataResume
} from '../../../src/discord/commands/resume.js'

import {
  execute as executeSkip,
  data as dataSkip
} from '../../../src/discord/commands/skip.js'

import {
  execute as executeShuffle,
  data as dataShuffle
} from '../../../src/discord/commands/shuffle.js'

import {
  execute as executePrevious,
  data as dataPrevious
} from '../../../src/discord/commands/previous.js'

import {
  execute as executeAutoplay,
  data as dataAutoplay
} from '../../../src/discord/commands/autoplay.js'

import {
  execute as executeRepeat,
  data as dataRepeat
} from '../../../src/discord/commands/repeat.js'

import {
  execute as executeStop,
  data as dataStop
} from '../../../src/discord/commands/stop.js'

import { RepeatMode } from '../../../src/music/player/RepeatMode.js'

import { createCommandInteraction } from '../../helpers/discord/createCommandInteraction.js'

import { createPlayerMock } from '../../helpers/player/createPlayerMock.js'

import { createPlayerManagerMock } from '../../helpers/player/createPlayerManagerMock.js'

describe('Comandos de controle', () => {
  test('/pause pausa', async () => {
    const player = createPlayerMock({
      paused: false
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction()

    await executePause(interaction, {
      playerManager
    })

    assert.equal(player.calls.pause, 1)

    assert.equal(player.paused, true)
  })

  test('/resume retoma', async () => {
    const player = createPlayerMock({
      paused: true
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction()

    await executeResume(interaction, {
      playerManager
    })

    assert.equal(player.calls.resume, 1)

    assert.equal(player.paused, false)
  })

  test('/skip pula uma música por padrão', async () => {
    const player = createPlayerMock()

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction()

    await executeSkip(interaction, {
      playerManager
    })

    assert.equal(player.calls.skip, 1)
    assert.deepEqual(player.calls.skipAmounts, [1])
  })

  test('/skip aceita uma quantidade específica', async () => {
    const player = createPlayerMock({
      queueSize: 4
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction({
      options: {
        qtd: 3
      }
    })

    await executeSkip(interaction, {
      playerManager
    })

    assert.equal(player.calls.skip, 1)
    assert.deepEqual(player.calls.skipAmounts, [3])
  })

  test('/skip rejeita quantidade maior que a atual mais a fila', async () => {
    const player = createPlayerMock({
      queueSize: 2
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction, calls } = createCommandInteraction({
      options: {
        qtd: 4
      }
    })

    await executeSkip(interaction, {
      playerManager
    })

    assert.equal(player.calls.skip, 0)

    assert.equal(
      calls.reply[0].content,
      'Não é possível pular **4** músicas. Há apenas **3** disponíveis entre a atual e a fila.'
    )
  })

  test('/shuffle embaralha as músicas da fila', async () => {
    const player = createPlayerMock({
      queueSize: 3
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction()

    await executeShuffle(interaction, {
      playerManager
    })

    assert.equal(player.calls.shuffle, 1)
  })

  test('/shuffle exige pelo menos duas músicas na fila', async () => {
    const player = createPlayerMock({
      queueSize: 1
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction, calls } = createCommandInteraction()

    await executeShuffle(interaction, {
      playerManager
    })

    assert.equal(player.calls.shuffle, 1)

    assert.equal(
      calls.reply[0].content,
      'É necessário ter pelo menos duas músicas na fila para embaralhar.'
    )
  })

  test('/autoplay alterna estado', async () => {
    const player = createPlayerMock({
      autoplay: false
    })

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction()

    await executeAutoplay(interaction, {
      playerManager
    })

    assert.deepEqual(player.calls.setAutoplay, [true])
  })

  test('/repeat altera modo', async () => {
    const player = createPlayerMock()

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction({
      options: {
        mode: RepeatMode.QUEUE
      }
    })

    await executeRepeat(interaction, {
      playerManager
    })

    assert.deepEqual(player.calls.setRepeatMode, [RepeatMode.QUEUE])
  })

  test('/stop destrói player', async () => {
    const player = createPlayerMock()

    const playerManager = createPlayerManagerMock(player)

    const { interaction } = createCommandInteraction()

    await executeStop(interaction, {
      playerManager
    })

    assert.deepEqual(playerManager.calls.destroy, ['guild-1'])
  })
})

describe('Validação de canal', () => {
  const commands = [
    [executePause, dataPause.name],
    [executeResume, dataResume.name],
    [executeSkip, dataSkip.name],
    [executeShuffle, dataShuffle.name],
    [executePrevious, dataPrevious.name],
    [executeAutoplay, dataAutoplay.name],
    [executeRepeat, dataRepeat.name],
    [executeStop, dataStop.name]
  ]

  for (const [execute, name] of commands) {
    test(`${name || 'comando'} bloqueia outra call`, async () => {
      const player = createPlayerMock({
        paused: true
      })

      const playerManager = createPlayerManagerMock(player)

      const { interaction, calls } = createCommandInteraction({
        userChannelId: 'voice-2',
        botChannelId: 'voice-1',
        options: {
          mode: RepeatMode.OFF
        }
      })

      await execute(interaction, {
        playerManager
      })

      assert.equal(
        calls.reply[0].content,
        'Você precisa estar no mesmo canal de voz que eu.'
      )
    })
  }
})
