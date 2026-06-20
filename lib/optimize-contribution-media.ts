import sharp from "sharp";

/** ~2× retina cho polaroid ~300px; đủ nét trên desktop grid. */
const PHOTO_MAX_EDGE = 1280;
const PHOTO_JPEG_QUALITY = 86;

/** Chữ ký overlay — cạnh dài tối đa. */
const SIG_MAX_EDGE = 720;

export async function optimizeContributionPhoto(
  input: Buffer,
  extHint?: string
): Promise<{ buf: Buffer; ext: "jpg" | "png" }> {
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  const hasAlpha = Boolean(meta.hasAlpha) && extHint === "png";

  if (hasAlpha) {
    const buf = await sharp(input)
      .rotate()
      .resize(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return { buf, ext: "png" };
  }

  const buf = await sharp(input)
    .rotate()
    .resize(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: PHOTO_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return { buf, ext: "jpg" };
}

export async function optimizeContributionSignature(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(SIG_MAX_EDGE, SIG_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
