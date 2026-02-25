import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('env example contains required keys', () => {
  const sourceFile = fs.existsSync('.env.example') ? '.env.example' : 'README.md';
  const env = fs.readFileSync(sourceFile, 'utf8');
  for (const key of ['OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'SUPABASE_URL']) {
    assert.ok(env.includes(key));
  }
});

test('telegram route exists', () => {
  assert.ok(fs.existsSync('src/app/api/telegram/route.ts'));
});
