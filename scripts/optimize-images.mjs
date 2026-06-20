/**
 * Resize JPEGs for web: sharp enough for ~2× retina on invitation layout.
 * Portrait hero ~186px → max 960px; album/yearbook slots → max 1920px long edge.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORTRAIT_BASENAME = "DSC04586.JPG";
const DIRS = ["public/images", "images"];

async function optimizeFile(filePath, basename) {
  const maxEdge = basename === PORTRAIT_BASENAME ? 960 : 1920;
  const out = await sharp(filePath)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  await fs.writeFile(filePath, out);
  const meta = await sharp(out).metadata();
  return { bytes: out.length, width: meta.width, height: meta.height };
}

async function processDir(relDir) {
  const dir = path.join(ROOT, relDir);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  const jpgs = entries.filter((f) => /\.jpe?g$/i.test(f));
  for (const name of jpgs) {
    const filePath = path.join(dir, name);
    const before = (await fs.stat(filePath)).size;
    const { bytes, width, height } = await optimizeFile(filePath, name);
    console.log(
      `${relDir}/${name}: ${(before / 1e6).toFixed(1)}MB → ${(bytes / 1e6).toFixed(2)}MB (${width}×${height})`
    );
  }
}

for (const d of DIRS) {
  await processDir(d);
}
