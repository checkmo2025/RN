import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { createCheckmoStompClient } from './createCheckmoStompClient';

export type TopicUpdatePayload = {
  clubId: number;
  meetingId: number;
  teamId: number;
  topicId: number;
  isSelected: boolean;
};

type Params = {
  clubId: number | undefined;
  meetingId: number | undefined;
  teamId: number | undefined;
  enabled: boolean;
  onTopicUpdate: (payload: TopicUpdatePayload) => void;
};

export function useRegularGroupStomp({ clubId, meetingId, teamId, enabled, onTopicUpdate }: Params) {
  const clientRef = useRef<Client | null>(null);
  const onTopicUpdateRef = useRef(onTopicUpdate);
  const [isConnected, setIsConnected] = useState(false);
  onTopicUpdateRef.current = onTopicUpdate;

  const publishToggle = useCallback(
    (topicId: number, isSelected: boolean) => {
      const client = clientRef.current;
      if (clubId == null || meetingId == null || teamId == null) {
        throw new Error('정기모임 정보를 찾을 수 없습니다.');
      }
      if (!client?.connected) {
        throw new Error('실시간 연결이 아직 되지 않았습니다.');
      }
      // backend application destination prefix is /pub (not /app)
      client.publish({
        destination: `/pub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/presentation`,
        body: JSON.stringify({ topicId, isSelected }),
        headers: {
          'content-type': 'application/json',
        },
      });
    },
    [clubId, meetingId, teamId],
  );

  useEffect(() => {
    if (!enabled || clubId == null || meetingId == null || teamId == null) {
      setIsConnected(false);
      return;
    }

    const subDestination = `/sub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/presentation`;

    const client = createCheckmoStompClient({
      onConnect: () => {
        setIsConnected(true);
        console.log('[STOMP] connected, subscribing to', subDestination);
        client.subscribe(subDestination, (message) => {
          console.log('[STOMP] received:', message.body);
          try {
            const payload = JSON.parse(message.body) as TopicUpdatePayload;
            onTopicUpdateRef.current(payload);
          } catch {
            // ignore malformed messages
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log('[STOMP] disconnected');
      },
      onStompError: (frame) => {
        setIsConnected(false);
        console.warn('[STOMP] stomp error:', frame.headers?.message, frame.body);
      },
      onWebSocketError: (evt) => {
        setIsConnected(false);
        console.warn('[STOMP] ws error:', evt);
      },
      onWebSocketClose: (evt) => {
        setIsConnected(false);
        console.warn('[STOMP] ws close:', (evt as CloseEvent).code, (evt as CloseEvent).reason);
      },
    });

    client.activate();
    console.log('[STOMP] activating for', subDestination);
    clientRef.current = client;

    return () => {
      setIsConnected(false);
      client.deactivate();
      clientRef.current = null;
    };
  }, [clubId, meetingId, teamId, enabled]);

  return { publishToggle, isConnected };
}
