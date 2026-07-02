import { useCallback, useEffect, useRef, useState } from 'react';
import type { Client } from '@stomp/stompjs';

import { fetchLoginStatusSilently } from '../api/authApi';
import type { ClubMeetingChatMessage } from '../api/clubApi';
import { ApiError } from '../api/http';
import { createLogger } from '../../utils/logger';
import { createCheckmoStompClient } from './createCheckmoStompClient';

const chatLog = createLogger('chat');
const stompLog = createLogger('stomp');

export type MeetingChatConnectionStatus =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'closed';

type Params = {
  clubId: number | undefined;
  meetingId: number | undefined;
  teamId: number | undefined;
  enabled: boolean;
  onMessage: (message: ClubMeetingChatMessage, teamId: number) => void;
  onConnected?: (teamId: number) => void;
};

function parseChatMessage(raw: string): ClubMeetingChatMessage | null {
  try {
    const value = JSON.parse(raw) as Partial<ClubMeetingChatMessage>;
    if (
      typeof value.messageId !== 'number' ||
      typeof value.content !== 'string' ||
      typeof value.senderNickname !== 'string'
    ) {
      return null;
    }
    return {
      messageId: value.messageId,
      content: value.content,
      sendAt: typeof value.sendAt === 'string' ? value.sendAt : undefined,
      senderNickname: value.senderNickname,
      senderProfileImageUrl:
        typeof value.senderProfileImageUrl === 'string'
          ? value.senderProfileImageUrl
          : undefined,
    };
  } catch {
    return null;
  }
}

function getConnectionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.message.trim()) return error.message.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return '채팅 연결을 확인해 주십시오.';
}

function parseUserQueueError(raw: string): string {
  const fallback = '채팅 서버 오류가 발생했습니다.';
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback;

    const record = parsed as Record<string, unknown>;
    const message = record.message ?? record.error;
    if (typeof message === 'string' && message.trim()) return message.trim();

    const code = record.code;
    if (typeof code === 'string' && code.trim()) return `${fallback} (${code.trim()})`;
    return fallback;
  } catch {
    return trimmed.length <= 120 ? trimmed : fallback;
  }
}

export function useMeetingChatStomp({
  clubId,
  meetingId,
  teamId,
  enabled,
  onMessage,
  onConnected,
}: Params) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<MeetingChatConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [closeCode, setCloseCode] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);
  onMessageRef.current = onMessage;
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!enabled || clubId == null || meetingId == null || teamId == null) {
      setIsConnected(false);
      setConnectionStatus('idle');
      setConnectionError(null);
      setCloseCode(null);
      setCloseReason(null);
      return;
    }

    let cancelled = false;
    let client: Client | null = null;
    const subDestination = `/sub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/messages`;

    const isCurrentClient = (target: Client) => !cancelled && clientRef.current === target;

    const activate = async () => {
      setIsConnected(false);
      setConnectionStatus('preparing');
      setConnectionError(null);
      setCloseCode(null);
      setCloseReason(null);

      try {
        const status = await fetchLoginStatusSilently(true);
        if (cancelled) return;
        if (!status) {
          setConnectionStatus('error');
          setConnectionError('로그인 상태를 확인해 주십시오.');
          return;
        }
      } catch (error) {
        if (cancelled) return;
        setConnectionStatus('error');
        setConnectionError(getConnectionErrorMessage(error));
        chatLog.warn('session preflight failed', error);
        return;
      }

      if (cancelled) return;

      client = createCheckmoStompClient({
        debug: __DEV__ ? (message) => stompLog.debug(message) : undefined,
        onConnect: () => {
          if (!client || !isCurrentClient(client)) return;
          setIsConnected(true);
          setConnectionStatus('connected');
          setConnectionError(null);
          setCloseCode(null);
          setCloseReason(null);
          chatLog.debug('connected', subDestination);
          client.subscribe('/user/queue/errors', (frame) => {
            if (!client || !isCurrentClient(client)) return;
            const message = parseUserQueueError(frame.body);
            setIsConnected(false);
            setConnectionStatus('error');
            setConnectionError(message);
            chatLog.warn('user queue error', message);
          });
          client.subscribe(subDestination, (frame) => {
            const message = parseChatMessage(frame.body);
            if (!message) {
              chatLog.warn('invalid message payload');
              return;
            }
            onMessageRef.current(message, teamId);
          });
          onConnectedRef.current?.(teamId);
        },
        onDisconnect: () => {
          if (!client || !isCurrentClient(client)) return;
          setIsConnected(false);
          setConnectionStatus('closed');
        },
        onStompError: (frame) => {
          if (!client || !isCurrentClient(client)) return;
          setIsConnected(false);
          setConnectionStatus('error');
          setConnectionError(frame.headers?.message || parseUserQueueError(frame.body));
          chatLog.warn('stomp error', frame.headers?.message, frame.body);
        },
        onWebSocketError: (event) => {
          if (!client || !isCurrentClient(client)) return;
          setIsConnected(false);
          setConnectionStatus('error');
          setConnectionError('채팅 연결을 확인해 주십시오.');
          chatLog.warn('websocket error', event);
        },
        onWebSocketClose: (event) => {
          if (!client || !isCurrentClient(client)) return;
          setIsConnected(false);
          setConnectionStatus('closed');
          setCloseCode(event.code);
          setCloseReason(event.reason || null);
          chatLog.debug('websocket closed', event.code, event.reason);
        },
      });

      clientRef.current = client;
      setConnectionStatus('connecting');
      client.activate();
    };

    void activate();

    return () => {
      cancelled = true;
      setIsConnected(false);
      setConnectionStatus('idle');
      setConnectionError(null);
      setCloseCode(null);
      setCloseReason(null);
      clientRef.current = null;
      if (client) void client.deactivate();
    };
  }, [clubId, enabled, meetingId, teamId]);

  const publish = useCallback(
    (content: string) => {
      const client = clientRef.current;
      if (clubId == null || meetingId == null || teamId == null) {
        throw new Error('채팅방 정보를 찾을 수 없습니다.');
      }
      if (connectionStatus !== 'connected' || !client?.connected) {
        throw new Error('채팅 서버에 연결 중입니다. 잠시 후 다시 시도해 주십시오.');
      }
      const normalizedContent = content.trim();
      if (!normalizedContent) return;
      client.publish({
        destination: `/pub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/message`,
        body: JSON.stringify({ content: normalizedContent }),
        headers: { 'content-type': 'application/json' },
      });
    },
    [clubId, connectionStatus, meetingId, teamId],
  );

  return {
    isConnected,
    connectionStatus,
    connectionError,
    closeCode,
    closeReason,
    publish,
  };
}
