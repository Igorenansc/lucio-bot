import LucioPlayer from './LucioPlayer.js'
import RecommendationService from '../recommendation/RecommendationService.js'

import { logger } from '../../app/config/logger.js'

export default class PlayerManager {
  constructor (
    shoukaku,
    youtubeProvider,
    playerMessageController,
    trackResolver,
    {
      voiceCloseGraceMs = 1_500,
      watchdogIntervalMs = 30_000
    } = {}
  ) {
    this.shoukaku = shoukaku

    this.youtubeProvider = youtubeProvider

    this.playerMessageController = playerMessageController

    this.trackResolver = trackResolver

    this.voiceCloseGraceMs = voiceCloseGraceMs

    this.watchdogIntervalMs = watchdogIntervalMs

    this.logger = logger.child({
      component: 'PlayerManager'
    })

    this.players = new Map()

    /*
     * Serializa create/destroy/reconcile por guild.
     *
     * voiceStateUpdate, closed, idle timer e comandos podem
     * concorrer pelo mesmo player. Sem essa fila, um destroy
     * durante um create (ou vice-versa) deixa o estado sujo.
     */
    this.operations = new Map()

    this.closedTimers = new Map()

    this.watchdog = null
  }

  get (guildId) {
    const player = this.players.get(guildId)

    if (!player) return null

    if (!this.isHealthy(guildId)) {
      this.logger.warn(
        { guildId },
        'Player inconsistente; agendando destruição'
      )

      void this.destroy(guildId, 'unhealthy-read').catch(error => {
        this.logger.error(
          {
            err: error,
            guildId
          },
          'Falha ao limpar player inconsistente'
        )
      })

      return null
    }

    return player
  }

  isHealthy (guildId) {
    const connection = this.shoukaku.connections?.get(guildId)

    const engine = this.shoukaku.players?.get(guildId)

    return Boolean(connection?.channelId && engine)
  }

  handleVoiceMove (guildId, channelId) {
    const player = this.players.get(guildId)

    if (!player) return false

    const previous = player.voiceChannelId

    if (previous === channelId) return false

    player.voiceChannelId = channelId

    this.logger.info(
      {
        guildId,
        from: previous,
        to: channelId
      },
      'Bot movido de canal; player preservado'
    )

    return true
  }

  async reconcile (guildId) {
    return await this.#runExclusive(guildId, async () => {
      const player = this.players.get(guildId)

      if (!player) {
        await this.#leaveIfConnected(guildId)

        return null
      }

      if (!this.isHealthy(guildId)) {
        await this.#teardown(guildId, player, 'reconcile')

        return null
      }

      const channelId = this.shoukaku.connections.get(guildId)?.channelId

      if (channelId && player.voiceChannelId !== channelId) {
        player.voiceChannelId = channelId
      }

      return player
    })
  }

  async create ({ guildId, channelId, textChannel, shardId }) {
    return await this.#runExclusive(guildId, async () => {
      const existing = this.players.get(guildId)

      if (existing && this.isHealthy(guildId)) {
        return existing
      }

      if (existing) {
        await this.#teardown(guildId, existing, 'create-replace')
      }

      /*
       * Uma conexão órfã (player do Shoukaku ou voice connection
       * sem LucioPlayer) faria joinVoiceChannel lançar
       * "This guild already have an existing connection".
       */
      await this.#leaveIfConnected(guildId)

      return await this.#create({
        guildId,
        channelId,
        textChannel,
        shardId
      })
    })
  }

  async destroy (guildId, reason = 'manual') {
    return await this.#runExclusive(guildId, async () => {
      const player = this.players.get(guildId)

      if (!player) {
        await this.#leaveIfConnected(guildId)

        return false
      }

      return await this.#teardown(guildId, player, reason)
    })
  }

  startWatchdog () {
    if (this.watchdog) return

    this.watchdog = setInterval(() => {
      void this.sweep()
    }, this.watchdogIntervalMs)

    this.watchdog.unref?.()
  }

  stopWatchdog () {
    if (!this.watchdog) return

    clearInterval(this.watchdog)

    this.watchdog = null
  }

  async sweep () {
    const guildIds = new Set([
      ...this.players.keys(),
      ...(this.shoukaku.connections?.keys() ?? [])
    ])

    for (const guildId of guildIds) {
      try {
        await this.reconcile(guildId)
      } catch (error) {
        this.logger.error(
          {
            err: error,
            guildId
          },
          'Erro ao reconciliar player no watchdog'
        )
      }
    }
  }

  async #create ({ guildId, channelId, textChannel, shardId }) {
    const engine = await this.shoukaku.joinVoiceChannel({
      guildId,
      channelId,
      shardId,
      deaf: true
    })

    const recommendationService = new RecommendationService(
      engine.node,
      this.youtubeProvider
    )

    const player = new LucioPlayer(
      engine,
      recommendationService,
      this.trackResolver
    )

    /*
     * O bot pode ter sido movido enquanto o join ainda estava
     * em andamento. O canal do Shoukaku é a posição mais atual.
     */
    player.voiceChannelId =
      this.shoukaku.connections.get(guildId)?.channelId ?? channelId

    player.on('connectionClosed', data => {
      this.#handleConnectionClosed(guildId, data)
    })

    this.players.set(guildId, player)

    try {
      this.playerMessageController.bind({
        guildId,
        channel: textChannel,
        player
      })
    } catch (error) {
      this.players.delete(guildId)
      player.removeAllListeners('connectionClosed')

      await this.#leaveIfConnected(guildId)

      throw error
    }

    this.logger.info(
      {
        guildId,
        channelId
      },
      'Player criado'
    )

    return player
  }

  async #teardown (guildId, player, reason) {
    /*
     * O estado local é o que os comandos leem.
     *
     * Removemos o player primeiro para que nenhuma leitura
     * enxergue um fantasma enquanto a limpeza remota acontece.
     */
    this.players.delete(guildId)

    this.#clearClosedTimer(guildId)

    /*
     * O player está saindo de cena; não queremos que um closed
     * atrasado, durante o teardown, agende uma nova reconciliação.
     */
    player.removeAllListeners('connectionClosed')

    try {
      player.emit('playerDestroy')
    } catch (error) {
      this.logger.error(
        {
          err: error,
          guildId,
          reason
        },
        'Erro ao emitir playerDestroy'
      )
    }

    try {
      this.playerMessageController.unbind(guildId)
    } catch (error) {
      this.logger.error(
        {
          err: error,
          guildId,
          reason
        },
        'Erro ao desvincular painel'
      )
    }

    /*
     * stop() e leaveVoiceChannel() são melhor esforço.
     *
     * Se o node/WS já morreu, eles podem rejeitar. Isso não
     * pode impedir a limpeza do estado local.
     */
    try {
      await player.stop()
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          guildId,
          reason
        },
        'Falha ao parar player; seguindo com limpeza'
      )
    }

    try {
      await this.shoukaku.leaveVoiceChannel(guildId)
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          guildId,
          reason
        },
        'Falha ao sair do canal; seguindo com limpeza'
      )
    }

    this.logger.info(
      {
        guildId,
        reason
      },
      'Player destruído'
    )

    return true
  }

  async #leaveIfConnected (guildId) {
    const hasConnection = this.shoukaku.connections?.has(guildId)

    const hasEngine = this.shoukaku.players?.has(guildId)

    if (!hasConnection && !hasEngine) return

    try {
      await this.shoukaku.leaveVoiceChannel(guildId)
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          guildId
        },
        'Falha ao limpar conexão órfã'
      )
    }
  }

  #handleConnectionClosed (guildId, data) {
    this.#clearClosedTimer(guildId)

    const timer = setTimeout(() => {
      this.closedTimers.delete(guildId)

      void this.#reconcileAfterClose(guildId, data)
    }, this.voiceCloseGraceMs)

    timer.unref?.()

    this.closedTimers.set(guildId, timer)
  }

  async #reconcileAfterClose (guildId, data) {
    const player = this.players.get(guildId)

    if (!player) return

    /*
     * WebSocketClosedEvent também dispara em movimento de canal
     * e troca de região de voz.
     *
     * Só destruímos se, depois do grace period, não existe
     * conexão saudável. Caso contrário, apenas atualizamos a
     * posição e mantemos a reprodução.
     */
    if (!this.isHealthy(guildId)) {
      await this.destroy(
        guildId,
        `voice-closed:${data?.code ?? 'unknown'}`
      )

      return
    }

    const channelId = this.shoukaku.connections.get(guildId).channelId

    this.handleVoiceMove(guildId, channelId)

    this.logger.info(
      {
        guildId,
        channelId,
        code: data?.code,
        reason: data?.reason
      },
      'Conexão de voz restabelecida; player mantido'
    )
  }

  #clearClosedTimer (guildId) {
    const timer = this.closedTimers.get(guildId)

    if (!timer) return

    clearTimeout(timer)

    this.closedTimers.delete(guildId)
  }

  #runExclusive (guildId, operation) {
    const previous = this.operations.get(guildId) ?? Promise.resolve()

    const current = previous.catch(() => {}).then(operation)

    this.operations.set(guildId, current)

    return current.finally(() => {
      if (this.operations.get(guildId) === current) {
        this.operations.delete(guildId)
      }
    })
  }
}
