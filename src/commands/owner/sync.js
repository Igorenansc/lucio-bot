import { REST } from "@discordjs/rest";
import { Routes } from "discord.js";
import { config } from "dotenv";
import { readdirSync } from "fs";
import path, { resolve } from "path";
import { fileURLToPath } from "url";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

export const data = {
  name: "sync",
  description: "Syncs the slash commands with Discord's API",
};
export async function run(client, interaction, args) {
  console.log(interaction.member?.permissions.has("Administrator"));
  if (interaction.member?.permissions.has("Administrator") || client.owners.includes(interaction.member.id)) {
    try {
      const commands = [];
      const commandsPath = resolve(__dirname, "../");
      const commandFolders = readdirSync(commandsPath).filter(folder => folder !== "owner");

      for (const folder of commandFolders) {
        const files = readdirSync(resolve(__dirname, `${commandsPath}/${folder}`)).filter(file => file.endsWith(".js"));

        for (const file of files) {
          const command = await import(resolve(__dirname, `${commandsPath}/${folder}/${file}`));
          // const command = await import(path.resolve(__dirname, `${commandsPath}/${folder}/${file}`));

          if (command?.data && command?.data?.name !== "sync") {
            console.log(command.data.name);
            commands.push(command.data);
          }
        }
      }

      await rest.put(
        Routes.applicationCommands(process.env.BOT_ID),
        { body: commands });

      console.log("Comandos registrados com sucesso!");
      interaction.reply("Comandos registrados com sucesso!");
    } catch (e) {
      console.error(e);
      interaction.reply("Houve um erro ao registrar os comandos da aplicação.");
    }
  } else {
    interaction.reply("Você não tem permissão para usar esse comando.");
  }
}
