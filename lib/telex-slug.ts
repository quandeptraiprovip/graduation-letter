/** Chuyển slug gõ Telex/Unikey (không dấu trong URL) thành tên tiếng Việt có dấu. */

const TONE_ON_VOWEL: Record<string, Record<string, string>> = {
  a: { s: "á", f: "à", r: "ả", x: "ã", j: "ạ" },
  ă: { s: "ắ", f: "ằ", r: "ẳ", x: "ẵ", j: "ặ" },
  â: { s: "ấ", f: "ầ", r: "ẩ", x: "ẫ", j: "ậ" },
  e: { s: "é", f: "è", r: "ẻ", x: "ẽ", j: "ẹ" },
  ê: { s: "ế", f: "ề", r: "ể", x: "ễ", j: "ệ" },
  i: { s: "í", f: "ì", r: "ỉ", x: "ĩ", j: "ị" },
  o: { s: "ó", f: "ò", r: "ỏ", x: "õ", j: "ọ" },
  ô: { s: "ố", f: "ồ", r: "ổ", x: "ỗ", j: "ộ" },
  ơ: { s: "ớ", f: "ờ", r: "ở", x: "ỡ", j: "ợ" },
  u: { s: "ú", f: "ù", r: "ủ", x: "ũ", j: "ụ" },
  ư: { s: "ứ", f: "ừ", r: "ử", x: "ữ", j: "ự" },
  y: { s: "ý", f: "ỳ", r: "ỷ", x: "ỹ", j: "ỵ" },
  đ: { s: "đ", f: "đ", r: "đ", x: "đ", j: "đ" },
};

const TONED_TO_BASE: Record<string, string> = {};
for (const [base, tones] of Object.entries(TONE_ON_VOWEL)) {
  TONED_TO_BASE[base] = base;
  for (const toned of Object.values(tones)) {
    TONED_TO_BASE[toned] = base;
  }
}

const TONE_CHARS = new Set(["s", "f", "r", "x", "j"]);

function vowelBase(ch: string): string | null {
  return TONED_TO_BASE[ch] ?? null;
}

/** Vị trí nguyên âm nhận dấu thanh (theo quy tắc chính tả, không chỉ nguyên âm cuối). */
function indexForToneMark(text: string): number {
  const vowels: { index: number; base: string }[] = [];
  for (let i = 0; i < text.length; i++) {
    const base = vowelBase(text[i]);
    if (base) vowels.push({ index: i, base });
  }
  if (!vowels.length) return -1;

  const plain = text.normalize("NFC").toLowerCase();

  if (/iêu|yêu/.test(plain)) {
    const ê = vowels.find((v) => v.base === "ê");
    if (ê) return ê.index;
  }
  if (/ươ/.test(plain)) {
    const ơ = vowels.find((v) => v.base === "ơ");
    if (ơ) return ơ.index;
  }

  const modifiedPriority = ["ă", "â", "ê", "ô", "ơ", "ư"] as const;
  for (const p of modifiedPriority) {
    for (let j = vowels.length - 1; j >= 0; j--) {
      if (vowels[j].base === p) return vowels[j].index;
    }
  }

  return vowels[vowels.length - 1].index;
}

function applyToneToVowel(text: string, tone: string): string {
  const i = indexForToneMark(text);
  if (i < 0) return text;
  const base = vowelBase(text[i]);
  const map = base ? TONE_ON_VOWEL[base] : undefined;
  if (map?.[tone]) {
    return text.slice(0, i) + map[tone] + text.slice(i + 1);
  }
  return text;
}

/** Viết tắt hay gặp trong slug URL (một `a` thay cho `aa` = â). */
function expandSlugVowelShorthand(word: string): string {
  let w = word.toLowerCase();
  // quana / quanaf → quaan / quaanf (Quân / Quần…)
  w = w.replace(/^quana([sfrxj]?)$/i, (_, tone) => `quaan${tone ?? ""}`);
  return w;
}

/** Một từ slug (vd. `quaan`, `baor`, `traanf`) → tiếng Việt. */
export function telexSlugWord(raw: string): string {
  let s = expandSlugVowelShorthand(raw.trim());
  if (!s) return "";

  s = s.replace(/dd/g, "đ");
  s = s.replace(/uw/g, "ư");
  s = s.replace(/ow/g, "ơ");
  s = s.replace(/aw/g, "ă");
  s = s.replace(/aa/g, "â");
  s = s.replace(/ee/g, "ê");
  s = s.replace(/oo/g, "ô");

  let out = "";
  for (const ch of s) {
    if (TONE_CHARS.has(ch)) {
      const toned = applyToneToVowel(out, ch);
      out = toned === out ? out + ch : toned;
    } else {
      out += ch;
    }
  }
  return out;
}

function titleCaseVietnamese(word: string): string {
  if (!word) return "";
  const first = word[0];
  const rest = word.slice(1);
  return first.toLocaleUpperCase("vi-VN") + rest;
}

/**
 * Slug đường dẫn (vd. `quaan`, `baor_traanf`) → tên hiển thị (Quân, Bảo Trần).
 * Phân tách từ bằng `_` hoặc `-`.
 */
export function inviteNameFromSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* giữ nguyên */
  }
  const parts = decoded.split(/[_-]+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.map((p) => titleCaseVietnamese(telexSlugWord(p))).join(" ");
}
