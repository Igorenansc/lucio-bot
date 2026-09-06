import 'dotenv/config'

const {
  DISCORD_TOKEN,
  CLIENT_ID,

  LAVALINK_URL,
  LAVALINK_PASSWORD,
  LAVALINK_SECURE
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
  voice: { idleTimeout: 10_000 }
})
