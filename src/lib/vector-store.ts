import { openai } from "./openai";
import { env } from "./env";

export async function addFileToVectorStore(openAiFileId: string) {
  if (!env.OPENAI_VECTOR_STORE_ID) {
    return;
  }

  await openai.vectorStores.files.create(env.OPENAI_VECTOR_STORE_ID, {
    file_id: openAiFileId,
  });
}
