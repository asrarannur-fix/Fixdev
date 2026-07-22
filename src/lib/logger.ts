/**
 * Structured logger using pino.
 * In production: outputs JSON (ship to log aggregator).
 * In development: pretty-printed via pino-pretty.
 */
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    base: { service: "fixflow-erp" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers['x-admin-token']",
        "*.password",
        "*.serverKey",
        "*.apiToken",
        "*.fonnteToken",
      ],
      censor: "[REDACTED]",
    },
  },
  isDev
    ? pino.transport({ target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } })
    : undefined,
);

/** Per-request child logger — attach tenantId for easy filtering */
export function reqLogger(tenantId?: string, requestId?: string) {
  return logger.child({
    tenantId: tenantId || "unknown",
    requestId: requestId || crypto.randomUUID(),
  });
}
