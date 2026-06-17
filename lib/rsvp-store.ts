import { parseCsv, rowToCsvLine } from "./csv";
import { readDataTextOrDefault, writeDataText } from "./persist";

export type RsvpEntry = {
  timestamp: string;
  name: string;
  attend: "yes" | "no";
  message: string;
};

const FILE = "rsvp.csv";
const HEADERS = ["timestamp", "name", "attend", "message"];
const EMPTY = `${HEADERS.join(",")}\n`;

async function readFileContent(): Promise<string> {
  const text = await readDataTextOrDefault(FILE, EMPTY);
  return text.trim() ? text : EMPTY;
}

async function writeFileContent(content: string): Promise<void> {
  await writeDataText(FILE, content, "rsvp: new response");
}

export async function appendRsvp(
  entry: Omit<RsvpEntry, "timestamp"> & { timestamp?: string }
): Promise<RsvpEntry> {
  const full: RsvpEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    name: entry.name.trim(),
    attend: entry.attend,
    message: (entry.message ?? "").trim(),
  };
  if (!full.name || !full.attend) throw new Error("Thiếu thông tin RSVP");
  const text = await readFileContent();
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, full as Record<string, string>);
  const next = trimmed ? `${trimmed}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeFileContent(next);
  return full;
}
