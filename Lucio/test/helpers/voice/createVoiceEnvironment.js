export function createVoiceEnvironment ({
  guildId = 'guild-1',
  channelId = 'voice-1',
  humans = 0,
  bots = 1
} = {}) {
  const members = []

  for (let i = 0; i < humans; i++) {
    members.push(
      createMember({
        bot: false
      })
    )
  }

  for (let i = 0; i < bots; i++) {
    members.push(
      createMember({
        bot: true
      })
    )
  }

  const channel = {
    id: channelId,

    members: {
      some (callback) {
        return members.some(callback)
      }
    }
  }

  const guild = {
    id: guildId,

    members: {
      me: {
        voice: {
          channel
        }
      }
    }
  }

  return {
    guild,
    channel,
    members,

    addHuman () {
      members.push(
        createMember({
          bot: false
        })
      )
    },

    addBot () {
      members.push(
        createMember({
          bot: true
        })
      )
    },

    removeHumans () {
      for (let i = members.length - 1; i >= 0; i--) {
        if (!members[i].user.bot) {
          members.splice(i, 1)
        }
      }
    },

    disconnectBot () {
      guild.members.me.voice.channel = null
    }
  }
}

export function createVoiceState (guild, channelId) {
  return {
    guild,
    channelId
  }
}

function createMember ({ bot }) {
  return {
    user: {
      bot
    }
  }
}
