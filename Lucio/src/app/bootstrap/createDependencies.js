import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client, GatewayIntentBits } from 'discord.js'

import { Connectors, Shoukaku } from 'shoukaku'

import CommandManager from '../../discord/commands/CommandManager.js'

import { registerCommands } from './registerCommands.js'

import OwnerService from '../../discord/permissions/OwnerService.js'

import PlayerMessageController from '../../discord/messages/player/PlayerMessageController.js'
import PlayerControlHandler from '../../discord/messages/player/PlayerControlHandler.js'
import QueueMessageHandler from '../../discord/messages/queue/QueueMessageHandler.js'

import InteractionRouter from '../../discord/interactions/InteractionRouter.js'

import PlayerManager from '../../music/player/PlayerManager.js'
import GuildSettingsService from '../../music/settings/GuildSettingsService.js'

import YouTubeRecommendationProvider from '../../music/recommendation/YouTubeRecommendationProvider.js'

import YouTubeSearchProvider from '../../music/search/YouTubeSearchProvider.js'
import { getYouTubeClient } from '../../music/search/YouTubeClient.js'
import AutocompleteService from '../../music/search/AutocompleteService.js'

import YouTubePlaylistProvider from '../../music/search/YouTubePlaylistProvider.js'
import TrackResolver from '../../music/playback/TrackResolver.js'

import PlayerMessageService from '../../discord/messages/player/PlayerMessageService.js'
import QueueMessageService from '../../discord/messages/queue/QueueMessageService.js'

import SearchService from '../../music/search/SearchService.js'
import PlayRequestService from '../../music/playback/PlayRequestService.js'

import VoiceIdleService from '../../voice/VoiceIdleService.js'
import VoiceStateService from '../../voice/VoiceStateService.js'

import { config } from '../config/config.js'
import { logger } from '../config/logger.js'

const bootstrapLogger = logger.child({
  component: 'Bootstrap'
})

export async function createDependencies () {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  })

  const shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    config.lavalink.nodes,
    config.lavalink.options
  )

  const validOwners = config.owners.filter(id => /^\d{17,20}$/.test(id))

  if (validOwners.length !== config.owners.length) {
    bootstrapLogger.warn(
      {
        invalid: config.owners.length - validOwners.length
      },
      'OWNERS_ID contém IDs inválidos; eles serão ignorados.'
    )
  }

  const ownerService = new OwnerService({
    owners: validOwners
  })

  if (validOwners.length === 0) {
    bootstrapLogger.warn(
      'OWNERS_ID não configurado; comandos de dono ficarão indisponíveis.'
    )
  } else {
    bootstrapLogger.info(
      { count: validOwners.length },
      'Owners configurados'
    )
  }

  // Providers
  /*
   * Uma única instância de Innertube para search, playlist e
   * recommendation. Se ela falhar no boot, o /p (Lavalink)
   * continua funcionando; /yt e autoplay degradam.
   */
  let youtubeClient = null

  try {
    youtubeClient = await getYouTubeClient()
  } catch (error) {
    bootstrapLogger.warn(
      { err: error },
      'YouTube client indisponível; /yt e autoplay ficarão limitados.'
    )
  }

  const youtubeProvider = youtubeClient
    ? new YouTubeRecommendationProvider(youtubeClient)
    : null

  const youtubeSearchProvider = youtubeClient
    ? new YouTubeSearchProvider(youtubeClient)
    : null

  const youtubePlaylistProvider = youtubeClient
    ? new YouTubePlaylistProvider(youtubeClient)
    : null

  const trackResolver = new TrackResolver(shoukaku)

  // Services
  const autocompleteService = new AutocompleteService(
    youtubeSearchProvider,
    config.autocomplete
  )

  const searchService = new SearchService(
    shoukaku,
    youtubePlaylistProvider,
    youtubeSearchProvider
  )
  const queueMessageService = new QueueMessageService()
  const playerMessageService = new PlayerMessageService()

  // Controllers
  const playerMessageController = new PlayerMessageController(
    playerMessageService
  )

  const guildSettings = new GuildSettingsService({
    defaultVolume: config.player.defaultVolume
  })

  // Player
  const playerManager = new PlayerManager(
    shoukaku,
    youtubeProvider,
    playerMessageController,
    trackResolver,
    {
      voiceCloseGraceMs: config.voice.closeGraceMs,
      watchdogIntervalMs: config.voice.watchdogIntervalMs,
      historyLimit: config.player.historyLimit,
      startTimeoutMs: config.player.startTimeoutMs,
      teardownTimeoutMs: config.player.teardownTimeoutMs,
      nodeDownGraceMs: config.player.nodeDownGraceMs,
      guildSettings
    }
  )

  const playRequestService = new PlayRequestService({
    playerManager,
    searchService
  })

  // Services que dependem de PlayerManager
  const voiceIdleService = new VoiceIdleService({
    playerManager,
    timeout: config.voice.idleTimeout
  })

  const voiceStateService = new VoiceStateService({
    client,
    playerManager,
    voiceIdleService
  })

  playerManager.startWatchdog()

  // Commands
  const commandManager = new CommandManager({
    playRequestService,
    autocompleteService,
    queueMessageService,
    playerManager,
    ownerService,
    registerCommands
  })

  await commandManager.loadFrom(getCommandsDirectory())

  // Handlers
  const queueMessageHandler = new QueueMessageHandler({
    playerManager,
    queueMessageService
  })

  const playerControlHandler = new PlayerControlHandler({
    playerManager,
    playerMessageController,
    queueMessageService
  })

  // Router
  const interactionRouter = new InteractionRouter({
    commandManager,
    playerControlHandler,
    queueMessageHandler
  })

  return {
    client,
    shoukaku,

    commandManager,
    playerManager,
    ownerService,

    interactionRouter,

    voiceIdleService,
    voiceStateService
  }
}

function getCommandsDirectory () {
  const filename = fileURLToPath(import.meta.url)

  const dirname = path.dirname(filename)

  return path.resolve(dirname, '../../discord/commands')
}
