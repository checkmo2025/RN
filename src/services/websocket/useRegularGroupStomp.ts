import { useCallback, useEffect, useRef, useState } from 'react';
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

    const client = new Client({
      // iOS 네이티브 WebSocket은 User-Agent를 안 보내서 nginx 봇 차단(빈 UA=444)에 걸림.
      // webSocketFactory로 직접 만들어 User-Agent 헤더를 붙인다. 서브프로토콜은 brokerURL 기본값과 동일하게 전달.
      webSocketFactory: () =>
        new (WebSocket as any)(
          PUBLIC_ENV.WS_BASE_URL,
          ['v12.stomp', 'v11.stomp', 'v10.stomp'],
          { headers: { 'User-Agent': 'checkmo-app' } },
        ),
      heartbeatOutgoing: 25000,
      heartbeatIncoming: 20000,
      reconnectDelay: 5000,
      // RN WebSocket은 text 프레임 전송 시 STOMP 종료 NULL(\0)을 잘라먹어 서버가 CONNECT를 못 받음.
      // 바이너리 프레임으로 보내 \0까지 그대로 전송. appendMissingNULLonIncoming(수신측)과 짝으로 사용.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
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
