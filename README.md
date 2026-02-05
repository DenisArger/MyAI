# Telegram Bot + OpenAI + Supabase (Next.js)

## Quick Start
1. Install deps:
```bash
npm install
```

2. Create `.env.local` (copy from `.env.example`) and fill:
```
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_STT_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_VECTOR_STORE_ID=

TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=telegram-bot
```

3. Supabase:
- Create a project and run SQL from `docs/supabase.sql`.
- Create a storage bucket (public): `telegram-bot`.

4. Run dev server:
```bash
npm run dev
```

5. Configure Telegram webhook:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<YOUR_VERCEL_URL>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

## Features
- Text chat with OpenAI Responses API
- Full history stored in Supabase Postgres
- Voice messages: STT + TTS
- Images: vision input
- Documents: stored in Supabase Storage and indexed into OpenAI vector store (optional)

## Notes
- Telegram voice messages are OGG/OPUS. If transcription fails, send audio as mp3/wav/m4a.
- For document Q&A, set `OPENAI_VECTOR_STORE_ID`.
