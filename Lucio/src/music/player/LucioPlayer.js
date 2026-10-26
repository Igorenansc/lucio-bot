import { EventEmitter } from 'node:events'

import LucioQueue from './LucioQueue.js'

import { RepeatMode } from './RepeatMode.js'

import { logger } from '../../app/config/logger.js'

export default class LucioPlayer extends EventEmitter {
  constructor (shoukakuPlayer, recommendationService, trackResolver) {
    super()

    this.engine = shoukakuPlayer

    this.recommendationService = recommendationService

    this.queue = new LucioQueue()

    this.history = []

    this.logger = logger.child({
      component: 'LucioPlayer',
      guildId: shoukakuPlayer.guildId
    })

    this.currentTrack = null

    this.volume = 10
    this.engine.setGlobalVolume(this.volume)

    this.paused = false

    this.repeatMode = RepeatMode.OFF

    this.autoplay = true

    /*
     * Identifica uma track cuja falha
     * já está sendo processada.
     *
     * Evita que exception + stuck ou
     * eventos duplicados avancem duas
     * músicas da fila.
     */
    this.recoveringTrackKey = null

    this.trackResolver = trackResolver

    this.#registerEngineEvents()
  }

  #registerEngineEvents () {
    this.engine.on('start', data => {
      this.currentTrack = data.track

      this.paused = false

      /*
       * Uma nova track efetivamente
       * começou. Qualquer recuperação
       * anterior terminou.
       */
      this.recoveringTrackKey = null

      this.emit('trackStart', data.track)

      this.logger.info(
        {
          trackId: data.track.info.identifier,
          title: data.track.info.title
        },
        'Track iniciada'
      )
    })

    this.engine.on('end', async data => {
      this.emit('trackEnd', {
        track: data.track,
        reason: data.reason
      })

      this.logger.debug(
        {
          trackId: data.track.info.identifier,
          reason: data.reason
        },
        'Track finalizada'
      )

      /*
       * Falhas são tratadas pelos
       * eventos exception/stuck.
       *
       * Assim evitamos processar
       * duas vezes a mesma faixa.
       */
      if (data.reason !== 'finished') {
        return
      }

      try {
        await this.#handleTrackFinished(data.track)
      } catch (error) {
        this.emit('playbackError', error)

        this.logger.error(
          {
            err: error,
            trackId: data.track?.info?.identifier
          },
          'Erro ao processar fim da track'
        )
      }
    })

    this.engine.on('exception', async data => {
      this.emit('trackException', data)

      this.logger.error(
        {
          trackId: data.track?.info?.identifier,
          exception: data.exception
        },
        'Track apresentou erro'
      )

      try {
        await this.#handlePlaybackFailure(
          data.track ?? this.currentTrack,

          'exception'
        )
      } catch (error) {
        await this.#handleRecoveryError(error, data.track ?? this.currentTrack)
      }
    })

    this.engine.on('stuck', async data => {
      this.emit('trackStuck', data)

      this.logger.warn(
        {
          thresholdMs: data.thresholdMs,
          trackId:
            data.track?.info?.identifier ?? this.currentTrack?.info?.identifier
        },
        'Track travada'
      )

      try {
        await this.#handlePlaybackFailure(
          data.track ?? this.currentTrack,
          'stuck'
        )
      } catch (error) {
        await this.#handleRecoveryError(error, data.track ?? this.currentTrack)
      }
    })

    /*
     * A conexão de voz do Lavalink fechou.
     *
     * Isso também acontece em movimento de canal/troca de região,
     * então o PlayerManager decide, depois de um grace period, se
     * deve destruir ou apenas atualizar a posição.
     */
    this.engine.on('closed', data => {
      this.logger.warn(
        {
          code: data?.code,
          reason: data?.reason,
          byRemote: data?.byRemote
        },
        'Conexão de voz fechada'
      )

      this.emit('connectionClosed', data)
    })
  }

  #stateChanged (type) {
    this.emit('stateChange', {
      type
    })
  }

  async play (track) {
    const resolvedTrack = await this.trackResolver.resolve(track)

    if (!resolvedTrack) {
      throw new Error(`Track não pôde ser resolvida: ${track.info.title}`)
    }

    this.currentTrack = resolvedTrack

    await this.engine.playTrack({
      track: {
        encoded: resolvedTrack.encoded
      }
    })
  }

  async enqueue (track) {
    if (!this.currentTrack) {
      await this.play(track)

      return
    }

    this.queue.add(track)

    this.#stateChanged('queue')
  }

  async enqueueMany (tracks) {
    const pendingTracks = tracks.filter(Boolean)

    if (pendingTracks.length === 0) return

    let queueStartIndex = 0

    if (!this.currentTrack) {
      await this.play(pendingTracks[0])
      queueStartIndex = 1
    }

    const queuedTracks = pendingTracks.slice(queueStartIndex)

    if (queuedTracks.length === 0) return

    this.queue.addMany(queuedTracks)

    /*
     * Uma playlist inteira representa uma única mudança lógica da fila.
     * Não emitimos um stateChange para cada faixa.
     */
    this.#stateChanged('queue')
  }

  addNext (track) {
    this.queue.addNext(track)

    this.#stateChanged('queue')
  }

  async pause () {
    if (this.paused) {
      return
    }

    await this.engine.setPaused(true)

    this.paused = true

    this.#stateChanged('pause')
  }

  async resume () {
    if (!this.paused) {
      return
    }

    await this.engine.setPaused(false)

    this.paused = false

    this.#stateChanged('resume')
  }

  async setVolume (volume) {
    const normalized = Math.max(0, Math.min(100, volume))

    this.volume = normalized >= 0 ? normalized : 1
    await this.engine.setGlobalVolume(this.volume)

    this.#stateChanged('volume')
  }

  setAutoplay (enabled) {
    this.autoplay = Boolean(enabled)

    this.#stateChanged('autoplay')
  }

  setRepeatMode (mode) {
    if (!Object.values(RepeatMode).includes(mode)) {
      throw new TypeError(`RepeatMode inválido: ${mode}`)
    }

    this.repeatMode = mode

    this.#stateChanged('repeat')
  }

  async stop () {
    this.queue.clear()

    this.history.length = 0

    this.currentTrack = null

    this.paused = false

    this.recoveringTrackKey = null

    await this.engine.stopTrack()

    this.#stateChanged('stop')
  }

  #setIdle (previousTrack = this.currentTrack) {
    this.currentTrack = null

    this.paused = false

    this.emit('playerIdle', previousTrack)

    this.logger.debug('Player entrou em estado idle')
  }

  async #handleTrackFinished (track) {
    if (this.repeatMode === RepeatMode.TRACK) {
      await this.play(track)

      return
    }

    this.history.push(track)

    if (this.repeatMode === RepeatMode.QUEUE) this.queue.add(track)

    const nextTrack = await this.#getNextTrack(track)

    if (nextTrack) {
      if (this.queue.isEmpty && this.autoplay) {
        this.logger.debug(
          {
            trackId: nextTrack.info.identifier,
            title: nextTrack.info.title
          },
          'Autoplay selecionou próxima track'
        )
      }

      await this.play(nextTrack)

      return
    }

    this.#setIdle(track)
  }

  async #handlePlaybackFailure (failedTrack, reason) {
    /*
     * Se já entramos em idle ou o player
     * foi parado, um evento atrasado não
     * deve iniciar uma nova recuperação.
     */
    if (!failedTrack || !this.currentTrack) return

    const failedKey = this.#getTrackKey(failedTrack)

    const currentKey = this.#getTrackKey(this.currentTrack)

    /*
     * Exemplo:
     *
     * A falhou
     * → B começou
     * → chega exception atrasado de A
     *
     * B deve continuar normalmente.
     */
    if (failedKey && currentKey && failedKey !== currentKey) {
      this.logger.debug(
        {
          failedTrack: failedKey,
          currentTrack: currentKey,
          reason
        },
        'Evento de falha antigo ignorado'
      )

      return
    }

    /*
     * Exception e stuck podem chegar para
     * a mesma faixa antes de uma nova faixa
     * efetivamente começar.
     */
    if (this.recoveringTrackKey === failedKey) return

    this.recoveringTrackKey = failedKey

    /*
     * A faixa quebrada entra no histórico.
     *
     * Isso também impede que o autoplay
     * recomende imediatamente a mesma faixa.
     */
    this.history.push(failedTrack)

    this.logger.warn(
      {
        trackId: failedKey,
        title: failedTrack.info?.title,
        reason
      },
      'Tentando recuperar playback'
    )

    /*
     * Importante:
     *
     * NÃO usamos #handleTrackFinished().
     *
     * Uma faixa quebrada não deve obedecer
     * RepeatMode.TRACK ou RepeatMode.QUEUE.
     */
    const nextTrack = await this.#getNextTrack(failedTrack)

    if (!nextTrack) {
      await this.engine.stopTrack()

      this.#setIdle(failedTrack)

      this.recoveringTrackKey = null

      return
    }

    await this.play(nextTrack)

    /*
     * O estado será limpo definitivamente
     * quando o evento "start" da nova faixa
     * chegar.
     */
  }

  async #handleRecoveryError (error, failedTrack) {
    this.recoveringTrackKey = null

    this.emit('playbackError', error)

    this.logger.error(
      {
        err: error,
        trackId: failedTrack?.info?.identifier
      },
      'Falha ao recuperar playback'
    )

    /*
     * Se até a recuperação falhou,
     * preferimos um estado consistente
     * de idle a deixar uma track quebrada
     * registrada como atual.
     */
    try {
      await this.engine.stopTrack()
    } catch (stopError) {
      this.logger.error(
        { err: stopError },
        'Falha ao parar engine após erro de recuperação'
      )
    }

    this.#setIdle(failedTrack)
  }

  #getTrackKey (track) {
    return track?.info?.identifier ?? track?.encoded ?? null
  }

  async #getNextTrack (referenceTrack) {
    const nextTrack = this.queue.next()

    if (nextTrack) return nextTrack

    if (!this.autoplay) return null

    const recentTracks = this.history.slice(-20)

    return await this.recommendationService.getNext(
      referenceTrack,
      recentTracks
    )
  }

  async skip (amount = 1) {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new RangeError(
        'A quantidade de músicas a pular deve ser um inteiro maior que zero.'
      )
    }

    const skippedTrack = this.currentTrack

    if (!skippedTrack) return false

    const availableTracks = this.queue.size + 1

    if (amount > availableTracks) {
      throw new RangeError(
        `Não é possível pular ${amount} músicas. Apenas ${availableTracks} estão disponíveis.`
      )
    }

    let lastSkippedTrack = skippedTrack

    this.history.push(skippedTrack)

    /*
     * A faixa atual já conta como a primeira.
     *
     * As demais são removidas diretamente da fila,
     * sem serem resolvidas ou reproduzidas.
     */
    for (let index = 1; index < amount; index++) {
      const queuedTrack = this.queue.next()

      if (!queuedTrack) break

      this.history.push(queuedTrack)

      lastSkippedTrack = queuedTrack
    }

    const nextTrack = await this.#getNextTrack(lastSkippedTrack)

    if (!nextTrack) {
      await this.engine.stopTrack()

      this.#setIdle(lastSkippedTrack)

      return false
    }

    await this.play(nextTrack)

    return true
  }

  shuffle () {
    if (this.queue.size < 2) return false

    this.queue.shuffle()

    this.#stateChanged('queue')

    return true
  }

  async previous () {
    const previousTrack = this.history.pop()

    if (!previousTrack) return false

    /*
     * A música atual não é descartada.
     * Ela volta para o começo da fila.
     */
    if (this.currentTrack) this.queue.addNext(this.currentTrack)

    await this.play(previousTrack)

    return true
  }

  async seek (positionMs) {
    if (!this.currentTrack) {
      throw new Error('Não há nenhuma faixa sendo reproduzida.')
    }

    await this.engine.seekTo(positionMs)
  }

  get position () {
    return this.engine.position ?? 0
  }
}
