import { google, type sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const SHEETS_HELP =
  "Cần GOOGLE_SHEETS_ID và GOOGLE_SERVICE_ACCOUNT_JSON (hoặc GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY). Chia sẻ Sheet với email service account (Quyền Chỉnh sửa).";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

/** PEM trong .env / Vercel thường dùng chuỗi \\n thay xuống dòng thật. */
function normalizePrivateKey(key: string): string {
  let k = key.trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\n/g, "\n");
  return k;
}

function assertPrivateKeyPem(key: string): void {
  if (
    !key.includes("BEGIN PRIVATE KEY") &&
    !key.includes("BEGIN RSA PRIVATE KEY")
  ) {
    throw new Error(
      "Private key Google không đúng PEM (cần -----BEGIN PRIVATE KEY-----). Dùng file JSON gốc hoặc GOOGLE_PRIVATE_KEY với \\n giữa các dòng."
    );
  }
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const j = JSON.parse(raw.replace(/^\uFEFF/, "")) as ServiceAccount;
      if (j.client_email && j.private_key) {
        const private_key = normalizePrivateKey(j.private_key);
        assertPrivateKeyPem(private_key);
        return { client_email: j.client_email.trim(), private_key };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Private key Google")) throw e;
      /* thử GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY */
    }
  }
  const email = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (email && key) {
    const private_key = normalizePrivateKey(key);
    assertPrivateKeyPem(private_key);
    return { client_email: email, private_key };
  }
  return null;
}

export function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_ID?.trim() && parseServiceAccount()
  );
}

export function getSheetsDiagnostic() {
  const sa = parseServiceAccount();
  return {
    ok: sheetsConfigured(),
    hasSheetId: Boolean(process.env.GOOGLE_SHEETS_ID?.trim()),
    serviceAccountEmail: sa?.client_email ?? null,
    missing: [
      !process.env.GOOGLE_SHEETS_ID?.trim() && "GOOGLE_SHEETS_ID",
      !sa && "GOOGLE_SERVICE_ACCOUNT_JSON hoặc GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY",
    ].filter(Boolean),
  };
}

async function getClient(): Promise<sheets_v4.Sheets> {
  const sa = parseServiceAccount();
  const id = process.env.GOOGLE_SHEETS_ID?.trim();
  if (!sa || !id) throw new Error(SHEETS_HELP);

  try {
    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: SCOPES,
    });
    return google.sheets({ version: "v4", auth });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("DECODER") || msg.includes("unsupported")) {
      throw new Error(
        "Không giải mã được private key (OpenSSL). Kiểm tra GOOGLE_SERVICE_ACCOUNT_JSON — nên dán cả file JSON một dòng từ Google Cloud; hoặc dùng GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY với \\n thay mỗi xuống dòng trong key."
      );
    }
    throw e;
  }
}

/** A1 notation: quote tab name (bắt buộc nếu tab chưa tồn tại hoặc tên có ký tự đặc biệt). */
function sheetRange(tab: string, a1: string): string {
  const escaped = tab.replace(/'/g, "''");
  return `'${escaped}'!${a1}`;
}

async function ensureTab(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  headers: string[]
) {
  const meta = await client.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
  if (!exists) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
  }
  const head = await client.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(title, "1:1"),
  });
  if (!head.data.values?.length && headers.length > 0) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(title, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

function rethrowIfKeyDecoderError(e: unknown): never {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; i < 6 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  const full = parts.join(" ");
  if (full.includes("DECODER") || full.includes("unsupported")) {
    throw new Error(
      "Không giải mã được private key Google (OpenSSL). Dán nguyên file JSON vào GOOGLE_SERVICE_ACCOUNT_JSON (một dòng, jq -c), hoặc dùng GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY với \\n giữa các dòng trong PEM."
    );
  }
  throw e;
}

export async function appendSheetRow(
  tab: string,
  headers: string[],
  row: string[]
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!.trim();
  try {
    const client = await getClient();
    await ensureTab(client, spreadsheetId, tab, headers);
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: sheetRange(tab, "A:A"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (e) {
    rethrowIfKeyDecoderError(e);
  }
}

export async function readSheetRows(
  tab: string,
  headers: string[]
): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!.trim();
  try {
    const client = await getClient();
    await ensureTab(client, spreadsheetId, tab, headers);
    const res = await client.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange(tab, "A2:Z"),
    });
    return res.data.values ?? [];
  } catch (e) {
    rethrowIfKeyDecoderError(e);
  }
}
