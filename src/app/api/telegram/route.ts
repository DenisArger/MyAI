import { openai } from "@/lib/openai";
import { randomUUID } from "node:crypto";
import type {
  ResponseInputMessageItem,
  ResponseInputMessageContentList,
} from "openai/resources/responses/responses";
import { env, requireEnv } from "@/lib/env";
import { addFileToVectorStore } from "@/lib/vector-store";
import { loadRecentMessages, saveMessage } from "@/lib/memory";
import type { ChatRole } from "@/lib/memory";
import {
  downloadFile,
  getFile,
  getFileUrl,
  sendMessage,
  sendVoice,
} from "@/lib/telegram";
import { uploadToStorage } from "@/lib/storage";

export const runtime = "nodejs";

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  text?: string;
  voice?: { file_id: string; mime_type?: string; duration?: number };
  photo?: Array<{ file_id: string; file_size?: number }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
  };
};

function pickLargestPhoto(
  photos: Array<{ file_id: string; file_size?: number }>
) {
  return photos.reduce((best, photo) => {
    if (!best) return photo;
    return (photo.file_size ?? 0) > (best.file_size ?? 0) ? photo : best;
  }, photos[0]);
}

function getSystemPrompt() {
  return [
    "РўС‹ РґСЂСѓР¶РµР»СЋР±РЅС‹Р№ Р°СЃСЃРёСЃС‚РµРЅС‚ РІ Telegram.",
    "РћС‚РІРµС‡Р°Р№ РєСЂР°С‚РєРѕ Рё РїРѕ РґРµР»Сѓ.",
    "Р•СЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РїСЂРёСЃР»Р°Р» РіРѕР»РѕСЃ, РѕС‚РІРµС‡Р°Р№ С‚РµРєСЃС‚РѕРј Рё РіРѕР»РѕСЃРѕРј.",
  ].join(" ");
}

async function transcribeVoice(fileUrl: string, mimeType?: string) {
  const bytes = await downloadFile(fileUrl);
  const file = new File([bytes], "voice.ogg", {
    type: mimeType || "audio/ogg",
  });

  const transcript = await openai.audio.transcriptions.create({
    model: env.OPENAI_STT_MODEL,
    file,
  });

  return transcript.text;
}

async function synthesizeVoice(text: string) {
  const speech = await openai.audio.speech.create({
    model: env.OPENAI_TTS_MODEL,
    voice: "alloy",
    input: text,
    response_format: "mp3",
  });

  return await speech.arrayBuffer();
}

function toInputRole(role: ChatRole): "user" | "system" | "developer" {
  if (role === "assistant") return "developer";
  return role;
}

function makeMessage(
  role: "user" | "system" | "developer",
  content: ResponseInputMessageContentList
): ResponseInputMessageItem {
  return {
    id: randomUUID(),
    type: "message",
    role,
    content,
  };
}

async function respondWithModel(
  chatId: number,
  userText: string,
  imageUrl?: string,
  respondWithVoice = false
) {
  await saveMessage(chatId, "user", userText);

  const history = await loadRecentMessages(chatId, 20);

  const systemContent: ResponseInputMessageContentList = [
    { type: "input_text", text: getSystemPrompt() },
  ];

  const userContent: ResponseInputMessageContentList = imageUrl
    ? [
        { type: "input_text", text: userText },
        { type: "input_image", image_url: imageUrl, detail: "auto" },
      ]
    : [{ type: "input_text", text: userText }];

  const historyItems = history.map((msg) =>
    makeMessage(toInputRole(msg.role), [
      { type: "input_text", text: msg.content },
    ])
  );

  const input: ResponseInputMessageItem[] = [
    makeMessage("system", systemContent),
    ...historyItems,
    makeMessage("user", userContent),
  ];

  const response = await openai.responses.create({
    model: env.OPENAI_CHAT_MODEL,
    input,
    tools: env.OPENAI_VECTOR_STORE_ID
      ? [{ type: "file_search", vector_store_ids: [env.OPENAI_VECTOR_STORE_ID] }]
      : [],
  });

    const replyText =
    response.output_text?.trim() ||
    "Не удалось получить ответ от модели.";

  await saveMessage(chatId, "assistant", replyText);
  await sendMessage(chatId, replyText);

  if (respondWithVoice) {
    const audio = await synthesizeVoice(replyText);
    await sendVoice(chatId, audio);
  }
}

async function handleDocument(
  chatId: number,
  document: NonNullable<TelegramMessage["document"]>
) {
  const fileInfo = await getFile(document.file_id);
  if (!fileInfo.file_path) {
    throw new Error("Telegram file_path missing for document.");
  }

  const fileUrl = getFileUrl(fileInfo.file_path);
  const bytes = await downloadFile(fileUrl);
  const fileName = document.file_name ?? "document.bin";
  const storagePath = `${chatId}/${Date.now()}-${fileName}`;

  const publicUrl = await uploadToStorage(
    storagePath,
    bytes,
    document.mime_type ?? "application/octet-stream"
  );

  const openAiFile = await openai.files.create({
    file: new File([bytes], fileName, {
      type: document.mime_type ?? "application/octet-stream",
    }),
    purpose: "assistants",
  });

  await addFileToVectorStore(openAiFile.id);

  await sendMessage(
    chatId,
    `Р”РѕРєСѓРјРµРЅС‚ СЃРѕС…СЂР°РЅРµРЅ. РЎСЃС‹Р»РєР°: ${publicUrl}response.output_text?.trim() || nРњРѕР¶РЅРѕ Р·Р°РґР°РІР°С‚СЊ РІРѕРїСЂРѕСЃС‹ РїРѕ СЃРѕРґРµСЂР¶РёРјРѕРјСѓ.`
  );
}

export async function POST(request: Request) {
  requireEnv("TELEGRAM_BOT_TOKEN");
  requireEnv("OPENAI_API_KEY");
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;

  if (!message) {
    return Response.json({ ok: true });
  }

  const chatId = message.chat.id;

  try {
    if (message.text) {
      await respondWithModel(chatId, message.text);
    } else if (message.voice) {
      const fileInfo = await getFile(message.voice.file_id);
      if (!fileInfo.file_path) {
        throw new Error("Telegram file_path missing for voice.");
      }
      const fileUrl = getFileUrl(fileInfo.file_path);

      let transcript: string;
      try {
        transcript = await transcribeVoice(fileUrl, message.voice.mime_type);
      } catch (err) {
        await sendMessage(
          chatId,
          "РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃРїРѕР·РЅР°С‚СЊ РіРѕР»РѕСЃ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РѕС‚РїСЂР°РІРёС‚СЊ Р°СѓРґРёРѕ РІ С„РѕСЂРјР°С‚Рµ mp3, wav РёР»Рё m4a."
        );
        throw err;
      }

      await respondWithModel(chatId, transcript, undefined, true);
    } else if (message.photo && message.photo.length > 0) {
      const bestPhoto = pickLargestPhoto(message.photo);
      const fileInfo = await getFile(bestPhoto.file_id);
      if (!fileInfo.file_path) {
        throw new Error("Telegram file_path missing for photo.");
      }
      const imageUrl = getFileUrl(fileInfo.file_path);
      await respondWithModel(chatId, "РћРїРёС€Рё РёР·РѕР±СЂР°Р¶РµРЅРёРµ.", imageUrl);
    } else if (message.document) {
      await handleDocument(chatId, message.document);
    } else {
      await sendMessage(chatId, "РЇ РїРѕРЅРёРјР°СЋ С‚РѕР»СЊРєРѕ С‚РµРєСЃС‚, РіРѕР»РѕСЃ, С„РѕС‚Рѕ Рё РґРѕРєСѓРјРµРЅС‚С‹.");
    }
  } catch (error) {
    console.error(error);
    await sendMessage(chatId, "РџСЂРѕРёР·РѕС€Р»Р° РѕС€РёР±РєР°. РџРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.");
  }

  return Response.json({ ok: true });
}



