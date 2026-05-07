import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IStompSocket } from '@stomp/stompjs';
import { PUBLIC_ENV } from '../constants/publicEnv';
import { createLogger } from '../utils/logger';

const chatLog = createLogger('chat');
const stompLog = createLogger('stomp');

export type ChatStompMessage = {
  messageId: number;
  content: string;
  sendAt?: string;
  senderNickname: string;
  senderProfileImageUrl?: string | null;
};

type UseMeetingChatStompParams = {
  clubId: number | undefined;
  meetingId: number | undefined;
  teamId: number | undefined;
  enabled: boolean;
  onMessage: (msg: ChatStompMessage) => void;
};

export function useMeetingChatStomp({
  clubId,
  meetingId,
  teamId,
  enabled,
  onMessage,
}: UseMeetingChatStompParams) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (
      !enabled ||
      typeof clubId !== 'number' ||
      typeof meetingId !== 'number' ||
      typeof teamId !== 'number'
    ) {
      chatLog.debug('hook skip — enabled:', enabled, 'clubId:', clubId, 'meetingId:', meetingId, 'teamId:', teamId);
      return;
    }

    chatLog.debug('connecting — club:', clubId, 'meeting:', meetingId, 'team:', teamId);

    const subDestination = `/sub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/messages`;
    const wsUrl = PUBLIC_ENV.WS_BASE_URL;

    const client = new Client({
      webSocketFactory: () => new WebSocket(wsUrl) as unknown as IStompSocket,
      reconnectDelay: 10000,
      heartbeatOutgoing: 25000,
      heartbeatIncoming: 20000,
      connectHeaders: {
        'heart-beat': '25000,20000',
      },
      debug: __DEV__ ? (msg) => stompLog.debug(msg) : undefined,
    });

    client.onConnect = () => {
      chatLog.debug('connected, subscribing to', subDestination);
      setIsConnected(true);
      client.subscribe(subDestination, (frame) => {
        chatLog.debug('message received:', frame.body);
        try {
          const event = JSON.parse(frame.body) as ChatStompMessage;
          onMessageRef.current(event);
        } catch (e) {
          chatLog.warn('failed to parse message:', e);
        }
      });
    };

    client.onWebSocketClose = () => {
      chatLog.debug('websocket closed');
      setIsConnected(false);
    };

    client.onWebSocketError = (e) => {
      chatLog.warn('websocket error:', e);
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      chatLog.warn('stomp error:', frame.headers, frame.body);
      setIsConnected(false);
    };

    clientRef.current = client;
    client.activate();

    return () => {
      chatLog.debug('deactivating');
      setIsConnected(false);
      void client.deactivate();
      clientRef.current = null;
    };
  }, [enabled, clubId, meetingId, teamId]);

  const publish = useCallback(
    (content: string) => {
      const client = clientRef.current;
      if (
        !client?.connected ||
        typeof clubId !== 'number' ||
        typeof meetingId !== 'number' ||
        typeof teamId !== 'number'
      ) {
        throw new Error('채팅 연결이 아직 준비되지 않았습니다.');
      }
      const trimmed = content.trim();
      if (!trimmed) return;
      chatLog.debug('publishing to', `/pub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/message`);
      client.publish({
        destination: `/pub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/message`,
        body: JSON.stringify({ content: trimmed }),
        headers: { 'content-type': 'application/json' },
      });
    },
    [clubId, meetingId, teamId],
  );

  return { isConnected, publish };
}
