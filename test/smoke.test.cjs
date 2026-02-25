const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('env example contains required keys', () => {
  const env = fs.readFileSync('.env.example', 'utf8');
  for (const key of ['OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'SUPABASE_URL']) {
    assert.ok(env.includes(key));
  }
});

test('telegram route exists', () => {
  assert.ok(fs.existsSync('src/app/api/telegram/route.ts'));
});
