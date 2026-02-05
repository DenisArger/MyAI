export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
  OPENAI_STT_MODEL: process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe",
  OPENAI_TTS_MODEL: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
  OPENAI_VECTOR_STORE_ID: process.env.OPENAI_VECTOR_STORE_ID ?? "",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET ?? "telegram-bot",
};

export function requireEnv(name: keyof typeof env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
