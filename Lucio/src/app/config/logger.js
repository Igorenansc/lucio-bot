import pino from "pino";

const development = process.env.NODE_ENV !== "production";

export const logger = pino({
    level: process.env.LOG_LEVEL ?? (development ? "debug" : "info"),
    transport: development ? {
        target: "pino-pretty",

        options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
        },
    } : undefined,
});