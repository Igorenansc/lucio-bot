import { createPermissions } from './createPermissions.js'

export function createCommandInteraction ({
  query = 'test',
  userChannelId = 'voice-1',
  botChannelId = 'voice-1',
  displayName = 'Test User',
  options = {},
  voicePermissionsDenied = [],
  textPermissionsDenied = [],
  memberPermissions = null
} = {}) {
  const calls = {
    reply: [],
    editReply: [],
    deferReply: 0,
    respond: [],
    fetchMember: []
  }

  const botMember = {
    voice: {
      channelId: botChannelId
    }
  }

  const voiceChannel = userChannelId
    ? {
        id: userChannelId,

        permissionsFor (member) {
          if (member !== botMember) {
            throw new Error('Membro inesperado em permissionsFor()')
          }

          return createPermissions(voicePermissionsDenied)
        }
      }
    : null

  const member = {
    displayName,

    voice: {
      channel: voiceChannel
    }
  }

  const guild = {
    shardId: 0,

    members: {
      me: botMember,

      async fetch (userId) {
        calls.fetchMember.push(userId)

        if (userId !== 'user-1') {
          throw new Error(`Usuário inesperado no mock: ${userId}`)
        }

        return member
      }
    }
  }

  const textChannel = {
    id: 'text-1',

    guild,

    permissionsFor (targetMember) {
      if (targetMember !== botMember) {
        throw new Error('Membro inesperado em permissionsFor()')
      }

      return createPermissions(textPermissionsDenied)
    }
  }

  const interaction = {
    guildId: 'guild-1',

    channel: textChannel,

    user: {
      id: 'user-1',
      username: 'test-user',
      displayName
    },

    member,

    memberPermissions,

    guild,

    options: {
      getString (name) {
        if (name in options) {
          return options[name]
        }

        return query
      },

      getInteger (name) {
        if (name in options) {
          return options[name]
        }

        return null
      },

      getFocused () {
        return query
      }
    },

    async reply (payload) {
      calls.reply.push(payload)
    },

    async deferReply () {
      calls.deferReply++
    },

    async editReply (payload) {
      calls.editReply.push(payload)
    },

    async respond (payload) {
      calls.respond.push(payload)
    }
  }

  return {
    interaction,
    calls
  }
}
