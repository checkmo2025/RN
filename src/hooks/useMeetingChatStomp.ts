import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IStompSocket } from '@stomp/stompjs';
import { PUBLIC_ENV } from '../constants/publicEnv';

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
      if (__DEV__) {
        console.log('[CHAT] hook skip — enabled:', enabled, 'clubId:', clubId, 'meetingId:', meetingId, 'teamId:', teamId);
      }
      return;
    }

    if (__DEV__) {
      console.log('[CHAT] connecting — club:', clubId, 'meeting:', meetingId, 'team:', teamId);
    }

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
      debug: __DEV__ ? (msg) => console.log('[STOMP]', msg) : undefined,
    });

    client.onConnect = () => {
      if (__DEV__) console.log('[CHAT] connected, subscribing to', subDestination);
      setIsConnected(true);
      client.subscribe(subDestination, (frame) => {
        if (__DEV__) console.log('[CHAT] message received:', frame.body);
        try {
          const event = JSON.parse(frame.body) as ChatStompMessage;
          onMessageRef.current(event);
        } catch (e) {
          if (__DEV__) console.warn('[CHAT] failed to parse message:', e);
        }
      });
    };

    client.onWebSocketClose = () => {
      if (__DEV__) console.log('[CHAT] websocket closed');
      setIsConnected(false);
    };

    client.onWebSocketError = (e) => {
      if (__DEV__) console.warn('[CHAT] websocket error:', e);
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      if (__DEV__) console.warn('[CHAT] stomp error:', frame.headers, frame.body);
      setIsConnected(false);
    };

    clientRef.current = client;
    client.activate();

    return () => {
      if (__DEV__) console.log('[CHAT] deactivating');
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
      if (__DEV__) console.log('[CHAT] publishing to', `/pub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/message`);
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
