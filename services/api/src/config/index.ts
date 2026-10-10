import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  WEB_URL: z.string().url().default('http://localhost:5173'),

  // Supabase — optional in local mode
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string().optional(),

  // Redis — optional in local mode
  REDIS_URL: z.string().optional(),

  // Storage
  STORAGE_BUCKET: z.string().default('capzee-media'),

  // Processing
  CAPZEE_PROCESSING_MODE: z.enum(['local', 'cloud']).default('local'),
  CAPZEE_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(500),
  CAPZEE_MAX_DURATION_SECONDS: z.coerce.number().int().positive().default(1800),
  CAPZEE_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),

  // Whisper
  CAPZEE_WHISPER_MODEL: z.enum(['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']).default('small'),
  CAPZEE_WHISPER_DEVICE: z.enum(['cpu', 'cuda', 'auto']).default('cpu'),
  CAPZEE_WHISPER_COMPUTE_TYPE: z.enum(['int8', 'float32', 'float16', 'int8_float16']).default('int8'),

  // FFmpeg
  CAPZEE_FFMPEG_PATH: z.string().default(''),
  CAPZEE_FFPROBE_PATH: z.string().default(''),
  CAPZEE_TEMP_DIR: z.string().default(''),

  // LLM
  CAPZEE_LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'ollama', 'gemini', 'groq']).default('mock'),
  CAPZEE_LLM_API_KEY: z.string().default(''),
  CAPZEE_LLM_MODEL: z.string().default(''),
  CAPZEE_OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  CAPZEE_OLLAMA_MODEL: z.string().default('llama3.2'),

  // Groq API (Instant Speech-to-Text & LLaMA 3.3)
  GROQ_API_KEY: z.string().default(''),
});

export type AppConfig = z.infer<typeof envSchema>;

function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error('[config] Environment validation failed:\n' + errors);
    process.exit(1);
  }

  const config = result.data;

  // Validate cloud mode requirements
  if (config.CAPZEE_PROCESSING_MODE === 'cloud') {
    const missing: string[] = [];
    if (!config.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!config.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!config.REDIS_URL) missing.push('REDIS_URL');
    if (missing.length > 0) {
      console.error(
        `[config] Cloud mode requires: ${missing.join(', ')}\n` +
        `  Set CAPZEE_PROCESSING_MODE=local for local development.`
      );
      process.exit(1);
    }
  }

  return config;
}

export const config = loadConfig();
