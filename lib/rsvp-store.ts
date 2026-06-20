import { parseCsv, rowToCsvLine } from "./csv";
import {
  SHEETS_HELP,
  appendSheetRow,
  readSheetRows,
  sheetsConfigured,
} from "./google-sheets";
import { readDataTextOrDefault, writeDataText, isReadOnlyServerFilesystem } from "./persist";
import { inviteNameFromSlug } from "./telex-slug";

export type RsvpEntry = {
  timestamp: string;
  name: string;
  attend: "yes" | "no";
  message: string;
  /** Slug link mời (vd. `baor`) — tuỳ chọn. */
  inviteSlug?: string;
};

const TAB = "RSVP";
const HEADERS = ["timestamp", "name", "attend", "message", "inviteSlug"];
const FILE = "rsvp.csv";
const EMPTY = `${HEADERS.join(",")}\n`;

/** Tên khách: ưu tiên decode từ slug link mời, rồi mới tới ô nhập tay. */
function resolveRsvpGuestName(input: {
  name?: string;
  inviteSlug?: string;
}): string {
  const slug = input.inviteSlug?.trim();
  if (slug) {
    const fromSlug = inviteNameFromSlug(slug);
    if (fromSlug) return fromSlug;
  }
  return input.name?.trim() ?? "";
}

function rowToEntry(cols: string[]): RsvpEntry | null {
  const [timestamp, name, attend, message, inviteSlug] = cols;
  if (attend !== "yes" && attend !== "no") return null;
  if (!name?.trim()) return null;
  return {
    timestamp: timestamp || new Date().toISOString(),
    name: name.trim(),
    attend,
    message: (message ?? "").trim(),
    ...(inviteSlug?.trim() ? { inviteSlug: inviteSlug.trim() } : {}),
  };
}

function byNewest(a: RsvpEntry, b: RsvpEntry) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

export async function listRsvps(): Promise<RsvpEntry[]> {
  if (sheetsConfigured()) {
    const rows = await readSheetRows(TAB, HEADERS);
    return rows
      .map((r) => rowToEntry(r))
      .filter((r): r is RsvpEntry => r !== null)
      .sort(byNewest);
  }
  const text = await readDataTextOrDefault(FILE, EMPTY);
  const rows = parseCsv(text.trim() ? text : EMPTY);
  return rows
    .map((r) =>
      rowToEntry([
        r.timestamp,
        r.name,
        r.attend,
        r.message,
        r.inviteSlug ?? "",
      ])
    )
    .filter((r): r is RsvpEntry => r !== null)
    .sort(byNewest);
}

/** RSVP mới nhất cho link mời (slug trong URL). */
export async function findRsvpByInviteSlug(
  slug: string
): Promise<RsvpEntry | null> {
  const want = slug.trim().toLowerCase();
  if (!want) return null;

  const nameFromSlug = inviteNameFromSlug(slug).toLocaleLowerCase("vi-VN");
  const entries = await listRsvps();
  const matches = entries.filter((e) => {
    if (e.inviteSlug?.toLowerCase() === want) return true;
    if (
      !e.inviteSlug &&
      nameFromSlug &&
      e.name.toLocaleLowerCase("vi-VN") === nameFromSlug
    ) {
      return true;
    }
    return false;
  });
  return matches[0] ?? null;
}

export async function appendRsvp(
  entry: Omit<RsvpEntry, "timestamp"> & { timestamp?: string }
): Promise<RsvpEntry> {
  const guestName = resolveRsvpGuestName({
    name: entry.name,
    inviteSlug: entry.inviteSlug,
  });
  const full: RsvpEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    name: guestName,
    attend: entry.attend,
    message: (entry.message ?? "").trim(),
    ...(entry.inviteSlug?.trim()
      ? { inviteSlug: entry.inviteSlug.trim() }
      : {}),
  };
  if (!full.name || !full.attend) throw new Error("Thiếu thông tin RSVP");

  if (sheetsConfigured()) {
    await appendSheetRow(TAB, HEADERS, [
      full.timestamp,
      full.name,
      full.attend,
      full.message,
      full.inviteSlug ?? "",
    ]);
    return full;
  }

  if (isReadOnlyServerFilesystem()) {
    throw new Error(SHEETS_HELP);
  }

  const text = await readDataTextOrDefault(FILE, EMPTY);
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, {
    timestamp: full.timestamp,
    name: full.name,
    attend: full.attend,
    message: full.message,
    inviteSlug: full.inviteSlug ?? "",
  });
  const next = trimmed ? `${trimmed}\n${line}\n` : `${EMPTY}${line}\n`;
  await writeDataText(FILE, next, "rsvp: new response");
  return full;
}
