import { PermissionFlagsBits } from 'discord.js'

export default class TextPermissionValidator {
  static validate (botMember, channel) {
    const permissions = channel.permissionsFor(botMember)

    if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
      return {
        valid: false,
        message: 'Não tenho permissão para visualizar este canal.'
      }
    }

    if (!permissions.has(PermissionFlagsBits.SendMessages)) {
      return {
        valid: false,
        message: 'Não tenho permissão para enviar mensagens neste canal.'
      }
    }

    if (!permissions.has(PermissionFlagsBits.EmbedLinks)) {
      return {
        valid: false,
        message: 'Não tenho permissão para enviar embeds neste canal.'
      }
    }

    return {
      valid: true,
      message: null
    }
  }
}
