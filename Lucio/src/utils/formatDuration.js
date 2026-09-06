export function formatDuration (milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000)

  const hours = Math.floor(totalSeconds / 3600)

  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const seconds = totalSeconds % 60

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':')
  }

  return [minutes, String(seconds).padStart(2, '0')].join(':')
}
