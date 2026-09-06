import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client, GatewayIntentBits } from 'discord.js'

import { Connectors, Shoukaku } from 'shoukaku'

import CommandManager from '../../discord/commands/CommandManager.js'

import PlayerMessageController from '../../discord/messages/player/PlayerMessageController.js'
import PlayerControlHandler from '../../discord/messages/player/PlayerControlHandler.js'
import QueueMessageHandler from '../../discord/messages/queue/QueueMessageHandler.js'

import InteractionRouter from '../../discord/interactions/InteractionRouter.js'

import PlayerManager from '../../music/player/PlayerManager.js'

import YouTubeRecommendationProvider from '../../music/recommendation/YouTubeRecommendationProvider.js'

import YouTubeSearchProvider from '../../music/search/YouTubeSearchProvider.js'
import AutocompleteService from '../../music/search/AutocompleteService.js'

import YouTubePlaylistProvider from '../../music/search/YouTubePlaylistProvider.js'
import TrackResolver from '../../music/playback/TrackResolver.js'

import PlayerMessageService from '../../discord/messages/player/PlayerMessageService.js'
import QueueMessageService from '../../discord/messages/queue/QueueMessageService.js'

import SearchService from '../../music/search/SearchService.js'
import PlayRequestService from '../../music/playback/PlayRequestService.js'

import VoiceIdleService from '../../voice/VoiceIdleService.js'

import { config } from '../config/config.js'

export async function createDependencies () {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  })

  const shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    config.lavalink.nodes,
    config.lavalink.options
  )

  // Providers
  const youtubeProvider = await YouTubeRecommendationProvider.create()
  const youtubeSearchProvider = await YouTubeSearchProvider.create()
  const youtubePlaylistProvider = await YouTubePlaylistProvider.create()

  const trackResolver = new TrackResolver(shoukaku)

  // Services
  const autocompleteService = new AutocompleteService(
    youtubeSearchProvider,
    config.autocomplete
  )

  const searchService = new SearchService(shoukaku, youtubePlaylistProvider)
  const queueMessageService = new QueueMessageService()
  const playerMessageService = new PlayerMessageService()

  // Controllers
  const playerMessageController = new PlayerMessageController(
    playerMessageService
  )

  // Player
  const playerManager = new PlayerManager(
    shoukaku,
    youtubeProvider,
    playerMessageController,
    trackResolver
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

  // Commands
  const commandManager = new CommandManager({
    playRequestService,
    autocompleteService,
    queueMessageService,
    playerManager
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

    interactionRouter,

    voiceIdleService
  }
}

function getCommandsDirectory () {
  const filename = fileURLToPath(import.meta.url)

  const dirname = path.dirname(filename)

  return path.resolve(dirname, '../../discord/commands')
}
