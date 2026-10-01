import { createRequire } from 'node:module';
import { pino } from 'pino';
import { config } from '../config.js';

function hasPrettyTransport(): boolean {
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

// Em desenvolvimento os logs saem coloridos; em produção saem em JSON (melhor para Docker/agregadores).
const pretty = config.NODE_ENV !== 'production' && hasPrettyTransport();

export const logger = pino({
  level: config.LOG_LEVEL,
  base: undefined,
  // Nunca registra segredos, mesmo que um objeto de configuração seja logado por engano.
  redact: ['DISCORD_TOKEN', 'SPOTIFY_CLIENT_SECRET', '*.DISCORD_TOKEN', '*.SPOTIFY_CLIENT_SECRET', '*.token'],
  ...(pretty && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

export type Logger = typeof logger;
