export function createPlayerMock ({
  currentTrack = true,
  paused = false,
  autoplay = false,
  volume = 50,
  previousResult = true,
  queueSize = 0
} = {}) {
  const calls = {
    enqueue: [],
    enqueueMany: [],
    pause: 0,
    resume: 0,
    skip: 0,
    skipAmounts: [],
    shuffle: 0,
    previous: 0,
    setVolume: [],
    setAutoplay: [],
    setRepeatMode: []
  }

  const player = {
    calls,

    currentTrack: currentTrack
      ? {
          info: {
            title: 'Test Track'
          }
        }
      : null,

    queue: {
      size: queueSize
    },

    paused,
    autoplay,
    volume,

    async enqueue (track) {
      calls.enqueue.push(track)

      if (!this.currentTrack) {
        this.currentTrack = track
      }
    },

    async enqueueMany (tracks) {
      calls.enqueueMany.push(tracks)
      calls.enqueue.push(...tracks)

      if (!this.currentTrack && tracks.length > 0) {
        this.currentTrack = tracks[0]
      }
    },

    async pause () {
      calls.pause++
      this.paused = true
    },

    async resume () {
      calls.resume++
      this.paused = false
    },

    async skip (amount = 1) {
      calls.skip++
      calls.skipAmounts.push(amount)
      return true
    },

    shuffle () {
      calls.shuffle++

      return this.queue.size >= 2
    },

    async previous () {
      calls.previous++

      if (!previousResult) {
        return false
      }

      this.currentTrack = {
        info: {
          title: 'Previous Track'
        }
      }

      return true
    },

    async setVolume (value) {
      calls.setVolume.push(value)
      this.volume = value
    },

    setAutoplay (value) {
      calls.setAutoplay.push(value)
      this.autoplay = value
    },

    setRepeatMode (value) {
      calls.setRepeatMode.push(value)
      this.repeatMode = value
    }
  }

  return player
}
