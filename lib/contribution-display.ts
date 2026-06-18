export type ContributionEntry = {
  timestamp: string;
  /** URL công khai (Vercel Blob) hoặc tên file local. Ảnh kỷ niệm — tuỳ chọn. */
  photoUrl?: string;
  /** URL công khai (Vercel Blob) hoặc tên file local `*.png`. Chữ ký — tuỳ chọn. */
  sigUrl?: string;
};

export function resolveContribImageSrc(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `/api/contributions/file/${encodeURIComponent(url)}`;
}
