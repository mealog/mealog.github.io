/**
 * 카카오톡·라인 등 인앱 브라우저는 WebView 계열이라 Google OAuth 가 차단되는 경우가 많음.
 * (Google: embedded webview 에서의 OAuth 제한)
 */

export type InAppBrowserKind = "kakao" | "line" | "instagram" | "facebook" | "other";

/** Google 로그인 팝업이 막히기 쉬운 인앱 환경인지 (User-Agent 기준) */
export function getInAppBrowserKind(): InAppBrowserKind | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/Line\//i.test(ua)) return "line";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FBIOS|FB4A|Facebook/i.test(ua)) return "facebook";
  // Android System WebView
  if (/; wv\)/.test(ua)) return "other";
  return null;
}

export function isEmbeddedBrowserLikelyBlockingGoogleOAuth(): boolean {
  return getInAppBrowserKind() !== null;
}

/**
 * 카카오톡 공식: 인앱 → OS 기본 브라우저로 현재 URL 열기
 * @see 카카오 데브톡 등 — kakaotalk://web/openExternal?url=
 */
export function openKakaoTalkExternalBrowser(
  url: string = typeof window !== "undefined" ? window.location.href : "",
): void {
  if (typeof window === "undefined" || !url) return;
  window.location.href =
    "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
}

/** LINE 인앱에서 외부 브라우저 유도용 쿼리 (공유 링크에 붙이는 방식과 동일) */
export function urlWithLineOpenExternalParam(
  url: string = typeof window !== "undefined" ? window.location.href : "",
): string {
  try {
    const u = new URL(url);
    u.searchParams.set("openExternalBrowser", "1");
    return u.toString();
  } catch {
    return url;
  }
}
