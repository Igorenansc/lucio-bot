import 'dotenv/config'

const {
  DISCORD_TOKEN,
  CLIENT_ID,

  LAVALINK_URL,
  LAVALINK_PASSWORD,
  LAVALINK_SECURE,

  OWNERS_ID
} = process.env

const requiredVariables = {
  DISCORD_TOKEN,
  CLIENT_ID,
  LAVALINK_URL,
  LAVALINK_PASSWORD
}

for (const [name, value] of Object.entries(requiredVariables)) {
  if (!value) throw new Error(`${name} não foi definido.`)
}

export const config = Object.freeze({
  discord: {
    token: DISCORD_TOKEN,
    clientId: CLIENT_ID
  },

  /*
   * IDs com acesso elevado ao bot.
   *
   * Aceita vírgula, ponto e vírgula, espaço ou quebra de linha
   * como separador: 123,456  123;456  123 456
   */
  owners: parseIdList(OWNERS_ID),

  lavalink: {
    nodes: [
      {
        name: 'local',
        url: LAVALINK_URL,
        auth: LAVALINK_PASSWORD,
        secure: LAVALINK_SECURE === 'true'
      }
    ],

    options: {
      resume: true,
      resumeTimeout: 30,
      reconnectTries: 5,
      reconnectInterval: 5,

      // Evita que um stop/leave em node morto bloqueie o lifecycle
      // da guild por 60 s (default do Shoukaku).
      restTimeout: 10
    }
  },

  // Configuração do autocomplete, limite de caracteres
  // Debounce em ms para evitar chamadas excessivas pro discord
  // Cache pra armazenar resultados
  autocomplete: {
    minQueryLength: 3,
    debounceMs: 250,
    cacheTtl: 30_000,
    limit: 10,
    timeoutMs: 2_000,
    maxCacheEntries: 500
  },

  player: {
    // Volume inicial de uma guild que ainda não tem setting.
    defaultVolume: 10,

    // Quantidade máxima de faixas mantidas para /previous e autoplay.
    historyLimit: 50,

    // Tempo máximo entre o playTrack aceito e o evento start.
    startTimeoutMs: 10_000,

    // Tempo máximo para stop/leave durante o teardown.
    teardownTimeoutMs: 12_000,

    // Tempo de tolerância com o node do Lavalink desconectado
    // antes de o watchdog destruir os players daquela guild.
    nodeDownGraceMs: 60_000
  },

  // Tempo em milisegundos pro bot sair de um call onde esteja sozinho.
  voice: {
    idleTimeout: 10_000,

    // Espera antes de decidir se um WebSocketClosedEvent foi movimento
    // de canal/troca de região ou uma desconexão de verdade.
    closeGraceMs: 1_500,

    // Intervalo do watchdog que reconcilia players com o estado real
    // das conexões do Shoukaku.
    watchdogIntervalMs: 30_000
  }
})

export function parseIdList (value = '') {
  const normalized = String(value)
    .replace(/^\s*\[/, '')
    .replace(/\]\s*$/, '')
    .replace(/["']/g, '')

  return Object.freeze([
    ...new Set(
      normalized
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ])
}
