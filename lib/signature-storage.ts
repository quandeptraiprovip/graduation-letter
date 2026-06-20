import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import {
  blobAccess,
  blobStorageConfigured,
  readBlobPathname,
} from "./blob-storage";
import { isReadOnlyServerFilesystem } from "./persist";

function dataPath(filename: string) {
  return path.join(process.cwd(), "data", "signatures", filename);
}

export { blobStorageConfigured };

export async function storeSignaturePng(
  filename: string,
  png: Buffer
): Promise<string> {
  if (blobStorageConfigured()) {
    await put(`signatures/${filename}`, png, {
      access: blobAccess(),
      contentType: "image/png",
      addRandomSuffix: false,
    });
    return filename;
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
  if (blobStorageConfigured()) {
    return readBlobPathname(`signatures/${filename}`);
  }
  return fs.readFile(dataPath(filename));
}
