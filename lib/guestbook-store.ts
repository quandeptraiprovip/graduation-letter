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
};

const TAB = "Guestbook";
const HEADERS = ["timestamp", "name", "emoji", "message"];
const FILE = "guestbook.csv";
const EMPTY = `${HEADERS.join(",")}\n`;

function rowToEntry(cols: string[]): GuestEntry | null {
  const [timestamp, name, emoji, message] = cols;
  if (!name?.trim() || !message?.trim()) return null;
  return {
    timestamp: timestamp || new Date().toISOString(),
    name,
    emoji: emoji || "💖",
    message,
  };
}

async function listFromCsv(): Promise<GuestEntry[]> {
  const text = await readDataTextOrDefault(FILE, EMPTY);
  const rows = parseCsv(text.trim() ? text : EMPTY);
  return rows
    .map((r) => rowToEntry([r.timestamp, r.name, r.emoji, r.message]))
    .filter((r): r is GuestEntry => r !== null)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

async function appendToCsv(full: GuestEntry): Promise<void> {
  const text = await readDataTextOrDefault(FILE, EMPTY);
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, full);
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

export async function appendGuestbook(
  entry: Omit<GuestEntry, "timestamp"> & { timestamp?: string }
): Promise<GuestEntry> {
  const full: GuestEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    name: entry.name.trim(),
    emoji: entry.emoji || "💖",
    message: entry.message.trim(),
  };
  if (!full.name || !full.message) {
    throw new Error("Thiếu tên hoặc lời chúc");
  }

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, [
      full.timestamp,
      full.name,
      full.emoji,
      full.message,
    ]);
    return full;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(SHEETS_HELP);
  }

  await appendToCsv(full);
  return full;
}
