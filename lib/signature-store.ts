import { parseCsv, rowToCsvLine } from "./csv";
import {
  SHEETS_HELP,
  appendSheetRow,
  readSheetRows,
  sheetsConfigured,
} from "./google-sheets";
import { readDataTextOrDefault, writeDataText, isReadOnlyServerFilesystem } from "./persist";
import { readLocalSignaturePng, storeSignaturePng } from "./signature-storage";
import type { SignatureEntry } from "./signature-display";

export type { SignatureEntry } from "./signature-display";
export { resolveSignatureImageSrc } from "./signature-display";

const TAB = "Signatures";
const HEADERS = ["timestamp", "name", "imageUrl"];
const INDEX = "signatures.csv";
const EMPTY = `${HEADERS.join(",")}\n`;

function makeFileId(timestamp: string): string {
  const slug = timestamp.replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}.png`;
}

function rowToEntry(cols: string[]): SignatureEntry | null {
  const [timestamp, name, imageUrl] = cols;
  if (!name?.trim() || !imageUrl?.trim()) return null;
  return { timestamp: timestamp || new Date().toISOString(), name, imageUrl };
}

async function listFromCsv(): Promise<SignatureEntry[]> {
  const text = await readDataTextOrDefault(INDEX, EMPTY);
  const rows = parseCsv(text.trim() ? text : EMPTY);
  return rows
    .map((r) => {
      const url = r.imageUrl || r.file;
      return rowToEntry([r.timestamp, r.name, url]);
    })
    .filter((r): r is SignatureEntry => r !== null)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export async function listSignatures(): Promise<SignatureEntry[]> {
  if (sheetsConfigured()) {
    const rows = await readSheetRows(TAB, HEADERS);
    return rows
      .map((r) => rowToEntry(r))
      .filter((r): r is SignatureEntry => r !== null)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  return listFromCsv();
}

export async function readSignaturePng(filename: string): Promise<Buffer> {
  return readLocalSignaturePng(filename);
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
  const imageUrl = await storeSignaturePng(file, png);
  const entry: SignatureEntry = { timestamp, name: trimmed, imageUrl };

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, [
      entry.timestamp,
      entry.name,
      entry.imageUrl,
    ]);
    return entry;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(SHEETS_HELP);
  }

  const text = await readDataTextOrDefault(INDEX, EMPTY);
  const trimmedText = text.trimEnd();
  const line = rowToCsvLine(HEADERS, {
    timestamp: entry.timestamp,
    name: entry.name,
    imageUrl: entry.imageUrl,
  });
  const next = trimmedText
    ? `${trimmedText}\n${line}\n`
    : `${EMPTY}${line}\n`;
  await writeDataText(INDEX, next, "signatures: update index");
  return entry;
}

