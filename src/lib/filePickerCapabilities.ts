/**
 * 삼성 인터넷 에서만 확인된 <input capture> 오류 회피용.
 * 일반 설치형(PWA)·iOS standalone 은 capture 를 켜 두는 편이 카메라 직행에 유리합니다.
 */
export function shouldOmitCaptureOnFileInputs(): boolean {
  if (typeof navigator === "undefined") return false;

  try {
    if (/\bSamsungBrowser\/|SamsungBrowser\b/i.test(navigator.userAgent)) return true;
  } catch {
    /* */
  }

  return false;
}
