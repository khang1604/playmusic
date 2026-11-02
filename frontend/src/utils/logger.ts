type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL: LogLevel = import.meta.env.DEV ? "DEBUG" : "INFO";

/**
 * Redacts potential sensitive data such as tokens, secret keys, or passwords.
 */
function maskSensitive(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(maskSensitive);
  }
  const masked: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (/token|secret|password|key|auth/i.test(key)) {
      masked[key] = "[REDACTED]";
    } else {
      masked[key] = maskSensitive(val);
    }
  }
  return masked;
}

function formatLog(level: LogLevel, message: string, context?: unknown) {
  if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LEVEL]) return;

  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...(context !== undefined ? { context: maskSensitive(context) } : {})
  };

  const formatted = `[${timestamp}] [${level}] ${message}`;
  switch (level) {
    case "DEBUG":
      console.debug(formatted, entry.context ?? "");
      break;
    case "INFO":
      console.info(formatted, entry.context ?? "");
      break;
    case "WARN":
      console.warn(formatted, entry.context ?? "");
      break;
    case "ERROR":
      console.error(formatted, entry.context ?? "");
      break;
  }
}

export const logger = {
  debug: (msg: string, ctx?: unknown) => formatLog("DEBUG", msg, ctx),
  info: (msg: string, ctx?: unknown) => formatLog("INFO", msg, ctx),
  warn: (msg: string, ctx?: unknown) => formatLog("WARN", msg, ctx),
  error: (msg: string, ctx?: unknown) => formatLog("ERROR", msg, ctx)
};
