type BlockedMemberChange = {
  nickname: string;
  blocked: boolean;
};

type BlockedMemberListener = (change: BlockedMemberChange) => void;

const blockedNicknames = new Set<string>();
const listeners = new Set<BlockedMemberListener>();

function normalizeNickname(nickname?: string | null): string {
  return (nickname ?? '').trim().toLowerCase();
}

export function isSameMemberNickname(a?: string | null, b?: string | null): boolean {
  const normalizedA = normalizeNickname(a);
  const normalizedB = normalizeNickname(b);
  return normalizedA.length > 0 && normalizedA === normalizedB;
}

export function isBlockedMemberNickname(nickname?: string | null): boolean {
  const normalized = normalizeNickname(nickname);
  return normalized.length > 0 && blockedNicknames.has(normalized);
}

export function emitMemberBlocked(nickname: string): void {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return;

  blockedNicknames.add(normalized);
  const trimmedNickname = nickname.trim();
  listeners.forEach((listener) => listener({ nickname: trimmedNickname, blocked: true }));
}

export function emitMemberUnblocked(nickname: string): void {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return;

  blockedNicknames.delete(normalized);
  const trimmedNickname = nickname.trim();
  listeners.forEach((listener) => listener({ nickname: trimmedNickname, blocked: false }));
}

export function subscribeBlockedMemberChanges(listener: BlockedMemberListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
