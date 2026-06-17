import { parseCsv, rowToCsvLine } from "./csv";
import {
  SHEETS_HELP,
  appendSheetRow,
  readSheetRows,
  sheetsConfigured,
} from "./google-sheets";
import { readDataTextOrDefault, writeDataText, isReadOnlyServerFilesystem } from "./persist";

export type GuestEntry = {
  timestamp: string;
  name: string;
  emoji: string;
  message: string;
  lat?: number;
  lng?: number;
  place?: string;
};

const TAB = "Guestbook";
const HEADERS = [
  "timestamp",
  "name",
  "emoji",
  "message",
  "lat",
  "lng",
  "place",
];
const FILE = "guestbook.csv";
const EMPTY = `${HEADERS.join(",")}\n`;

function parseCoord(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function rowToEntry(cols: string[]): GuestEntry | null {
  const [timestamp, name, emoji, message, lat, lng, place] = cols;
  if (!name?.trim() || !message?.trim()) return null;
  const latN = parseCoord(lat);
  const lngN = parseCoord(lng);
  return {
    timestamp: timestamp || new Date().toISOString(),
    name,
    emoji: emoji || "💖",
    message,
    ...(latN !== undefined && lngN !== undefined ? { lat: latN, lng: lngN } : {}),
    ...(place?.trim() ? { place: place.trim() } : {}),
  };
}

function entryFromRow(r: Record<string, string>): GuestEntry | null {
  return rowToEntry([
    r.timestamp,
    r.name,
    r.emoji,
    r.message,
    r.lat,
    r.lng,
    r.place,
  ]);
}

function entryToRow(full: GuestEntry): string[] {
  return [
    full.timestamp,
    full.name,
    full.emoji,
    full.message,
    full.lat !== undefined ? String(full.lat) : "",
    full.lng !== undefined ? String(full.lng) : "",
    full.place ?? "",
  ];
}

async function listFromCsv(): Promise<GuestEntry[]> {
  const text = await readDataTextOrDefault(FILE, EMPTY);
  const rows = parseCsv(text.trim() ? text : EMPTY);
  return rows
    .map((r) => entryFromRow(r))
    .filter((r): r is GuestEntry => r !== null)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

async function appendToCsv(full: GuestEntry): Promise<void> {
  const text = await readDataTextOrDefault(FILE, EMPTY);
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, {
    timestamp: full.timestamp,
    name: full.name,
    emoji: full.emoji,
    message: full.message,
    lat: full.lat !== undefined ? String(full.lat) : "",
    lng: full.lng !== undefined ? String(full.lng) : "",
    place: full.place ?? "",
  });
  const next = trimmed ? `${trimmed}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeDataText(FILE, next, "guestbook: new wish");
}

export async function listGuestbook(): Promise<GuestEntry[]> {
  if (sheetsConfigured()) {
    const rows = await readSheetRows(TAB, HEADERS);
    return rows
      .map((r) => rowToEntry(r))
      .filter((r): r is GuestEntry => r !== null)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  return listFromCsv();
}

function clampCoord(
  lat: number | undefined,
  lng: number | undefined
): { lat?: number; lng?: number } {
  if (lat === undefined || lng === undefined) return {};
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return {};
  return { lat, lng };
}

export async function appendGuestbook(
  entry: Omit<GuestEntry, "timestamp"> & { timestamp?: string }
): Promise<GuestEntry> {
  const coords = clampCoord(entry.lat, entry.lng);
  const full: GuestEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    name: entry.name.trim(),
    emoji: entry.emoji || "💖",
    message: entry.message.trim(),
    ...coords,
    ...(entry.place?.trim() ? { place: entry.place.trim() } : {}),
  };
  if (!full.name || !full.message) {
    throw new Error("Thiếu tên hoặc lời chúc");
  }

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, entryToRow(full));
    return full;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(SHEETS_HELP);
  }

  await appendToCsv(full);
  return full;
}
