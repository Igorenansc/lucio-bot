import { readdir } from 'node:fs/promises'

import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { logger } from '../../app/config/logger.js'

const commandLogger = logger.child({
  component: 'CommandManager'
})

export default class CommandManager {
  constructor (context = {}) {
    this.context = context
    this.commands = new Map()
  }

  register (command) {
    const name = command.data?.name

    if (!name) {
      throw new Error('Comando inválido: propriedade data.name ausente.')
    }

    if (typeof command.execute !== 'function') {
      throw new Error(`Comando "${name}" não possui execute().`)
    }

    if (this.commands.has(name)) {
      throw new Error(`Comando "${name}" já está registrado.`)
    }

    this.commands.set(name, command)
  }

  async loadFrom (directory) {
    const files = await readdir(directory, {
      withFileTypes: true
    })

    for (const file of files) {
      if (
        !file.isFile() ||
        !file.name.endsWith('.js') ||
        file.name === 'CommandManager.js'
      ) {
        continue
      }

      const filePath = path.join(directory, file.name)

      const moduleUrl = pathToFileURL(filePath).href

      const command = await import(moduleUrl)

      this.register(command)

      commandLogger.debug({ command: command.data.name }, 'Comando carregado')
    }
    commandLogger.info({ count: this.commands.size }, 'Comandos carregados')
  }

  get (name) {
    return this.commands.get(name) ?? null
  }

  getCommandData () {
    return [...this.commands.values()].map(command => command.data.toJSON())
  }

  async execute (interaction) {
    const command = this.commands.get(interaction.commandName)

    if (!command) {
      throw new Error(`Comando desconhecido: ${interaction.commandName}`)
    }

    await command.execute(interaction, this.context)
  }

  async executeAutocomplete (interaction) {
    const command = this.commands.get(interaction.commandName)

    if (!command) return

    if (typeof command.autocomplete !== 'function') return

    await command.autocomplete(interaction, this.context)
  }
}
