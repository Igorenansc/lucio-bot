export default class VoiceChannelValidator {
  static async userInVoice (interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id)

    const channel = member.voice.channel

    if (!channel) {
      return {
        valid: false,
        message: 'Você precisa estar em um canal de voz.'
      }
    }

    return {
      valid: true,
      channel
    }
  }

  static async sameChannel (interaction) {
    const userValidation = await this.userInVoice(interaction)

    if (!userValidation.valid) return userValidation

    const botChannelId = interaction.guild.members.me?.voice.channelId

    if (!botChannelId) {
      return {
        valid: false,
        message: 'Eu não estou conectado a um canal de voz.'
      }
    }

    if (userValidation.channel.id !== botChannelId) {
      return {
        valid: false,
        message: 'Você precisa estar no mesmo canal de voz que eu.'
      }
    }

    return {
      valid: true,
      channel: userValidation.channel
    }
  }
}
