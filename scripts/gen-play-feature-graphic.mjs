/**
 * Google Play 기능 그래픽 1024×500 PNG 생성
 *
 * 원본 아이콘 교체 후: npm run gen:play-graphic
 * 출력: assets/play-feature-graphic-1024x500.png
 *
 * 한글은 OS에 맑은 고딕·Noto 등이 있어야 SVG 렌더 시 깨지지 않습니다.
 * (Linux CI에서는 글자가 비어 있을 수 있어, 배포용 파일은 로컬에서 한 번 생성하는 것을 권장합니다.)
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourcePath = join(root, "assets", "app-icon.png");
const outDir = join(root, "assets");
const outPath = join(outDir, "play-feature-graphic-1024x500.png");

const W = 1024;
const H = 500;
const ICON = 300;
const ICON_LEFT = 56;
const ICON_TOP = Math.round((H - ICON) / 2);
const RADIUS = 56;

if (!existsSync(sourcePath)) {
  console.error("missing", sourcePath);
  process.exit(1);
}

const bgSvg = Buffer.from(
  `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#134e4a"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
</svg>`,
);

const iconResized = await sharp(sourcePath)
  .rotate()
  .resize(ICON, ICON, { fit: "cover" })
  .png()
  .toBuffer();

const roundMask = Buffer.from(
  `<svg width="${ICON}" height="${ICON}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${ICON}" height="${ICON}" rx="${RADIUS}" ry="${RADIUS}" fill="#ffffff"/>
  </svg>`,
);

const iconRounded = await sharp(iconResized)
  .composite([{ input: roundMask, blend: "dest-in" }])
  .png()
  .toBuffer();

const textSvg = Buffer.from(
  `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="392" y="218" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, NanumGothic, sans-serif"
    font-size="52" font-weight="700" fill="#f8fafc">먹로그</text>
  <text x="392" y="282" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, NanumGothic, sans-serif"
    font-size="26" font-weight="400" fill="#cbd5e1">사진만 찍으면 AI가 식단 기록</text>
  <text x="392" y="330" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, NanumGothic, sans-serif"
    font-size="22" font-weight="400" fill="#64748b">건강 · 다이어트 · 식단</text>
</svg>`,
);

mkdirSync(outDir, { recursive: true });

await sharp(bgSvg)
  .composite([
    { input: iconRounded, left: ICON_LEFT, top: ICON_TOP },
    { input: textSvg, left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
console.log("wrote", outPath, `${meta.width}x${meta.height}`);
