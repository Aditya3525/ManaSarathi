import pino from 'pino';

const normalizeLevel = (value?: string | null): pino.LevelWithSilent => {
  if (!value) return 'info';
  const normalized = value.toLowerCase() as pino.LevelWithSilent;
  const allowed: pino.LevelWithSilent[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
  return allowed.includes(normalized) ? normalized : 'info';
};

export const logger = pino({
  level: normalizeLevel(process.env.LOG_LEVEL),
  base: {
    service: 'manasarthi-api'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export const createRequestLogger = (requestId?: string) =>
  logger.child({ requestId });

export const refreshLogLevelFromEnv = (): void => {
  logger.level = normalizeLevel(process.env.LOG_LEVEL);
};
