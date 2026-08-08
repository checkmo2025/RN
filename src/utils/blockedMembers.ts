import { getNicknameComparisonKey, normalizeNickname } from './nickname';

type BlockedMemberChange = {
  nickname: string;
  blocked: boolean;
};

type BlockedMemberListener = (change: BlockedMemberChange) => void;

const blockedNicknames = new Set<string>();
const listeners = new Set<BlockedMemberListener>();

function normalizeBlockedNickname(nickname?: string | null): string {
  return getNicknameComparisonKey(nickname ?? '');
}

export function isSameMemberNickname(a?: string | null, b?: string | null): boolean {
  const normalizedA = normalizeBlockedNickname(a);
  const normalizedB = normalizeBlockedNickname(b);
  return normalizedA.length > 0 && normalizedA === normalizedB;
}

export function isBlockedMemberNickname(nickname?: string | null): boolean {
  const normalized = normalizeBlockedNickname(nickname);
  return normalized.length > 0 && blockedNicknames.has(normalized);
}

export function emitMemberBlocked(nickname: string): void {
  const normalized = normalizeBlockedNickname(nickname);
  if (!normalized) return;

  blockedNicknames.add(normalized);
  const displayNickname = normalizeNickname(nickname);
  listeners.forEach((listener) => listener({ nickname: displayNickname, blocked: true }));
}

export function emitMemberUnblocked(nickname: string): void {
  const normalized = normalizeBlockedNickname(nickname);
  if (!normalized) return;

  blockedNicknames.delete(normalized);
  const displayNickname = normalizeNickname(nickname);
  listeners.forEach((listener) => listener({ nickname: displayNickname, blocked: false }));
}

export function subscribeBlockedMemberChanges(listener: BlockedMemberListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
