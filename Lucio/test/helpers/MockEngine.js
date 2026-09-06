import { EventEmitter } from 'node:events'

export default class MockEngine extends EventEmitter {
  constructor () {
    super()

    this.guildId = 'test-guild'

    this.position = 0

    this.paused = false

    this.volume = 100

    this.playTrackCalls = []

    this.stopTrackCalls = 0

    this.setPausedCalls = []

    this.setVolumeCalls = []

    this.seekCalls = []
  }

  async playTrack (payload) {
    this.playTrackCalls.push(payload)
  }

  async stopTrack () {
    this.stopTrackCalls++
  }

  async setPaused (paused) {
    this.paused = paused

    this.setPausedCalls.push(paused)
  }

  async setGlobalVolume (volume) {
    this.volume = volume

    this.setVolumeCalls.push(volume)
  }

  async seekTo (position) {
    this.position = position

    this.seekCalls.push(position)
  }
}
