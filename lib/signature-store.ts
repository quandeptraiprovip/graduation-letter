import { parseCsv, rowToCsvLine } from "./csv";
import {
  readDataBinary,
  readDataTextOrDefault,
  writeDataBinary,
  writeDataText,
} from "./persist";

export type SignatureEntry = {
  timestamp: string;
  name: string;
  file: string;
};

const INDEX = "signatures.csv";
const HEADERS = ["timestamp", "name", "file"];
const EMPTY = `${HEADERS.join(",")}\n`;

function safeFilename(name: string): string {
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(name)) {
    throw new Error("Tên file không hợp lệ");
  }
  return name;
}

async function readIndex(): Promise<string> {
  const text = await readDataTextOrDefault(INDEX, EMPTY);
  return text.trim() ? text : EMPTY;
}

async function writeIndex(content: string): Promise<void> {
  await writeDataText(INDEX, content, "signatures: update index");
}

export async function listSignatures(): Promise<SignatureEntry[]> {
  const text = await readIndex();
  const rows = parseCsv(text);
  return rows
    .map((r) => ({
      timestamp: r.timestamp,
      name: r.name,
      file: r.file,
    }))
    .filter((r) => r.name && r.file)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export async function readSignaturePng(filename: string): Promise<Buffer> {
  const safe = safeFilename(filename);
  return readDataBinary(`signatures/${safe}`);
}

function makeFileId(timestamp: string): string {
  const slug = timestamp.replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}.png`;
}

export async function appendSignature(
  name: string,
  png: Buffer
): Promise<SignatureEntry> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Vui lòng nhập tên");
  if (png.length < 100) throw new Error("Chữ ký quá ngắn");
  if (png.length > 800_000) throw new Error("Ảnh chữ ký quá lớn");

  const timestamp = new Date().toISOString();
  const file = makeFileId(timestamp);
  safeFilename(file);

  await writeDataBinary(
    `signatures/${file}`,
    png,
    `signature: ${trimmed}`
  );

  const entry: SignatureEntry = { timestamp, name: trimmed, file };
  const text = await readIndex();
  const trimmedText = text.trimEnd();
  const line = rowToCsvLine(HEADERS, entry);
  const next = trimmedText
    ? `${trimmedText}\n${line}\n`
    : `${EMPTY}${line}\n`;
  await writeIndex(next);
  return entry;
}
