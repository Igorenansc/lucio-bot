import {
    createDependencies,
} from "./src/app/bootstrap/createDependencies.js";

import {
    registerEvents,
} from "./src/app/events/registerEvents.js";

import {
    config,
} from "./src/app/config/config.js";


const dependencies =
    await createDependencies();


registerEvents(
    dependencies
);


await dependencies.client.login(
    config.discord.token
);