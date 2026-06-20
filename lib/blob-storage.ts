import { get } from "@vercel/blob";

export function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Store Vercel Blob của project đang ở chế độ private — mặc định `private`. */
export function blobAccess(): "public" | "private" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

export async function readBlobPathname(pathname: string): Promise<Buffer> {
  const result = await get(pathname, { access: blobAccess() });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Not found");
  }
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}
