import { z } from 'zod';

// Carrega o .env da pasta atual (se existir) sem depender do pacote dotenv.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: as variáveis devem vir do ambiente (Docker, PM2, painel da hospedagem...).
}

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const bool = (fallback: boolean) =>
  z.preprocess(emptyToUndefined, z.stringbool().optional()).transform((v) => v ?? fallback);
const int = (fallback: number, min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional()).transform((v) => v ?? fallback);

const TOKEN_MISSING = 'DISCORD_TOKEN é obrigatório (Developer Portal > sua aplicação > Bot > Reset Token).';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DISCORD_TOKEN: z
    .string({ error: TOKEN_MISSING })
    .trim()
    .min(1, { error: TOKEN_MISSING }),
  DISCORD_GUILD_ID: optionalString,

  SPOTIFY_CLIENT_ID: optionalString,
  SPOTIFY_CLIENT_SECRET: optionalString,

  DEFAULT_VOLUME: int(80, 0, 200),
  MAX_QUEUE_SIZE: int(500, 1, 5000),
  MAX_PLAYLIST_SIZE: int(200, 1, 1000),
  IDLE_TIMEOUT_SECONDS: int(180, 0, 86_400),
  ALONE_TIMEOUT_SECONDS: int(60, 0, 86_400),

});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    console.error(`Configuração inválida no .env:\n${issues}`);
    process.exit(1);
  }
  const config = parsed.data;
  if (Boolean(config.SPOTIFY_CLIENT_ID) !== Boolean(config.SPOTIFY_CLIENT_SECRET)) {
    console.error('Configuração inválida: SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET devem ser informados juntos.');
    process.exit(1);
  }
  return config;
}

export const config = loadConfig();
