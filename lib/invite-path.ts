import { inviteNameFromSlug } from "@/lib/telex-slug";

/** Các segment đầu không phải slug mời khách. */
export const RESERVED_INVITE_SEGMENTS = new Set([
  "luu-but",
  "chu-ky",
  "api",
]);

/**
 * Lấy slug khách từ pathname.
 * `/quaan` → quaan · `/baor_traanf/luu-but` → baor_traanf · `/` hoặc `/luu-but` → null
 */
export function inviteSlugFromPathname(pathname: string): string | null {
  let path = pathname || "/";
  try {
    path = decodeURIComponent(path);
  } catch {
    /* giữ nguyên */
  }
  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return null;

  const first = segments[0];
  if (RESERVED_INVITE_SEGMENTS.has(first)) {
    const second = segments[1];
    if (second && !RESERVED_INVITE_SEGMENTS.has(second)) {
      return second;
    }
    return null;
  }

  return first;
}

export function inviteDisplayNameFromPathname(pathname: string): string | null {
  const slug = inviteSlugFromPathname(pathname);
  if (!slug) return null;
  const name = inviteNameFromSlug(slug);
  return name || null;
}

/** Giữ slug khi điều hướng tới lưu bút hoặc trang chủ thiệp mời. */
export function hrefWithInviteSlug(
  pathname: string,
  target: "home" | "luu-but"
): string {
  const slug = inviteSlugFromPathname(pathname);
  if (!slug) {
    return target === "luu-but" ? "/luu-but" : "/";
  }
  return target === "luu-but" ? `/${slug}/luu-but` : `/${slug}`;
}
