import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { isReadOnlyServerFilesystem } from "./persist";

function dataPath(filename: string) {
  return path.join(process.cwd(), "data", "signatures", filename);
}

export function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function storeSignaturePng(
  filename: string,
  png: Buffer
): Promise<string> {
  if (blobStorageConfigured()) {
    const blob = await put(`signatures/${filename}`, png, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(
      "Trên Vercel cần BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob → Connect) để lưu ảnh chữ ký."
    );
  }

  await fs.mkdir(path.dirname(dataPath(filename)), { recursive: true });
  await fs.writeFile(dataPath(filename), png);
  return filename;
}

export async function readLocalSignaturePng(filename: string): Promise<Buffer> {
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(filename)) {
    throw new Error("Tên file không hợp lệ");
  }
  return fs.readFile(dataPath(filename));
}
