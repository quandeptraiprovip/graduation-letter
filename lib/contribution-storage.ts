import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { isReadOnlyServerFilesystem } from "./persist";

function dataPath(filename: string) {
  return path.join(process.cwd(), "data", "contributions", filename);
}

export function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function storeContribImage(
  filename: string,
  buf: Buffer,
  contentType: string
): Promise<string> {
  if (blobStorageConfigured()) {
    const blob = await put(`contributions/${filename}`, buf, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(
      "Trên Vercel cần BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob → Connect) để lưu ảnh & chữ ký."
    );
  }

  await fs.mkdir(path.dirname(dataPath(filename)), { recursive: true });
  await fs.writeFile(dataPath(filename), buf);
  return filename;
}

export async function readLocalContribImage(
  filename: string
): Promise<{ buf: Buffer; contentType: string }> {
  if (!/^[a-zA-Z0-9._-]+\.(png|jpg|jpeg)$/i.test(filename)) {
    throw new Error("Tên file không hợp lệ");
  }
  const buf = await fs.readFile(dataPath(filename));
  const ext = filename.toLowerCase().split(".").pop();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  return { buf, contentType };
}
