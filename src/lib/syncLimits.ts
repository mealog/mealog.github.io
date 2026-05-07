/**
 * 알림·DM 보관 개수 및 DM 입력 길이 상한 — 날짜 TTL 대신 Firestore 문서 개수로 관리.
 */

/** /users/{uid}/activityInbox — 유지할 알림 최대 개수(넘으면 오래된 것부터 삭제) */
export const MAX_ACTIVITY_INBOX_ITEMS = 100;

/** 스레드당 로드·보관할 DM 메시지 최대 개수 */
export const MAX_DM_MESSAGES_PER_THREAD = 300;

/** DM 한 번에 보낼 수 있는 글자 수(공백 제거 전 기준은 send 쪽에서 trim 후 검사) */
export const MAX_DM_MESSAGE_CHARS = 2000;
