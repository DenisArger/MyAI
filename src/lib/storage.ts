import { supabaseAdmin } from "./supabase";
import { env } from "./env";

export async function uploadToStorage(
  path: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
