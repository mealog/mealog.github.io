/**
 * 아바타 유틸 — 사용자가 업로드한 사진 / 앱이 제공하는 기본 샘플을 모두
 * 96x96 JPEG base64 data URL 로 정규화한다.
 *
 * data URL 로 저장하는 이유:
 *   1) Firestore Storage 같은 별도 버킷 없이도 publicProfiles / shares 문서에
 *      그대로 필드로 쓸 수 있다.
 *   2) 96x96 JPEG(quality 0.8) 는 보통 8~15KB 수준 → 문서 1MB 한도에 여유.
 *   3) friends/feed/댓글에서 img src 로 바로 쓸 수 있어서 추가 디코드 없음.
 */
import { compressImage } from "./image";

export interface AvatarPreset {
  id: string;
  /** 렌더링에 사용할 이모지 (또는 한 글자). */
  emoji: string;
  /** 배경색 HEX. */
  bg: string;
  /** UI 상 이름. */
  label: string;
}

/**
 * 기본 샘플 — 식단/건강 앱 분위기에 맞는 가벼운 이모지 세트.
 * 순서가 UI 에 그대로 노출된다.
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "bento", emoji: "🍱", bg: "#fb7185", label: "도시락" },
  { id: "salad", emoji: "🥗", bg: "#22c55e", label: "샐러드" },
  { id: "apple", emoji: "🍎", bg: "#ef4444", label: "사과" },
  { id: "avocado", emoji: "🥑", bg: "#65a30d", label: "아보카도" },
  { id: "ramen", emoji: "🍜", bg: "#f59e0b", label: "라면" },
  { id: "coffee", emoji: "☕", bg: "#a16207", label: "커피" },
  { id: "sparkle", emoji: "✨", bg: "#a855f7", label: "스파클" },
  { id: "heart", emoji: "💗", bg: "#ec4899", label: "하트" },
  { id: "muscle", emoji: "💪", bg: "#0ea5e9", label: "근육" },
  { id: "running", emoji: "🏃", bg: "#0d9488", label: "달리기" },
  { id: "sleep", emoji: "🌙", bg: "#4f46e5", label: "달" },
  { id: "sun", emoji: "🌞", bg: "#f97316", label: "해" },
];

const AVATAR_SIZE = 96;
const AVATAR_QUALITY = 0.82;
/**
 * 아바타 data URL 크기 상한(근사).
 * 10KB 이상이면 다시 품질/크기를 줄여서 줄인다 — Firestore 에 저장 시 여러 곳에
 * 중복 저장되므로 보수적으로 관리.
 */
const AVATAR_MAX_BYTES = 12 * 1024;

function dataUrlBytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return dataUrl.length;
  const b64 = dataUrl.slice(idx + 1);
  return Math.floor((b64.length * 3) / 4);
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality = AVATAR_QUALITY): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * preset 이모지를 96x96 캔버스에 그려 data URL 로 반환한다.
 *
 * 이모지 폰트는 플랫폼마다 다르지만 캔버스에 래스터라이즈된 결과를 그대로
 * 저장하므로 한번 캡처된 시점의 모양이 모든 친구에게 일관되게 보인다.
 */
export async function renderPresetAvatarDataUrl(preset: AvatarPreset): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 컨텍스트를 열 수 없습니다.");

  ctx.fillStyle = preset.bg;
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

  ctx.font = `${Math.round(AVATAR_SIZE * 0.62)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // 이모지는 폰트 메트릭에 따라 살짝 위로 치우치는 경우가 많아 약간 아래로 보정.
  ctx.fillText(preset.emoji, AVATAR_SIZE / 2, AVATAR_SIZE / 2 + AVATAR_SIZE * 0.04);

  return canvasToDataUrl(canvas);
}

/**
 * 사용자가 업로드한 이미지를 96x96 JPEG data URL 로 정규화한다.
 *
 * compressImage 는 긴 변 기준 리사이즈만 해 주므로, 이후 캔버스에 센터-크롭
 * 으로 정방형을 만든다. 최종 결과가 AVATAR_MAX_BYTES 를 넘으면 품질을 단계적
 * 으로 낮춰 재시도한다.
 */
export async function blobToAvatarDataUrl(blob: Blob): Promise<string> {
  // 1) 원본을 긴 변 기준 적당한 크기로 줄여 메모리 부담 감소.
  const shrunk = await compressImage(blob, {
    maxDimension: 256,
    quality: 0.9,
    mimeType: "image/jpeg",
  });

  const bmp = await createImageBitmapSafe(shrunk);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 컨텍스트를 열 수 없습니다.");

    // 센터 크롭.
    const src = bmp as { width: number; height: number };
    const side = Math.min(src.width, src.height);
    const sx = (src.width - side) / 2;
    const sy = (src.height - side) / 2;
    ctx.drawImage(bmp as CanvasImageSource, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    let quality = AVATAR_QUALITY;
    let out = canvasToDataUrl(canvas, quality);
    // 파일이 너무 크면 품질 낮춰 재시도. 최저 0.4까지.
    while (dataUrlBytes(out) > AVATAR_MAX_BYTES && quality > 0.42) {
      quality = Math.max(0.4, quality - 0.12);
      out = canvasToDataUrl(canvas, quality);
    }
    return out;
  } finally {
    if ("close" in bmp && typeof bmp.close === "function") {
      try {
        bmp.close();
      } catch {
        /* noop */
      }
    }
  }
}

async function createImageBitmapSafe(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(blob);
    } catch {
      // iOS Safari 일부 포맷은 createImageBitmap 실패 → <img> fallback.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // img.src 가 유지되는 동안 revoke 하면 디코딩 실패할 수 있어 약간 지연.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
