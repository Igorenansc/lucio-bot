import { Client, Collection, GatewayIntentBits } from "discord.js";
import { Connectors, Player } from "shoukaku";
import { Kazagumo } from "kazagumo";
import { config } from "dotenv";
import { readdirSync } from "fs";
import path, { join } from "path";
import { fileURLToPath } from "url";
import autoplay from "./utils/autoplayHandler.js";
import playerMessage from "./utils/playerMessage.js";
import { parseDuration } from "./utils/queueMessage.js";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodes = JSON.parse(process.env.NODES);

const { Guilds, GuildMessages, MessageContent, GuildVoiceStates } = GatewayIntentBits;
const client = new Client({ intents: [Guilds, GuildMessages, MessageContent, GuildVoiceStates]});

client.commands = new Collection();
client.categories = readdirSync(join(__dirname, "./commands"));
client.owners = JSON.parse(process.env.OWNERS);
client.prefix = (process.env?.PREFIX) ? JSON.parse(process.env.PREFIX) : "!!";
client.baseVolume = (process.env?.VOLUME) ? Number(JSON.parse(process.env.VOLUME)) : 2;
client.autoDisconnect = 10000;

client.manager = new Kazagumo({
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchEngine: "youtube",
}, new Connectors.DiscordJS(client), nodes);

client.manager.shoukaku.on('ready', (name) => console.log(`Lavalink ${name}: Ready!`));
client.manager.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
client.manager.shoukaku.on('close', (name, code, reason) => console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
client.manager.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
client.manager.shoukaku.on('disconnect', (name, count) => {
    const players = [...client.manager.shoukaku.players.values()].filter(p => p.node.name === name);
    players.map(player => {
        kazagumo.destroyPlayer(player.guildId);
        player.destroy();
    });
    console.warn(`Lavalink ${name}: Disconnected`);
});

client.manager.on("playerCreate", async (player) => {
  if (client.autoDisconnect) {
    const interval = setInterval(async () => {
      const channel = client.channels.cache.get(player.voiceId);
      const userQty = [...channel.members].length;
      // const userQty = [...client.channels.cache.get(player.voiceId).members].length;
      console.log(`Client luciov3: ${((userQty - 1) <= 0 ? 0 : userQty - 1)} users connected in ${channel.name} on ${client.guilds.cache.get(player.guildId).name}`);
      if (userQty <= 1) await player.delete();
    }, client.autoDisconnect);
    player.autoDisconnect = interval;
  }
});
client.manager.on("playerStart", async (player, track) => {
  playerMessage.create(player, track);
  player.lastVideo = {
    id: track.uri.split("watch?v=")[1],
    requester: track.requester,
  };
  player.metadata.trackStart = {
    time: Date.now(),
  }
  // console.log(client.user)
  // console.log(player.lastVideo.requester)
  if (player.queue.size === 0) await autoplay(player, player.lastVideo.id, player.lastVideo.requester, true);
});
client.manager.on("playerStuck", (player, data) => {
  player.metadata.trackStart.pausedTime = Date.now();
  player.pause(true);
})

client.manager.on("playerDestroy", (player) => {
  if (player.autoDisconnect) clearInterval(player.autoDisconnect);
  playerMessage.delete(player);
});

client.manager.on("playerClosed", playerMessage.delete);
client.manager.on("playerEmpty", autoplay);


// Event: When the bot is ready to start working
/*
client.on("ready", () => {
  client.manager.init(client.user.id);
  console.log(`${client.user.tag} is ready!`);
});
 */

/*
// Event: Handling raw WebSocket events
client.on("raw", data => {
  client.manager.packetUpdate(data);
});
*/

// Event Handler
readdirSync(join(__dirname, "./events")).forEach(async file => {
  const eventName = file.split(".")[0];
  const event = (await import(`./events/${file}`)).default;

  if (event) {
    client.on(eventName, (...args) => event(client, ...args))
  }
})

// Command Handler
client.categories.forEach(category => {
  const commands = readdirSync(join(__dirname, `./commands/${category}`)).filter(file => file.endsWith(".js"));
  commands.forEach(async command => {
    const cmd = await import(`./commands/${category}/${command}`);
    if(!cmd || !cmd?.data?.name || typeof cmd?.run !== "function") return;

    client.commands.set(cmd.data.name, cmd)
  })
})

client.login(process.env.TOKEN);
