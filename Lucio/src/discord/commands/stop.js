import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js'

import VoiceChannelValidator from '../../voice/VoiceChannelValidator.js'

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Encerra a reprodução e desconecta o bot.')

export async function execute (interaction, { playerManager, ownerService }) {
  /*
   * get() devolve null e agenda a destruição de um player
   * inconsistente. Assim /stop responde rápido mesmo quando
   * o bot já está fora do canal de voz.
   */
  const player = playerManager.get(interaction.guildId)

  if (!player) {
    await interaction.reply({
      content: 'Não existe um player ativo neste servidor.',
      flags: MessageFlags.Ephemeral
    })

    return
  }

  const voiceValidation = await VoiceChannelValidator.sameChannel(interaction)

  if (!voiceValidation.valid) {
    /*
     * Se o bot foi movido para outro canal, um moderador ou um
     * dono do bot ainda precisa conseguir encerrar a reprodução.
     */
    const canForce =
      ownerService?.isOwner(interaction.user.id) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)

    if (!canForce) {
      await interaction.reply({
        content: voiceValidation.message,
        flags: MessageFlags.Ephemeral
      })

      return
    }
  }

  await playerManager.destroy(interaction.guildId, 'stop-command')

  await interaction.reply('Reprodução encerrada.')
}
