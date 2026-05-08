/**
 * 홈 화면 추가·설치형·삼성 인터넷 등에서 <input capture> 또는 숨김 후 .click()
 * 결합 시 카메라/파일 선택이 실패·PWA 성 오류 메시지로 끝나는 사례가 있습니다.
 */

export function shouldOmitCaptureOnFileInputs(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;

  try {
    if (/\bSamsungBrowser\/|SamsungBrowser\b/i.test(navigator.userAgent)) return true;
  } catch {
    /* */
  }

  try {
    const modes = ["standalone", "fullscreen", "minimal-ui"] as const;
    for (const mode of modes) {
      if (window.matchMedia(`(display-mode: ${mode})`).matches) return true;
    }
  } catch {
    /* */
  }

  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  } catch {
    /* */
  }

  return false;
}
