/**
 * Bubblewrap 이 만든 TWA res drawable 폴더의 splash.png 를
 * assets/app-icon.png 기반 둥근 아이콘 + 배경으로 덮어씁니다.
 *
 * bubblewrap update 직후 실행: npm run android:patch-splash
 * (setup-and-build.ps1 에서 update 다음에 자동 호출)
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconPath = join(root, "assets", "app-icon.png");
const resRoot = join(root, "twa-android", "app", "src", "main", "res");

async function roundedIconPng(sidePx) {
  const radius = Math.max(8, Math.round(sidePx * 0.22));
  const resized = await sharp(iconPath).rotate().resize(sidePx, sidePx, { fit: "cover" }).png().toBuffer();
  const maskSvg = Buffer.from(
    `<svg width="${sidePx}" height="${sidePx}" xmlns="http://www.w3.org/2000/svg"><rect width="${sidePx}" height="${sidePx}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  return sharp(resized)
    .composite([{ input: maskSvg, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function buildSplash(outW, outH) {
  const iconSide = Math.round(Math.min(outW, outH) * 0.38);
  const iconBuf = await roundedIconPng(iconSide);
  const left = Math.round((outW - iconSide) / 2);
  const top = Math.round((outH - iconSide) / 2);
  return sharp({
    create: {
      width: outW,
      height: outH,
      channels: 3,
      background: "#0f172a",
    },
  })
    .composite([{ input: iconBuf, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  if (!existsSync(iconPath)) {
    console.error("[patch-twa-splash] missing", iconPath);
    process.exit(1);
  }
  if (!existsSync(resRoot)) {
    console.warn("[patch-twa-splash] skip — no", resRoot);
    return;
  }
  const dirs = await readdir(resRoot);
  let count = 0;
  for (const d of dirs) {
    if (!d.startsWith("drawable")) continue;
    const splashPath = join(resRoot, d, "splash.png");
    if (!existsSync(splashPath)) continue;
    const meta = await sharp(splashPath).metadata();
    const w = meta.width ?? 450;
    const h = meta.height ?? 450;
    const buf = await buildSplash(w, h);
    await sharp(buf).png({ compressionLevel: 9 }).toFile(splashPath);
    console.log("[patch-twa-splash]", splashPath);
    count++;
  }
  console.log("[patch-twa-splash] done,", count, "file(s)");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
