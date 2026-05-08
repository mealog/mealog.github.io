/**
 * AI Studio(API 키 목록 화면)에서 키를 복사해 붙여넣는 흐름 — 설정·온보딩 공용.
 */
export default function GeminiApiKeyGuide({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <figure className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40">
        <img
          src={`${import.meta.env.BASE_URL}gemini-aistudio-apikey-guide.png`}
          alt="Google AI Studio API 키 페이지. 오른쪽 상단에 API 키 만들기 버튼이 있고, 아래 목록의 각 키 줄 오른쪽에 복사 아이콘이 있습니다."
          className={
            compact
              ? "w-full max-h-[min(400px,52vh)] object-contain object-top bg-slate-950/50"
              : "w-full max-h-[min(520px,62vh)] object-contain object-top bg-slate-950/50"
          }
          loading="lazy"
          decoding="async"
        />
        <figcaption className="border-t border-slate-700 px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
          목록에서 쓸 키를 고른 뒤, 그 줄의{" "}
          <span className="font-medium text-slate-300">① 복사 아이콘</span>(겹친 네모)을 누르면 키가 복사돼요.{" "}
          <span className="font-medium text-slate-300">② 밀로그로 돌아와</span> 아래 입력란에 붙여넣고 저장하세요.
          <span className="mt-1 block text-slate-500">
            (표시된 복사 아이콘은 찾기 쉽게 안내해 둔 것이에요.)
          </span>
        </figcaption>
      </figure>
      <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-500">
        <li>
          보통은 목록에 있는 <strong className="font-medium text-slate-400">기본 디폴트 키</strong>를 그대로 복사해 쓰면 됩니다.
        </li>
        <li>
          새로 받고 싶으면 화면 오른쪽 위 <strong className="font-medium text-slate-400">API 키 만들기</strong>로 만든 뒤,
          같은 방식으로 복사해 붙여넣으면 됩니다. (무료·요금제는 Google 정책을 따릅니다.)
        </li>
      </ul>
    </div>
  );
}
