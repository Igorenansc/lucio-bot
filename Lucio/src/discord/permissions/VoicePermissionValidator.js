import { PermissionFlagsBits } from 'discord.js'

export default class VoicePermissionValidator {
  static validate (botMember, channel) {
    const permissions = channel.permissionsFor(botMember)

    if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
      return {
        valid: false,
        message: 'Não tenho permissão para visualizar esse canal de voz.'
      }
    }

    if (!permissions.has(PermissionFlagsBits.Connect)) {
      return {
        valid: false,
        message: 'Não tenho permissão para entrar nesse canal de voz.'
      }
    }

    if (!permissions.has(PermissionFlagsBits.Speak)) {
      return {
        valid: false,
        message: 'Não tenho permissão para falar nesse canal de voz.'
      }
    }

    return {
      valid: true,
      message: null
    }
  }
}
