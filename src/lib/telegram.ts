import { env } from "./env";

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_BASE = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}`;

export type TelegramFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
};

export async function getFile(fileId: string): Promise<TelegramFile> {
  const res = await fetch(`${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`);
  if (!res.ok) {
    throw new Error(`Telegram getFile failed: ${res.status}`);
  }
  const data = (await res.json()) as { ok: boolean; result: TelegramFile };
  return data.result;
}

export function getFileUrl(filePath: string): string {
  return `${TELEGRAM_FILE_BASE}/${filePath}`;
}

export async function downloadFile(fileUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Telegram file download failed: ${res.status}`);
  }
  return await res.arrayBuffer();
}

export async function sendMessage(
  chatId: number | string,
  text: string
): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function sendVoice(
  chatId: number | string,
  audioBytes: ArrayBuffer,
  filename = "response.mp3"
): Promise<void> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append(
    "voice",
    new File([audioBytes], filename, { type: "audio/mpeg" })
  );

  await fetch(`${TELEGRAM_API_BASE}/sendVoice`, {
    method: "POST",
    body: form,
  });
}
