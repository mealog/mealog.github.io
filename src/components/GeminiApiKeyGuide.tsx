/**
 * AI Studio(API 키 목록 화면) 스크린샷 — 설정·온보딩 공용.
 */
export default function GeminiApiKeyGuide({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <figure className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40">
        <img
          src={`${import.meta.env.BASE_URL}gemini-aistudio-apikey-guide.png`}
          alt="Google AI Studio API 키 페이지에서 키 줄 오른쪽의 복사 아이콘으로 키를 복사하는 예시"
          className={
            compact
              ? "w-full max-h-[min(400px,52vh)] object-contain object-top bg-slate-950/50"
              : "w-full max-h-[min(520px,62vh)] object-contain object-top bg-slate-950/50"
          }
          loading="lazy"
          decoding="async"
        />
        <figcaption className="border-t border-slate-700 px-3 py-2 text-[11px] leading-snug text-slate-400">
          키 옆{" "}
          <span className="font-medium text-slate-300">복사</span> 후 아래 입력란에 붙여 넣거나 &nbsp;
          <span className="font-medium text-slate-300">클립보드에서 채우기</span>를 누르세요.
        </figcaption>
      </figure>
      {!compact ? (
        <p className="text-[11px] leading-snug text-slate-500">
          처음 쓰는 계정은 목록에 키가 있을 때가 많고, 비어 있으면 AI Studio 에서 새로 만드세요.
        </p>
      ) : null}
    </div>
  );
}
