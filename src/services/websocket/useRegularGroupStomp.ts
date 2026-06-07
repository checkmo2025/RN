import { useCallback, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { PUBLIC_ENV } from '../../constants/publicEnv';

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
  onTopicUpdateRef.current = onTopicUpdate;

  const publishToggle = useCallback(
    (topicId: number, isSelected: boolean) => {
      const client = clientRef.current;
      if (!client?.connected || clubId == null || meetingId == null || teamId == null) return;
      // backend application destination prefix is /pub (not /app)
      client.publish({
        destination: `/pub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/presentation`,
        body: JSON.stringify({ topicId, isSelected }),
      });
    },
    [clubId, meetingId, teamId],
  );

  useEffect(() => {
    if (!enabled || clubId == null || meetingId == null || teamId == null) return;

    const subDestination = `/sub/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/presentation`;

    const client = new Client({
      brokerURL: PUBLIC_ENV.WS_BASE_URL,
      heartbeatOutgoing: 25000,
      heartbeatIncoming: 20000,
      reconnectDelay: 5000,
      appendMissingNULLonIncoming: true,
      debug: (msg) => console.log('[STOMP DEBUG]', msg),
      onConnect: () => {
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
      onDisconnect: () => console.log('[STOMP] disconnected'),
      onStompError: (frame) => console.warn('[STOMP] stomp error:', frame.headers?.message, frame.body),
      onWebSocketError: (evt) => console.warn('[STOMP] ws error:', evt),
      onWebSocketClose: (evt) => console.warn('[STOMP] ws close:', (evt as CloseEvent).code, (evt as CloseEvent).reason),
    });

    client.activate();
    console.log('[STOMP] activating for', subDestination);
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [clubId, meetingId, teamId, enabled]);

  return { publishToggle };
}
