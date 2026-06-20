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
import {
  optimizeContributionPhoto,
  optimizeContributionSignature,
} from "./optimize-contribution-media";
import type { ContributionEntry } from "./contribution-display";
import { inviteNameFromSlug } from "./telex-slug";

export type { ContributionEntry } from "./contribution-display";
export { resolveContribImageSrc } from "./contribution-display";

const TAB = "Contributions";
const HEADERS = ["timestamp", "photoUrl", "sigUrl", "name"];
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
  const [timestamp, photoUrl, sigUrl, name] = cols;
  const photo = photoUrl?.trim();
  const sig = sigUrl?.trim();
  const guestName = name?.trim();
  if (!photo && !sig) return null;
  return {
    timestamp: timestamp || new Date().toISOString(),
    ...(guestName ? { name: guestName } : {}),
    ...(photo ? { photoUrl: photo } : {}),
    ...(sig ? { sigUrl: sig } : {}),
  };
}

function resolveContributorName(input: {
  name?: string;
  inviteSlug?: string;
}): string {
  const fromField = input.name?.trim();
  if (fromField) return fromField;
  const slug = input.inviteSlug?.trim();
  if (slug) {
    const fromSlug = inviteNameFromSlug(slug);
    if (fromSlug) return fromSlug;
  }
  return "";
}

async function listFromCsv(): Promise<ContributionEntry[]> {
  const text = await readDataTextOrDefault(INDEX, EMPTY);
  const rows = parseCsv(text.trim() ? text : EMPTY);
  return rows
    .map((r) =>
      rowToEntry([r.timestamp, r.photoUrl, r.sigUrl, r.name ?? ""])
    )
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
  name?: string;
  inviteSlug?: string;
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
    const { buf, ext } = await optimizeContributionPhoto(
      input.photo,
      input.photoExt
    );
    photoUrl = await storeContribImage(
      makeFileId(timestamp, ext),
      buf,
      ext === "png" ? "image/png" : "image/jpeg"
    );
  }
  if (hasSig && input.sig) {
    const sigBuf = await optimizeContributionSignature(input.sig);
    sigUrl = await storeContribImage(
      makeFileId(timestamp, "png"),
      sigBuf,
      "image/png"
    );
  }

  const guestName = resolveContributorName({
    name: input.name,
    inviteSlug: input.inviteSlug,
  });

  const entry: ContributionEntry = {
    timestamp,
    ...(guestName ? { name: guestName } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(sigUrl ? { sigUrl } : {}),
  };

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, [
      entry.timestamp,
      photoUrl ?? "",
      sigUrl ?? "",
      guestName,
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
    name: guestName,
  });
  const next = trimmedText ? `${trimmedText}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeDataText(INDEX, next, "contributions: update index");
  return entry;
}
