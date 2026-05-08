/**
 * AI Studio 에서 복사한 문자열을 클립보드에서 넣어 주기 위한 휴리스틱·헬퍼.
 * Google 이 공개한 풀 OAuth 로 “내 키 목록 문자열 조회” 를 브라우저 앱에서 쓸 수 있는 API는 없습니다.
 */

export function looksLikeGeminiApiKey(s: string): boolean {
  const t = s.trim().replace(/\s+/g, "");
  /** Consumer Gemini 키는 보통 AIza 로 시작합니다. 길이는 변동 가능해 최소만 잡음. */
  return t.length >= 35 && /^AIza[0-9A-Za-z_-]+$/.test(t);
}

export type ClipboardGeminiRead =
  | { ok: true; key: string }
  | {
      ok: false;
      reason: "unsupported" | "denied" | "empty" | "bad_shape";
    };

/** 사용자 제스처(버튼 클릭) 안에서 호출해야 브라우저 정책에 맞는 경우가 많습니다. */
export async function tryReadGeminiApiKeyFromClipboard(): Promise<ClipboardGeminiRead> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const raw = await navigator.clipboard.readText();
    const key = raw.trim().replace(/\s+/g, "");
    if (!key) return { ok: false, reason: "empty" };
    if (!looksLikeGeminiApiKey(key)) return { ok: false, reason: "bad_shape" };
    return { ok: true, key };
  } catch {
    return { ok: false, reason: "denied" };
  }
}
