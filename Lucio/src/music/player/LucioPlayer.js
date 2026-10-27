import { EventEmitter } from 'node:events'

import LucioQueue from './LucioQueue.js'

import { RepeatMode } from './RepeatMode.js'

import { logger } from '../../app/config/logger.js'

export default class LucioPlayer extends EventEmitter {
  constructor (
    shoukakuPlayer,
    recommendationService,
    trackResolver,
    {
      initialVolume = 10,
      historyLimit = 50,
      startTimeoutMs = 10_000
    } = {}
  ) {
    super()

    this.engine = shoukakuPlayer

    this.recommendationService = recommendationService

    this.queue = new LucioQueue()

    this.history = []

    this.historyLimit = historyLimit

    this.logger = logger.child({
      component: 'LucioPlayer',
      guildId: shoukakuPlayer.guildId
    })

    /*
     * currentTrack é a faixa que o Lavalink confirmou.
     *
     * pendingTrack é a faixa já enviada ao engine, mas que
     * ainda não recebeu o evento "start". Ela permite atualizar
     * o painel na hora sem mentir sobre o estado confirmado.
     */
    this.currentTrack = null

    this.pendingTrack = null

    this.expectedTrackKey = null

    this.startedTrackKey = null

    this.startTimer = null

    this.transitionId = 0

    this.startTimeoutMs = startTimeoutMs

    this.volume = initialVolume
    this.engine.setGlobalVolume(this.volume).catch(error => {
      this.logger.warn(
        { err: error, volume: this.volume },
        'Falha ao definir volume inicial'
      )
    })

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
      const trackKey = this.#getTrackKey(data.track)

      /*
       * Start depois de stop/idle não deve ressuscitar o
       * player.
       */
      if (!this.expectedTrackKey) {
        this.logger.debug(
          { trackId: trackKey },
          'Start ignorado sem transição ativa'
        )

        return
      }

      /*
       * Um start atrasado de uma track antiga não pode
       * sobrescrever a track que já está em transição.
       */
      if (
        this.expectedTrackKey &&
        trackKey &&
        this.expectedTrackKey !== trackKey
      ) {
        this.logger.warn(
          {
            expected: this.expectedTrackKey,
            received: trackKey
          },
          'Start de track antiga ignorado'
        )

        return
      }

      this.currentTrack = data.track

      this.pendingTrack = null

      this.startedTrackKey = trackKey

      this.#clearStartTimer()

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
          trackId: data.track?.info?.identifier,
          reason: data.reason
        },
        'Track finalizada'
      )

      /*
       * Já existe uma nova faixa sendo iniciada.
       *
       * Este end pertence à faixa anterior (skip, previous,
       * repeat ou troca de faixa) e não deve avançar a fila
       * outra vez.
       */
      if (this.pendingTrack) {
        this.logger.debug(
          { reason: data.reason },
          'End ignorado: há uma track em transição'
        )

        return
      }

      /*
       * loadFailed não gera TrackExceptionEvent necessariamente.
       * Se fosse ignorado, a faixa ficaria registrada como atual
       * sem nunca ter tocado.
       */
      if (data.reason === 'loadFailed') {
        try {
          await this.#handlePlaybackFailure(
            data.track ?? this.currentTrack,
            'loadFailed'
          )
        } catch (error) {
          await this.#handleRecoveryError(
            error,
            data.track ?? this.currentTrack
          )
        }

        return
      }

      if (data.reason !== 'finished') {
        return
      }

      const endedKey = this.#getTrackKey(data.track)

      const currentKey = this.#getTrackKey(this.currentTrack)

      /*
       * Um end atrasado da track anterior pode chegar depois
       * de uma nova track já ter sido confirmada.
       */
      if (endedKey && currentKey && endedKey !== currentKey) {
        this.logger.debug(
          {
            ended: endedKey,
            current: currentKey
          },
          'End de track antiga ignorado'
        )

        return
      }

      try {
        await this.#handleTrackFinished(data.track)
      } catch (error) {
        await this.#handleTrackEndError(error, data.track)
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

    const trackKey = this.#getTrackKey(resolvedTrack)

    const transitionId = ++this.transitionId

    this.#clearStartTimer()

    this.pendingTrack = resolvedTrack

    this.expectedTrackKey = trackKey

    this.startedTrackKey = null

    /*
     * A UI pode mostrar "Carregando..." imediatamente.
     * currentTrack só é confirmado depois do playTrack
     * ser aceito e, idealmente, depois do evento start.
     */
    this.emit('trackLoading', resolvedTrack)

    try {
      await this.engine.playTrack({
        track: {
          encoded: resolvedTrack.encoded
        }
      })
    } catch (error) {
      if (this.transitionId !== transitionId) {
        this.logger.debug(
          { err: error, trackId: trackKey },
          'Falha de playTrack de transição antiga ignorada'
        )

        return
      }

      this.pendingTrack = null

      this.expectedTrackKey = null

      this.startedTrackKey = null

      this.#clearStartTimer()

      /*
       * O painel pode estar mostrando "Carregando...".
       * Se existe faixa anterior, volta para ela; se não,
       * entra em idle e remove o painel.
       */
      if (this.currentTrack) {
        this.#stateChanged('track')
      } else {
        this.#setIdle(null)
      }

      throw error
    }

    /*
     * Uma nova transição começou enquanto este playTrack
     * ainda estava em andamento. Não sobrescreve o estado
     * da transição mais nova.
     */
    if (this.transitionId !== transitionId) return

    /*
     * O playTrack foi aceito. currentTrack já pode ser
     * exibido, mas o start ainda pode demorar; o timer
     * abaixo cobre esse caso.
     */
    this.currentTrack = resolvedTrack

    this.pendingTrack = null

    this.#stateChanged('track')

    if (this.startedTrackKey !== trackKey) {
      this.#armStartTimer(trackKey)
    }
  }

  async enqueue (track) {
    if (!this.currentTrack && !this.pendingTrack) {
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

    if (!this.currentTrack && !this.pendingTrack) {
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
    this.volume = Math.max(0, Math.min(100, volume))

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
    this.transitionId++

    this.queue.clear()

    this.history.length = 0

    this.currentTrack = null

    this.pendingTrack = null

    this.expectedTrackKey = null

    this.startedTrackKey = null

    this.#clearStartTimer()

    this.paused = false

    this.recoveringTrackKey = null

    await this.engine.stopTrack()

    this.#stateChanged('stop')
  }

  #setIdle (previousTrack = this.currentTrack) {
    this.transitionId++

    this.currentTrack = null

    this.pendingTrack = null

    this.expectedTrackKey = null

    this.startedTrackKey = null

    this.#clearStartTimer()

    this.paused = false

    this.emit('playerIdle', previousTrack)

    this.logger.debug('Player entrou em estado idle')
  }

  async #handleTrackFinished (track) {
    if (this.repeatMode === RepeatMode.TRACK) {
      await this.play(track)

      return
    }

    this.#pushHistory(track)

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
    if (!failedTrack) return

    const failedKey = this.#getTrackKey(failedTrack)

    /*
     * A falha pode ser da faixa que ainda está em
     * transição. Nesse caso ela vira a referência e
     * limpamos o estado pendente antes de recuperar.
     */
    if (this.pendingTrack) {
      const pendingKey = this.#getTrackKey(this.pendingTrack)

      if (failedKey && pendingKey && failedKey !== pendingKey) {
        this.logger.debug(
          {
            failedTrack: failedKey,
            pendingTrack: pendingKey,
            reason
          },
          'Evento de falha de track antiga ignorado'
        )

        return
      }

      if (failedKey === pendingKey) {
        this.currentTrack = this.pendingTrack

        this.pendingTrack = null

        this.expectedTrackKey = null

        this.startedTrackKey = null

        this.#clearStartTimer()
      }
    }

    if (!this.currentTrack) return

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
    this.#pushHistory(failedTrack)

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

    this.pendingTrack = null

    this.expectedTrackKey = null

    this.startedTrackKey = null

    this.#clearStartTimer()

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

  async #handleTrackEndError (error, failedTrack) {
    this.pendingTrack = null

    this.expectedTrackKey = null

    this.startedTrackKey = null

    this.#clearStartTimer()

    this.logger.error(
      {
        err: error,
        trackId: failedTrack?.info?.identifier
      },
      'Erro ao processar fim da track'
    )

    this.emit('playbackError', error)

    try {
      await this.engine.stopTrack()
    } catch (stopError) {
      this.logger.error(
        { err: stopError },
        'Falha ao parar engine após erro de fim de track'
      )
    }

    this.#setIdle(failedTrack ?? this.currentTrack)
  }

  #armStartTimer (trackKey) {
    this.#clearStartTimer()

    this.startTimer = setTimeout(() => {
      this.startTimer = null

      void this.#handleStartTimeout(trackKey)
    }, this.startTimeoutMs)

    this.startTimer.unref?.()
  }

  #clearStartTimer () {
    if (!this.startTimer) return

    clearTimeout(this.startTimer)

    this.startTimer = null
  }

  async #handleStartTimeout (trackKey) {
    if (this.startedTrackKey === trackKey) return

    if (this.expectedTrackKey !== trackKey) return

    const track = this.currentTrack ?? this.pendingTrack

    this.expectedTrackKey = null

    this.startedTrackKey = null

    this.pendingTrack = null

    this.#clearStartTimer()

    const error = new Error(
      `Timeout aguardando o início da track ${trackKey ?? 'desconhecida'}.`
    )

    this.logger.warn({ trackId: trackKey }, 'Timeout aguardando início da track')

    if (!track) {
      this.emit('playbackError', error)

      this.#setIdle(track)

      return
    }

    this.emit('playbackError', error)

    try {
      await this.#handlePlaybackFailure(track, 'start-timeout')
    } catch (recoveryError) {
      await this.#handleRecoveryError(recoveryError, track)
    }
  }

  #pushHistory (track) {
    if (!track) return

    this.history.push(track)

    if (this.history.length <= this.historyLimit) return

    this.history.splice(0, this.history.length - this.historyLimit)
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

    this.#pushHistory(skippedTrack)

    /*
     * A faixa atual já conta como a primeira.
     *
     * As demais são removidas diretamente da fila,
     * sem serem resolvidas ou reproduzidas.
     */
    for (let index = 1; index < amount; index++) {
      const queuedTrack = this.queue.next()

      if (!queuedTrack) break

      this.#pushHistory(queuedTrack)

      lastSkippedTrack = queuedTrack
    }

    const nextTrack = await this.#getNextTrack(lastSkippedTrack)

    if (!nextTrack) {
      await this.engine.stopTrack()

      this.#setIdle(lastSkippedTrack)

      return false
    }

    try {
      await this.play(nextTrack)
    } catch (error) {
      await this.#handleRecoveryError(error, lastSkippedTrack)

      return false
    }

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

    try {
      await this.play(previousTrack)
    } catch (error) {
      await this.#handleRecoveryError(error, previousTrack)

      return false
    }

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
