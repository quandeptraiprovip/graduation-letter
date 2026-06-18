import { parseCsv, rowToCsvLine } from "./csv";
import {
  SHEETS_HELP,
  appendSheetRow,
  readSheetRows,
  sheetsConfigured,
} from "./google-sheets";
import {
  readDataTextOrDefault,
  writeDataText,
  isReadOnlyServerFilesystem,
} from "./persist";
import { storeContribImage } from "./contribution-storage";
import type { ContributionEntry } from "./contribution-display";

export type { ContributionEntry } from "./contribution-display";
export { resolveContribImageSrc } from "./contribution-display";

const TAB = "Contributions";
const HEADERS = ["timestamp", "photoUrl", "sigUrl"];
const INDEX = "contributions.csv";
const EMPTY = `${HEADERS.join(",")}\n`;

const MAX_PHOTO_BYTES = 2_500_000;
const MAX_SIG_BYTES = 800_000;

function makeFileId(timestamp: string, ext: string): string {
  const slug = timestamp.replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}.${ext}`;
}

function byNewest(a: ContributionEntry, b: ContributionEntry) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

function rowToEntry(cols: string[]): ContributionEntry | null {
  const [timestamp, photoUrl, sigUrl] = cols;
  const photo = photoUrl?.trim();
  const sig = sigUrl?.trim();
  if (!photo && !sig) return null;
  return {
    timestamp: timestamp || new Date().toISOString(),
    ...(photo ? { photoUrl: photo } : {}),
    ...(sig ? { sigUrl: sig } : {}),
  };
}

async function listFromCsv(): Promise<ContributionEntry[]> {
  const text = await readDataTextOrDefault(INDEX, EMPTY);
  const rows = parseCsv(text.trim() ? text : EMPTY);
  return rows
    .map((r) => rowToEntry([r.timestamp, r.photoUrl, r.sigUrl]))
    .filter((r): r is ContributionEntry => r !== null)
    .sort(byNewest);
}

export async function listContributions(): Promise<ContributionEntry[]> {
  if (sheetsConfigured()) {
    const rows = await readSheetRows(TAB, HEADERS);
    return rows
      .map((r) => rowToEntry(r))
      .filter((r): r is ContributionEntry => r !== null)
      .sort(byNewest);
  }
  return listFromCsv();
}

export async function appendContribution(input: {
  photo?: Buffer;
  photoExt?: string;
  sig?: Buffer;
}): Promise<ContributionEntry> {
  const hasPhoto = Boolean(input.photo && input.photo.length);
  const hasSig = Boolean(input.sig && input.sig.length);
  if (!hasPhoto && !hasSig) {
    throw new Error("Hãy thêm một bức ảnh hoặc ký tên nhé");
  }
  if (input.photo && input.photo.length > MAX_PHOTO_BYTES) {
    throw new Error("Ảnh quá lớn (tối đa ~2.5MB)");
  }
  if (input.sig && input.sig.length > MAX_SIG_BYTES) {
    throw new Error("Ảnh chữ ký quá lớn");
  }

  const timestamp = new Date().toISOString();
  let photoUrl: string | undefined;
  let sigUrl: string | undefined;

  if (hasPhoto && input.photo) {
    const ext = input.photoExt === "png" ? "png" : "jpg";
    photoUrl = await storeContribImage(
      makeFileId(timestamp, ext),
      input.photo,
      ext === "png" ? "image/png" : "image/jpeg"
    );
  }
  if (hasSig && input.sig) {
    sigUrl = await storeContribImage(
      makeFileId(timestamp, "png"),
      input.sig,
      "image/png"
    );
  }

  const entry: ContributionEntry = {
    timestamp,
    ...(photoUrl ? { photoUrl } : {}),
    ...(sigUrl ? { sigUrl } : {}),
  };

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, [
      entry.timestamp,
      photoUrl ?? "",
      sigUrl ?? "",
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
    photoUrl: photoUrl ?? "",
    sigUrl: sigUrl ?? "",
  });
  const next = trimmedText ? `${trimmedText}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeDataText(INDEX, next, "contributions: update index");
  return entry;
}
