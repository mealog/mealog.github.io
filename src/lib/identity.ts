/**
 * 표시용 아이덴티티(닉네임 + 아바타) 헬퍼.
 *
 * "누가 보여주는 이름/사진을 고를지" 규칙:
 *   1) 닉네임: Dexie 의 `user.name` 이 있으면 우선, 없으면 Firebase auth
 *      displayName/email.
 *   2) 아바타:
 *      - user.avatarKind === "upload" | "preset" → user.avatarDataUrl
 *      - user.avatarKind === "google" → auth.photoURL
 *      - undefined(기본): 구글 로그인되어 있으면 auth.photoURL, 없으면 undefined
 *        → 렌더러 측에서 이니셜(color 배경)로 폴백.
 *
 * 내가 프로필을 수정하면 그 값을 이미 생성돼 있는 publicProfiles/{uid} 와,
 * 내가 host/viewer 로 있는 shares 문서의 ownerName·ownerPhotoURL ·
 * viewerName·viewerPhotoURL 에도 일괄 반영해야 친구 화면에서도 변경이 보인다.
 * 본 모듈의 `syncMyIdentityToCloud` 가 이 일을 처리한다.
 */
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import type { PublicProfile, User } from "../types";
import { getFirestoreDb } from "./firebaseApp";

/** 최종 표시용 photoURL 을 계산한다. Dexie user 가 undefined 여도 동작. */
export function resolveDisplayPhotoURL(
  user: User | null | undefined,
  authPhotoURL: string | null | undefined,
): string | undefined {
  if (!user) return authPhotoURL ?? undefined;
  switch (user.avatarKind) {
    case "upload":
    case "preset":
      return user.avatarDataUrl || authPhotoURL || undefined;
    case "google":
      return authPhotoURL ?? undefined;
    default:
      return authPhotoURL ?? undefined;
  }
}

/** 표시용 이름. */
export function resolveDisplayName(
  user: User | null | undefined,
  authUser: FirebaseUser | null | undefined,
): string {
  const n = user?.name?.trim();
  if (n) return n;
  return authUser?.displayName ?? authUser?.email ?? "나";
}

/** 한 번에 두 값 모두 계산. 자주 쓰이는 조합이라 헬퍼로. */
export function resolveMyIdentity(
  user: User | null | undefined,
  authUser: FirebaseUser | null | undefined,
): { name: string; photoURL?: string } {
  return {
    name: resolveDisplayName(user, authUser),
    photoURL: resolveDisplayPhotoURL(user, authUser?.photoURL),
  };
}

// ---- 클라우드 문서 동기화 ---------------------------------------------

/**
 * 내 프로필을 Firestore 의 publicProfiles 와, 내가 host/viewer 로 있는
 * shares 문서 전체에 일괄 반영한다.
 *
 * friends.ts 는 share 를 만들 때 auth 의 displayName/photoURL 을 그대로
 * 복사한다. 그래서 사용자가 앱 안에서 프로필을 바꾸면 이 함수를 호출해
 * 기존 문서들도 업데이트해야 상대방 기기에서 새 이름/사진이 보인다.
 */
export async function syncMyIdentityToCloud(
  authUser: FirebaseUser,
  user: User,
): Promise<void> {
  const fs = getFirestoreDb();
  const email = (authUser.email ?? "").trim().toLowerCase();
  if (!email) return;

  const name = resolveDisplayName(user, authUser);
  const photoURL = resolveDisplayPhotoURL(user, authUser.photoURL);

  // 1) /publicProfiles/{uid}
  const pub: PublicProfile = {
    uid: authUser.uid,
    email,
    displayName: name,
    photoURL,
    updatedAt: Date.now(),
  };
  const pubClean: Record<string, unknown> = { ...pub };
  if (pubClean.photoURL === undefined) delete pubClean.photoURL;
  await setDoc(doc(fs, "publicProfiles", authUser.uid), pubClean, { merge: true });

  // 2) /shares 중 내가 owner 인 것 → ownerName/ownerPhotoURL 업데이트
  //    + 내가 viewer 인 것 → viewerName/viewerPhotoURL 업데이트.
  const hostQ = query(
    collection(fs, "shares"),
    where("ownerUid", "==", authUser.uid),
  );
  const viewerQ = query(
    collection(fs, "shares"),
    where("viewerUid", "==", authUser.uid),
  );
  const [hostSnap, viewerSnap] = await Promise.all([
    getDocs(hostQ),
    getDocs(viewerQ),
  ]);

  const now = Date.now();
  const batch = writeBatch(fs);
  hostSnap.forEach((d) => {
    const patch: Record<string, unknown> = {
      ownerName: name,
      ownerEmail: email,
      updatedAt: now,
    };
    // undefined 필드는 Firestore 에 쓸 수 없으므로 삭제 표시 대신 빈 문자열로 치환.
    patch.ownerPhotoURL = photoURL ?? "";
    batch.update(d.ref, patch);
  });
  viewerSnap.forEach((d) => {
    const patch: Record<string, unknown> = {
      viewerName: name,
      viewerEmail: email,
      updatedAt: now,
    };
    patch.viewerPhotoURL = photoURL ?? "";
    batch.update(d.ref, patch);
  });
  if (!hostSnap.empty || !viewerSnap.empty) {
    await batch.commit();
  }
}
