import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DEV_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  FIXDEV_DATABASE_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_TOKEN: z.string().min(16, 'ADMIN_TOKEN must be at least 16 characters'),
  ALLOW_DEV_API_TOKENS: z.coerce.boolean().default(false),
  TENANT_ROOT_DOMAIN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  WHATSAPP_WORKER_DRY_RUN: z.coerce.boolean().default(false),
  WHATSAPP_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  WHATSAPP_WORKER_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  WHATSAPP_WORKER_RETRY_DELAY_MS: z.coerce.number().int().positive().default(1000),
  WHATSAPP_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  FONNTE_API_URL: z.string().url().optional(),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_MERCHANT_ID: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z.coerce.boolean().default(false),
  PLATFORM_TELEGRAM_BOT_TOKEN: z.string().optional(),
  PLATFORM_TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
  PLATFORM_TELEGRAM_ADMIN_MAP: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DISABLE_HMR: z.coerce.boolean().default(false),
  DOTENV_CONFIG_PATH: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().positive().optional(),
  STORAGE_PROVIDER: z.enum(['local']).default('local'),
  FILE_UPLOAD_DIR: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
