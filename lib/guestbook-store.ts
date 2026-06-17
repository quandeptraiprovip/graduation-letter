import { parseCsv, rowToCsvLine } from "./csv";
import { readDataTextOrDefault, writeDataText } from "./persist";

export type GuestEntry = {
  timestamp: string;
  name: string;
  emoji: string;
  message: string;
};

const FILE = "guestbook.csv";
const HEADERS = ["timestamp", "name", "emoji", "message"];
const EMPTY = `${HEADERS.join(",")}\n`;

async function readFileContent(): Promise<string> {
  const text = await readDataTextOrDefault(FILE, EMPTY);
  return text.trim() ? text : EMPTY;
}

async function writeFileContent(content: string): Promise<void> {
  await writeDataText(FILE, content, "guestbook: new wish");
}

export async function listGuestbook(): Promise<GuestEntry[]> {
  const text = await readFileContent();
  const rows = parseCsv(text);
  return rows
    .map((r) => ({
      timestamp: r.timestamp,
      name: r.name,
      emoji: r.emoji,
      message: r.message,
    }))
    .filter((r) => r.name && r.message)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
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
  const text = await readFileContent();
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, full);
  const next = trimmed ? `${trimmed}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeFileContent(next);
  return full;
}
