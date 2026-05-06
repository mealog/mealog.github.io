import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getFirebaseAuth } from "../lib/firebaseApp";
import {
  dmErrorMessageForUi,
  subscribeDmReadMap,
  subscribeMyDmThreads,
} from "../lib/dm";
import type { DmThreadDoc } from "../types";

type Ctx = {
  threads: DmThreadDoc[];
  readMap: Map<string, number>;
  threadsListReady: boolean;
  threadsListError: string | null;
  retryDmList: () => void;
};

const DmRealtimeContext = createContext<Ctx | null>(null);

/**
 * 피드(/)·DM(/messages*) 에서만 Firestore 리스너 활성화.
 * `shouldListen` 만으로는 `/` → `/messages` 첫 진입 시 효과가 다시 돌지 않아 목록이 빈 채로 실패하는
 * 경우가 있음(친구 탭은 shouldListen 이 false→true 로 바뀌어 구독이 새로 붙음) — pathname 을
 * 의존해 DM 경로 전환마다 구독을 정리·재부착합니다.
 * 탭이 백그라운드일 때는 기존과 같이 끔(읽기·배터리).
 */
export function DmRealtimeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, firebaseReady, loading: authLoading } = useAuth();
  const myUid = user?.uid;

  const routeWantsDm = pathname === "/" || pathname.startsWith("/messages");

  const [tabVisible, setTabVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const shouldListen =
    firebaseReady &&
    !!myUid &&
    !authLoading &&
    routeWantsDm &&
    tabVisible;

  const [retryNonce, setRetryNonce] = useState(0);
  const retryDmList = useCallback(() => setRetryNonce((n) => n + 1), []);

  const [threads, setThreads] = useState<DmThreadDoc[]>([]);
  const [readMap, setReadMap] = useState<Map<string, number>>(new Map());
  const [threadsListReady, setThreadsListReady] = useState(false);
  const [threadsListError, setThreadsListError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady || !myUid || authLoading) {
      setThreads([]);
      setReadMap(new Map());
      setThreadsListReady(false);
      setThreadsListError(null);
      return;
    }

    if (!shouldListen) {
      return;
    }

    let ua: (() => void) | undefined;
    let ub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const auth = getFirebaseAuth();
      await auth.authStateReady();
      try {
        await getFirebaseAuth().currentUser?.getIdToken();
      } catch {
        /* 오프라인 등 */
      }
      if (cancelled) return;
      const live = getFirebaseAuth().currentUser?.uid;
      if (!live || live !== myUid) {
        if (!cancelled) {
          setThreadsListReady(true);
          setThreadsListError(
            "로그인 세션을 확인할 수 없어요. 새로고침하거나 로그아웃 후 다시 로그인해 주세요.",
          );
        }
        return;
      }

      setThreadsListError(null);
      setThreadsListReady(false);
      ua = subscribeMyDmThreads(
        myUid,
        (rows) => {
          setThreads(rows);
          setThreadsListReady(true);
          setThreadsListError(null);
        },
        (e) => {
          setThreads([]);
          setThreadsListReady(true);
          setThreadsListError(dmErrorMessageForUi(e, "threadList"));
        },
      );
      ub = subscribeDmReadMap(myUid, setReadMap, (e) =>
        console.warn("[dmRealtime] read map", e),
      );
    })();

    return () => {
      cancelled = true;
      ua?.();
      ub?.();
    };
  }, [firebaseReady, myUid, authLoading, shouldListen, pathname, retryNonce]);

  const value = useMemo<Ctx>(
    () => ({
      threads,
      readMap,
      threadsListReady,
      threadsListError,
      retryDmList,
    }),
    [threads, readMap, threadsListReady, threadsListError, retryDmList],
  );

  return (
    <DmRealtimeContext.Provider value={value}>{children}</DmRealtimeContext.Provider>
  );
}

export function useDmRealtime(): Ctx {
  const ctx = useContext(DmRealtimeContext);
  if (!ctx) throw new Error("useDmRealtime는 DmRealtimeProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
