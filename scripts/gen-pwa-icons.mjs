/**
 * assets/app-icon.png → 탭 파비콘 + PWA PNG (설치·스플래시·apple-touch 아이콘)
 *
 * 원본 교체 후: node scripts/gen-pwa-icons.mjs
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourcePath = join(root, "assets", "app-icon.png");

if (!existsSync(sourcePath)) {
  console.error("missing", sourcePath);
  process.exit(1);
}

const sizes = [
  [48, "favicon.png"],
  [192, "pwa-192.png"],
  [512, "pwa-512.png"],
];

for (const [px, name] of sizes) {
  const outPath = join(root, "public", name);
  await sharp(sourcePath)
    .rotate()
    .resize(px, px, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.warn(" wrote", name);
}
