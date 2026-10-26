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
      reconnectInterval: 5
    }
  },

  // Configuração do autocomplete, limite de caracteres
  // Debounce em ms para evitar chamadas excessivas pro discord
  // Cache pra armazenar resultados
  autocomplete: {
    minQueryLength: 3,
    debounceMs: 250,
    cacheTtl: 30_000,
    limit: 10
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
  return Object.freeze([
    ...new Set(
      String(value)
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ])
}
