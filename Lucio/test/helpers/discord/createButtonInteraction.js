import { createPermissions } from './createPermissions.js'

export function createButtonInteraction ({
  customId,
  userChannelId = 'voice-1',
  botChannelId = 'voice-1',
  textPermissionsDenied = []
} = {}) {
  const calls = {
    reply: [],
    deferUpdate: 0,
    update: [],
    delete: 0
  }

  const member = {
    voice: {
      channel: userChannelId
        ? {
            id: userChannelId
          }
        : null
    }
  }

  const botMember = {
    voice: {
      channelId: botChannelId
    }
  }

  const guild = {
    members: {
      me: botMember,

      async fetch (userId) {
        assertUser(userId)

        return member
      }
    }
  }

  const channel = {
    id: 'text-1',

    guild,

    permissionsFor (targetMember) {
      if (targetMember !== botMember) {
        throw new Error('Membro inesperado em permissionsFor()')
      }

      return createPermissions(textPermissionsDenied)
    }
  }

  return {
    calls,

    interaction: {
      customId,

      guildId: 'guild-1',

      channel,

      user: {
        id: 'user-1',
        username: 'test-user'
      },

      guild,

      message: {
        async delete () {
          calls.delete++
        }
      },

      async reply (payload) {
        calls.reply.push(payload)
      },

      async deferUpdate () {
        calls.deferUpdate++
      },

      async update (payload) {
        calls.update.push(payload)
      }
    }
  }
}

function assertUser (userId) {
  if (userId !== 'user-1') {
    throw new Error(`Usuário inesperado no mock: ${userId}`)
  }
}
