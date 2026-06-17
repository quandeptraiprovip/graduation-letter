export type SignatureEntry = {
  timestamp: string;
  name: string;
  /** URL công khai (Vercel Blob) hoặc tên file local `*.png` */
  imageUrl: string;
};

export function resolveSignatureImageSrc(entry: SignatureEntry): string {
  if (
    entry.imageUrl.startsWith("http://") ||
    entry.imageUrl.startsWith("https://")
  ) {
    return entry.imageUrl;
  }
  return `/api/signatures/file/${encodeURIComponent(entry.imageUrl)}`;
}
