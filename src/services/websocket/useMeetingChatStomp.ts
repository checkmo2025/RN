import { useCallback, useEffect, useRef, useState } from 'react';
import type { Client } from '@stomp/stompjs';

import type { ClubMeetingChatMessage } from '../api/clubApi';
import { createLogger } from '../../utils/logger';
import { createCheckmoStompClient } from './createCheckmoStompClient';

const chatLog = createLogger('chat');
const stompLog = createLogger('stomp');

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

export function useMeetingChatStomp({
  clubId,
  meetingId,
  teamId,
  enabled,
  onMessage,
  onConnected,
}: Params) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);
  onMessageRef.current = onMessage;
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!enabled || clubId == null || meetingId == null || teamId == null) {
      setIsConnected(false);
      return;
    }

    const subDestination = `/sub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/messages`;
    const client = createCheckmoStompClient({
      debug: __DEV__ ? (message) => stompLog.debug(message) : undefined,
      onConnect: () => {
        setIsConnected(true);
        chatLog.debug('connected', subDestination);
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
      onDisconnect: () => setIsConnected(false),
      onStompError: (frame) => {
        setIsConnected(false);
        chatLog.warn('stomp error', frame.headers?.message, frame.body);
      },
      onWebSocketError: (event) => {
        setIsConnected(false);
        chatLog.warn('websocket error', event);
      },
      onWebSocketClose: (event) => {
        setIsConnected(false);
        chatLog.debug('websocket closed', event.code, event.reason);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      setIsConnected(false);
      clientRef.current = null;
      void client.deactivate();
    };
  }, [clubId, enabled, meetingId, teamId]);

  const publish = useCallback(
    (content: string) => {
      const client = clientRef.current;
      if (clubId == null || meetingId == null || teamId == null) {
        throw new Error('채팅방 정보를 찾을 수 없습니다.');
      }
      if (!client?.connected) {
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
    [clubId, meetingId, teamId],
  );

  return { isConnected, publish };
}
