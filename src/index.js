import { Player } from 'discord-player';
import { Client, Collection } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: ["Guilds", "GuildMessages", "MessageContent", 'GuildVoiceStates'] });
export const prefix = '!!';

client.commands = new Collection();
client.categories = readdirSync(join(__dirname, './commands'));
client.owners = JSON.parse(process.env.OWNERS);

client.on('ready', () => console.log("I'm Alive"));

// Event Handler
readdirSync(join(__dirname, "./events")).forEach(async file => {
  const eventName = file.split('.')[0];
  const event = (await import(`./events/${file}`)).default;
  
  if (event) {
    client.on(eventName, (...args) => event(client, ...args))
  }
})

// Command Handler
client.categories.forEach(category => {
  const commands = readdirSync(join(__dirname, `./commands/${category}`)).filter(file => file.endsWith('.js'));
  commands.forEach(async command => {
    const cmd = await import(`./commands/${category}/${command}`);
    if(!cmd || !cmd?.data?.name || typeof cmd?.run !== 'function') return;

    client.commands.set(cmd.data.name, cmd)
  })
})

client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  }
});

client.login(process.env.TOKEN);
