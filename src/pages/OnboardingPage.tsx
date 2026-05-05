import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FirebaseLoginCard from "../components/FirebaseLoginCard";
import { afterUserDataMutation, db, patchSettings, uid } from "../lib/db";
import { nextColor } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import type { User } from "../types";

export default function OnboardingPage() {
  const { user: authUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(() => nextColor([]));
  const [apiKey, setApiKey] = useState("");
  const [useGoogleAvatar, setUseGoogleAvatar] = useState(true);
  const [busy, setBusy] = useState(false);

  // 구글 로그인이 완료되면 이름 필드를 자동으로 채워 준다 — 사용자가 이미
  // 입력하기 시작한 경우에는 덮어쓰지 않는다.
  useEffect(() => {
    if (!authUser) return;
    setDisplayName((prev) => prev || authUser.displayName || "");
  }, [authUser?.uid, authUser?.displayName]);

  async function finish() {
    const name = displayName.trim();
    if (!name) {
      alert("이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const now = Date.now();
      const id = uid();
      const googleAvatarAvailable = !!authUser?.photoURL;
      const newUser: User = {
        id,
        name,
        color,
        // 구글 로그인 + "구글 사진 사용" 체크 시 avatarKind="google".
        // 체크 해제나 로그인 없이 진행 시 undefined — 이니셜 폴백.
        avatarKind:
          googleAvatarAvailable && useGoogleAvatar ? "google" : undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.users.bulkPut([newUser]);
      afterUserDataMutation();
      await patchSettings({
        onboarded: true,
        activeUserId: id,
        geminiApiKey: apiKey.trim() || undefined,
      });
      window.location.replace(`${window.location.origin}${import.meta.env.BASE_URL}#/`);
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? `저장에 실패했습니다: ${e.message}`
          : "저장에 실패했습니다. 사이트 데이터(IndexedDB) 저장이 막혀 있지 않은지 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-10 pt-8">
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300">
          ✨ 시작하기
        </div>
        <h1 className="text-3xl font-bold leading-tight">
          헬스헬스에
          <br />
          오신 것을 환영해요
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          프로필을 만들고 식단·건강 기록을 사진으로 남기면 AI가 분석합니다.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          기존 클라우드 데이터는 아래 <strong className="text-slate-400">Google 로그인</strong> 후 이어집니다. 계정 바꾸기는{" "}
          <Link to="/settings" className="text-brand-400 underline">
            설정
          </Link>
          .
        </p>
      </header>

      <div className="mb-6">
        <FirebaseLoginCard />
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">프로필</h2>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
          {authUser?.photoURL && useGoogleAvatar ? (
            <img
              src={authUser.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-xl border border-slate-800 object-cover"
            />
          ) : (
            <label className="relative cursor-pointer">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {displayName.trim().slice(0, 1) || "?"}
              </span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          )}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="표시 이름"
            className="input border-transparent bg-transparent flex-1 px-2"
            maxLength={16}
          />
        </div>
        {authUser?.photoURL && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={useGoogleAvatar}
              onChange={(e) => setUseGoogleAvatar(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-brand-500"
            />
            <span>구글 계정 프로필 사진을 사용할래요</span>
          </label>
        )}
        <p className="mt-1 text-[11px] text-slate-500">
          닉네임과 프로필 사진은 나중에{" "}
          <span className="text-slate-400">건강 탭</span> 에서 언제든 바꿀 수 있어요.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          Google Gemini 키 <span className="text-slate-500">(선택)</span>
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-brand-400 underline">
            AI Studio
          </a>
          에서 발급 · 나중에 설정에서도 가능
        </p>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
          className="input"
          autoComplete="off"
        />
      </section>

      <button
        type="button"
        onClick={() => void finish()}
        disabled={busy}
        className="btn-primary mt-auto w-full py-4 text-base"
      >
        {busy ? "준비 중…" : "시작하기"}
      </button>
    </div>
  );
}
