export default class LucioQueue {
  constructor () {
    this.tracks = []
  }

  add (track) {
    this.tracks.push(track)
  }

  addMany (tracks) {
    this.tracks.push(...tracks)
  }

  addNext (track) {
    this.tracks.unshift(track)
  }

  next () {
    return this.tracks.shift() ?? null
  }

  remove (index) {
    if (index < 0 || index >= this.tracks.length) {
      throw new RangeError('Índice inválido.')
    }

    return this.tracks.splice(index, 1)[0]
  }

  clear () {
    this.tracks.length = 0
  }

  shuffle () {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))

      ;[this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]]
    }
  }

  get size () {
    return this.tracks.length
  }

  get isEmpty () {
    return this.tracks.length === 0
  }

  toArray () {
    return [...this.tracks]
  }
}
