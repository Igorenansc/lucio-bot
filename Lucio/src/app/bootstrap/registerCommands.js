import { REST, Routes } from 'discord.js'

import { config } from '../config/config.js'

export async function registerCommands (commandManager) {
  const rest = new REST({ version: '10' }).setToken(config.discord.token)

  await rest.put(Routes.applicationCommands(config.discord.clientId), {
    body: commandManager.getCommandData()
  })
}
