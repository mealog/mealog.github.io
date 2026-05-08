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
          복사한 키를 아래에 입력해서 저장한 후 연결 테스트를 해주세요.
          만약 API키가 없었다면, 무료 등급의 새로운 키를 발급받으면 됩니다.
        </figcaption>
      </figure>
    </div>
  );
}
