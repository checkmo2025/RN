import { Client } from '@stomp/stompjs';
import type { StompConfig } from '@stomp/stompjs';

import { PUBLIC_ENV } from '../../constants/publicEnv';

type NativeWebSocketConstructor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> },
) => WebSocket;

type CheckmoStompConfig = Pick<
  StompConfig,
  | 'debug'
  | 'onConnect'
  | 'onDisconnect'
  | 'onStompError'
  | 'onWebSocketError'
  | 'onWebSocketClose'
>;

export function createCheckmoStompClient(config: CheckmoStompConfig): Client {
  const NativeWebSocket = WebSocket as unknown as NativeWebSocketConstructor;
  return new Client({
    webSocketFactory: () =>
      new NativeWebSocket(
        PUBLIC_ENV.WS_BASE_URL,
        ['v12.stomp', 'v11.stomp', 'v10.stomp'],
        { headers: { 'User-Agent': 'checkmo-app' } },
      ),
    heartbeatOutgoing: 25000,
    heartbeatIncoming: 20000,
    reconnectDelay: 5000,
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    ...config,
  });
}
