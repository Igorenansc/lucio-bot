import {
    createDependencies,
} from "./src/app/bootstrap/createDependencies.js";

import {
    registerEvents,
} from "./src/app/events/registerEvents.js";

import {
    config,
} from "./src/app/config/config.js";

import { logger } from "./src/app/config/logger.js";

const shutdownLogger = logger.child({ component: "Shutdown" });

const dependencies =
    await createDependencies();

registerEvents(
    dependencies
);

try {
    await dependencies.client.login(
        config.discord.token
    );
} catch (error) {
    shutdownLogger.fatal(
        { err: error },
        "Falha ao conectar no Discord"
    );

    process.exit(1);
}

let shuttingDown = false;

async function shutdown (signal) {
    if (shuttingDown) return;

    shuttingDown = true;

    shutdownLogger.info({ signal }, "Encerrando bot");

    try {
        dependencies.playerManager.stopWatchdog();

        await dependencies.playerManager.destroyAll("shutdown");
    } catch (error) {
        shutdownLogger.error(
            { err: error },
            "Falha ao limpar players no shutdown"
        );
    }

    try {
        await dependencies.client.destroy();
    } catch (error) {
        shutdownLogger.error(
            { err: error },
            "Falha ao destruir client no shutdown"
        );
    }

    process.exit(0);
}

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("unhandledRejection", error => {
    shutdownLogger.error(
        { err: error },
        "Promise rejeitada sem tratamento"
    );
});

process.on("uncaughtException", error => {
    shutdownLogger.fatal(
        { err: error },
        "Exceção não tratada"
    );

    process.exit(1);
});
