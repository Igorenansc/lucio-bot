import { describe, test } from 'node:test'

import assert from 'node:assert/strict'

const modules = [
  /*
   * App
   */
  '../../src/app/config/config.js',
  '../../src/app/config/logger.js',
  '../../src/app/bootstrap/createDependencies.js',
  '../../src/app/bootstrap/registerCommands.js',
  '../../src/app/events/registerEvents.js',

  /*
   * Discord
   */
  '../../src/discord/commands/CommandManager.js',
  '../../src/discord/commands/play.js',
  '../../src/discord/commands/pause.js',
  '../../src/discord/commands/resume.js',
  '../../src/discord/commands/skip.js',
  '../../src/discord/commands/shuffle.js',
  '../../src/discord/commands/previous.js',
  '../../src/discord/commands/autoplay.js',
  '../../src/discord/commands/repeat.js',
  '../../src/discord/commands/queue.js',
  '../../src/discord/commands/stop.js',
  '../../src/discord/commands/shuffle.js',

  '../../src/discord/interactions/InteractionRouter.js',

  '../../src/discord/messages/player/PlayerMessageService.js',
  '../../src/discord/messages/player/PlayerMessageController.js',
  '../../src/discord/messages/player/PlayerControlHandler.js',

  '../../src/discord/messages/queue/QueueMessageService.js',
  '../../src/discord/messages/queue/QueueMessageHandler.js',

  '../../src/discord/permissions/VoicePermissionValidator.js',
  '../../src/discord/permissions/TextPermissionValidator.js',
  /*
   * Music
   */
  '../../src/music/player/LucioPlayer.js',
  '../../src/music/player/LucioQueue.js',
  '../../src/music/player/PlayerManager.js',
  '../../src/music/player/RepeatMode.js',

  '../../src/music/search/SearchService.js',
  '../../src/music/search/AutocompleteService.js',
  '../../src/music/search/YouTubeSearchProvider.js',
  '../../src/music/search/YouTubePlaylistProvider.js',
  '../../src/music/search/SearchType.js',

  '../../src/music/playback/TrackResolver.js',
  '../../src/music/playback/PlayRequestService.js',
  '../../src/music/playback/LavaLinkNodeResolver.js',

  '../../src/music/recommendation/RecommendationService.js',
  '../../src/music/recommendation/YouTubeRecommendationProvider.js',

  /*
   * Voice
   */
  '../../src/voice/VoiceIdleService.js',
  '../../src/voice/VoiceChannelValidator.js',

  /*
   * Utils
   */
  '../../src/utils/formatDuration.js'
]

describe('Smoke test de imports', () => {
  for (const modulePath of modules) {
    test(`importa ${modulePath}`, async () => {
      const loaded = await import(modulePath)

      assert.ok(loaded)
    })
  }
})
