import { useCallback, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { tryReadGeminiApiKeyFromClipboard } from "../lib/geminiApiKeyClipboard";
import { cls } from "../lib/utils";

type Props = {
  disabled?: boolean;
  onFilled: (key: string) => void;
  className?: string;
};

/** 위 스크린샷 안내 후 — 복사한 키를 한 번에 넣기 (설명 줄 없음·버튼만) */
export default function GeminiKeyClipboardAssist({
  disabled,
  onFilled,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onClickPaste = useCallback(async () => {
    setBusy(true);
    try {
      const r = await tryReadGeminiApiKeyFromClipboard();
      if (r.ok) {
        onFilled(r.key);
        return;
      }
      const msg =
        r.reason === "unsupported"
          ? "이 브라우저에서는 클립보드 읽기를 지원하지 않거나 보안 접속(https)이 아닙니다. 입력란에 직접 붙여넣기(Ctrl+V) 해 주세요."
          : r.reason === "denied"
            ? "클립보드 접근이 거부됐습니다. 브라우저에서 허용하거나 입력란에 직접 붙여넣어 주세요."
            : r.reason === "empty"
              ? "클립보드가 비어 있어요. AI Studio에서 API 키를 복사한 뒤 다시 시도해 주세요."
              : "클립보드 내용이 API 키 형식이 아니에요. AI Studio 목록에서 키 줄의 복사 아이콘으로 다시 복사했는지 확인해 주세요.";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }, [onFilled]);

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => void onClickPaste()}
      aria-label="클립보드에 복사한 Gemini API 키를 입력란에 채웁니다"
      className={cls(
        "btn-secondary inline-flex w-full shrink-0 items-center justify-center gap-1.5 py-2 text-xs disabled:opacity-50 sm:w-auto sm:justify-start sm:px-3",
        className,
      )}
    >
      <ClipboardPaste size={14} className={busy ? "animate-pulse" : undefined} aria-hidden />
      {busy ? "읽는 중…" : "클립보드에서 채우기"}
    </button>
  );
}
