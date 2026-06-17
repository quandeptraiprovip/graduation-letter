import { parseCsv, rowToCsvLine } from "./csv";
import {
  SHEETS_HELP,
  appendSheetRow,
  sheetsConfigured,
} from "./google-sheets";
import { readDataTextOrDefault, writeDataText, isReadOnlyServerFilesystem } from "./persist";

export type RsvpEntry = {
  timestamp: string;
  name: string;
  attend: "yes" | "no";
  message: string;
};

const TAB = "RSVP";
const HEADERS = ["timestamp", "name", "attend", "message"];
const FILE = "rsvp.csv";
const EMPTY = `${HEADERS.join(",")}\n`;

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

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, [
      full.timestamp,
      full.name,
      full.attend,
      full.message,
    ]);
    return full;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(SHEETS_HELP);
  }

  const text = await readDataTextOrDefault(FILE, EMPTY);
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, full as Record<string, string>);
  const next = trimmed ? `${trimmed}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeDataText(FILE, next, "rsvp: new response");
  return full;
}
