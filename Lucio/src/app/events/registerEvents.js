import { MessageFlags } from "discord.js";

import { registerCommands } from "../bootstrap/registerCommands.js";

import { logger } from "../config/logger.js";

const discordLogger = logger.child({ component: "Discord" });
const lavalinkLogger = logger.child({ component: "Lavalink" });

export function registerEvents({ client, shoukaku, commandManager, interactionRouter, voiceStateService }) {
    registerShoukakuEvents(shoukaku);

    registerDiscordEvents({
        client,
        commandManager,
        interactionRouter,
        voiceStateService,
    });
}


function registerShoukakuEvents(shoukaku) {
    shoukaku.on("ready", name => {
        lavalinkLogger.info(
            { node: name },
            "Node conectado"
        );
    });

    shoukaku.on("error", (name, error) => {
        lavalinkLogger.error(
            {
                err: error,
                node: name,
            },
            "Erro no node"
        );
    });

    shoukaku.on("disconnect", (name, count) => {
        lavalinkLogger.warn(
            {
                node: name,
                count,
            },
            "Node desconectado"
        );
    });

    shoukaku.on("reconnecting", (name, reconnectsLeft, reconnectInterval) => {
        lavalinkLogger.warn(
            {
                node: name,
                reconnectsLeft,
                reconnectInterval,
            },
            "Reconectando node"
        );
    });
}


function registerDiscordEvents({
    client,
    commandManager,
    interactionRouter,
    voiceStateService,
}) {
    client.once("clientReady", async () => {
        discordLogger.info(
            { user: client.user.tag },
            "Cliente conectado"
        );

        try {
            await registerCommands(commandManager);

            discordLogger.info("Slash commands registrados");

        } catch (error) {
            discordLogger.error(
                { err: error },
                "Erro ao registrar slash commands"
            );
        }
    });


    client.on("error", error => {
        discordLogger.error(
            { err: error },
            "Erro no client Discord"
        );
    });

    client.on("warn", message => {
        discordLogger.warn({ message }, "Aviso do client Discord");
    });

    client.on("interactionCreate", async interaction => {
        try {
            await interactionRouter.handle(interaction);

        } catch (error) {
            await handleInteractionError(interaction, error);
        }
    });


    client.on("voiceStateUpdate", (oldState, newState) => {
        voiceStateService.handle(oldState, newState).catch(error => {
            discordLogger.error(
                {
                    err: error,
                    guildId: oldState.guild?.id ?? newState.guild?.id,
                },
                "Erro ao processar voiceStateUpdate"
            );
        });
    });
}


async function handleInteractionError(interaction, error) {
    discordLogger.error(
        {
            err: error,
            type: interaction.type,
            guildId: interaction.guildId,
            userId: interaction.user?.id,
        },
        "Erro ao processar interação"
    );

    if (interaction.isAutocomplete()) return;

    /*
     * Se a interação já foi reconhecida (deferReply/deferUpdate),
     * editReply em componente pode não ser o canal certo. Um
     * followUp efêmero garante que o usuário veja o erro em vez
     * de ficar com um botão "morto".
     */
    if (interaction.deferred || interaction.replied) {
        try {
            await interaction.followUp({
                content: "Ocorreu um erro ao executar esta ação.",
                flags: MessageFlags.Ephemeral,
            });
        } catch (followUpError) {
            discordLogger.error(
                { err: followUpError },
                "Não foi possível responder ao erro da interação"
            );
        }

        return;
    }

    try {
        await interaction.reply({
            content: "Ocorreu um erro ao executar esta ação.",
            flags: MessageFlags.Ephemeral,
        });

    } catch (replyError) {
        discordLogger.error(
            { err: replyError },
            "Não foi possível responder à interação"
        );
    }
}