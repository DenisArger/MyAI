import { supabaseAdmin } from "./supabase";

export type ChatRole = "user" | "assistant" | "system";

export async function saveMessage(
  chatId: number,
  role: ChatRole,
  content: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("messages").insert({
    chat_id: chatId,
    role,
    content,
  });

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

export async function loadRecentMessages(
  chatId: number,
  limit = 20
): Promise<Array<{ role: ChatRole; content: string }>> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (data ?? []).reverse();
}
