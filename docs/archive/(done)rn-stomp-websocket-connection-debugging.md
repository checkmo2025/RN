# RN STOMP WebSocket 연결 장애 디버깅 보고서 (발제 실시간 동기화)

> 작성일: 2026-06-07
> 대상 커밋: `d6094fb` (`fix(meeting): RN 발제 실시간 동기화 WebSocket 연결 문제 해결`)
> 관련 파일: `src/services/websocket/useRegularGroupStomp.ts`, `src/screens/meeting/useBookshelfState.ts` 등

---

## 1. 개요 (Executive Summary)

정기모임 **발제(presentation) 선택/해제**를 모든 참여자에게 실시간 동기화하기 위해 STOMP over WebSocket을 도입했다.
백엔드(BE)와 웹 프론트(FE)는 정상 동작했으나 **React Native 앱(RN, iOS)에서만 연결이 실패**했다.

겉으로 드러난 증상은 단 하나 — `WebSocket close 1001 (Stream end encountered)` 의 5초 간격 무한 재연결 — 이었지만,
실제로는 **서로 다른 계층에서 발생한 2개의 독립적인 원인**이 순차적으로 겹쳐 있었다.

| # | 계층 | 원인 | 해결 |
|---|------|------|------|
| 1 | 인프라 (nginx) | 빈 User-Agent를 봇으로 간주해 `444`로 차단. iOS 네이티브 WebSocket은 UA 헤더를 보내지 않음 | RN에서 `webSocketFactory`로 `User-Agent` 헤더 부착 |
| 2 | 클라이언트 (RN WebSocket) | text 프레임 전송 시 STOMP 종료 바이트 `NULL(\0)`을 잘라먹어 서버가 CONNECT 프레임을 완성하지 못함 → 무응답 | `forceBinaryWSFrames: true` 로 바이너리 전송 |
| 3 | (부가) UI 정확성 | 연결 여부와 무관하게 optimistic update로 체크 상태가 먼저 바뀌어 "가짜 성공"을 표시 | 서버 이벤트 수신 기준으로 상태 확정 + pending 처리 |

핵심 교훈: **하나의 증상(1001) 뒤에 여러 계층의 원인이 직렬로 숨어 있을 수 있다. 한 겹을 벗기면 다음 겹이 드러난다.**

---

## 2. 시스템 구성

```
[RN iOS 앱]  --- wss://api.checkmo.co.kr/ws-stomp --->  [nginx-proxy (Docker)]  --->  [checkmo-app (Spring Boot, Docker)]
[웹 FE]      --- 동일 엔드포인트 --------------------->        (EC2 Ubuntu)
```

- 프로토콜: STOMP 1.2 over WebSocket (`@stomp/stompjs ^7.3.0`)
- 인증: Stateless JWT (HTTP-only 쿠키 `accessToken` / `refreshToken`)
- 백엔드: Spring Boot 3.x + Spring Security 6 (`@EnableWebSocketSecurity`)
- app destination prefix: `/pub`, subscribe prefix: `/sub`
- 구독 경로: `/sub/clubs/{clubId}/meetings/{meetingId}/teams/{teamId}/presentation`
- 발행 경로: `/pub/clubs/{clubId}/meetings/{meetingId}/teams/{teamId}/presentation`
- 배포: EC2(Ubuntu) 위 Docker 컨테이너 2개 (`nginx-proxy`, `checkmo-app`), 이미지는 ECR에서 pull

---

## 3. 증상

RN(iOS)에서 발제 탭 진입 시 콘솔 로그:

```
[STOMP] activating for /sub/clubs/32/meetings/12/teams/9/presentation
[STOMP DEBUG] Opening Web Socket...
[STOMP DEBUG] Connection closed to wss://api.checkmo.co.kr/ws-stomp
[STOMP] ws close: 1001 Stream end encountered
[STOMP DEBUG] STOMP: scheduling reconnection in 5000ms
... (5초마다 무한 반복)
```

- `onStompError` 콜백은 **한 번도 호출되지 않음** → STOMP ERROR 프레임이 오지 않았다는 뜻
- 웹 FE는 **동일 백엔드로 정상 동작** → BE 로직 자체는 문제 없음
- 배포된 운영 버전에서 웹 채팅+발제 모두 정상

---

## 4. 진단 과정 (계층별로 좁혀가기)

### 4-1. 잘못 짚었던 가설들 (그리고 배제 근거)

처음에는 다음을 의심했고, 하나씩 사실 확인을 통해 배제했다.

| 가설 | 확인 방법 | 결과 |
|------|-----------|------|
| iOS가 JWT 쿠키를 안 보낸다 | 서버 JWT 필터 로그 | `[JWT 필터] 요청 URI: /ws-stomp, Access Token 존재 여부 확인: true` → **쿠키 전송됨** |
| JWT 검증 실패 | 서버 로그 | `[JWT 필터] Access Token 유효성 검사 통과` → **검증 통과** |
| nginx WebSocket 프록시 설정 누락 | nginx conf 확인 | `proxy_http_version 1.1` + `Upgrade`/`Connection` 헤더 정상 → **설정 정상** |
| CORS `allowedOrigins` 문제 | BE `WebSocketConfig` | `setAllowedOriginPatterns("*")` 배포 확인 → **무관** |
| BE 코드 머지/배포 누락 | `docker ps` 컨테이너 기동 시각 vs 커밋 시각 | hotfix가 컨테이너 기동보다 이전 → **배포됨** |

> ⚠️ 이 단계에서 시간을 많이 썼다. "원인을 찾았다"고 단정하기 전에 **로그/설정으로 사실을 확인**하는 절차가 결국 정답으로 가는 지름길이었다.

### 4-2. 결정적 단서 ①: nginx access 로그

```
59.6.22.235 - - [07/Jun/2026:09:15:22 +0000] "GET /ws-stomp HTTP/1.1" 444 0 "-" "-" "-"
```

두 가지를 동시에 알려준 한 줄:

1. **응답 코드 `444`** — nginx 비표준 코드로, "응답 없이 연결을 즉시 닫음"을 의미. 즉 **요청이 백엔드까지 도달하지 못하고 nginx에서 차단**됨. (실제로 `docker logs checkmo-app`에 해당 시각의 `/ws-stomp` 처리 로그가 전혀 없었다.)
2. **로그 끝의 `"-" "-" "-"`** — 커스텀 로그 포맷의 `$http_referer` / `$http_user_agent` / `$http_x_forwarded_for`. 즉 **User-Agent가 비어 있음(`-`)**.

### 4-3. 결정적 단서 ②: nginx 차단 규칙

`/etc/nginx/conf.d/websites/api.checkmo.co.kr.conf` 의 server 블록에 location 매칭보다 먼저 실행되는 규칙:

```nginx
if ($block_suspicious = 1) { return 444; }
if ($block_bot = 1)        { return 444; }
```

`/etc/nginx/nginx.conf` 의 map 정의:

```nginx
# URI 기반 차단 — /ws-stomp 는 목록에 없음 → 통과
map $uri $block_suspicious {
    ~*\.php$  1;
    ~*^/wp-admin(/|$) 1;
    "~*^/[a-z0-9]{4,6}$" 1;
    ...
    default   0;
}

# User-Agent 기반 차단
map $http_user_agent $block_bot {
    ~*bot              1;
    ~*crawler          1;
    ~*scanner          1;
    ~*python-requests  1;
    ""                 1;   # ← 빈 User-Agent = 봇으로 간주해 차단
    default            0;
}
```

→ **`"" 1;` 가 범인.** 브라우저(FE)는 User-Agent를 보내므로 통과하지만, **iOS 네이티브 WebSocket(RCTSRWebSocket 계열)은 기본적으로 User-Agent 헤더를 보내지 않아** 빈 값으로 매칭되어 `444`로 차단됐다.

> 왜 `1001`로 보였나: nginx가 HTTP 101(Switching Protocols) 대신 `444`로 연결을 끊으면, 클라이언트 입장에서는 업그레이드 도중 스트림이 끊긴 것이라 `1001 (Stream end encountered)` 로 표면화된다.

### 4-4. 1차 수정 후 드러난 두 번째 벽

User-Agent를 붙이자 로그가 한 단계 전진했다.

```
[STOMP DEBUG] Opening Web Socket...
[STOMP DEBUG] Web Socket Opened...     ← nginx 통과! (이전엔 여기 없이 바로 close)
[STOMP DEBUG] >>> CONNECT
accept-version:1.2,1.1,1.0
heart-beat:25000,20000
（이후 아무 로그 없음 — CONNECTED 도, ERROR 도, close 도 없음）
```

- WebSocket은 열렸고(`Web Socket Opened`), STOMP `CONNECT` 프레임도 전송됨
- 그러나 서버가 `CONNECTED`로 응답하지 않음 → `onConnect` 미발생 → `isConnected = false`
- 발제를 누르면 "실시간 연결이 아직 되지 않았습니다" 토스트만 표시

### 4-5. 결정적 단서 ③: stompjs 소스 코드와 로그 대조

`@stomp/stompjs`의 `stomp-handler.js` `start()` 실행 순서를 로그와 대조:

```js
start() {
  const parser = new Parser(...);              // (A) 여기서 new TextEncoder()/new TextDecoder() 생성
  this._webSocket.onmessage = (evt) => {
    this.debug('Received data');               // (B) 들어오는 데이터마다 무조건 찍힘
    parser.parseChunk(evt.data, this.appendMissingNULLonIncoming);
  };
  const onOpen = () => {
    this.debug('Web Socket Opened...');         // (C)
    this._transmit({ command: 'CONNECT', ... }); // (D) >>> CONNECT
  };
  ...
}
```

로그에서 도출한 사실:

1. **(C) `Web Socket Opened...`가 찍혔다** → 그 이전인 (A) Parser 생성이 성공했다 → `new TextEncoder()` / `new TextDecoder()` 가 **이 RN 런타임(Expo SDK 54 / RN 0.81.5 / Hermes)에 존재한다.** ⇒ **polyfill 불필요.**
2. **(B) `Received data`가 안 찍혔다** → 서버로부터 들어온 WebSocket 메시지가 **하나도 없다** ⇒ 파서/디코딩 문제가 아니라 **서버가 응답 자체를 안 보냈다.**

서버가 왜 응답을 안 보냈나? → **나가는 CONNECT 프레임이 깨져서.**

STOMP 프레임은 마지막에 종료 바이트 `NULL(\0)`로 끝난다. 그런데 **React Native의 WebSocket은 문자열(text) 프레임을 보낼 때 `\0`에서 문자열을 잘라먹는(또는 누락하는) 알려진 버그**가 있다. 그 결과:

- RN이 보낸 CONNECT 프레임에 종료 `\0`이 없음
- Spring의 STOMP 디코더는 프레임이 아직 안 끝났다고 보고 **계속 추가 바이트를 대기**
- CONNECT가 끝내 처리되지 않음 → `CONNECTED` 응답 없음 → 에러도 없음(예외가 아니라 단순 대기) → **무응답**

이는 4-1에서 본 "STOMP ERROR 프레임이 한 번도 안 온" 사실과도 정확히 일치한다(서버가 거부한 게 아니라 애초에 완성된 프레임을 못 받았으니 ERROR를 만들 일도 없었다).

---

## 5. 근본 원인 (Root Cause)

| 계층 | 근본 원인 |
|------|-----------|
| 인프라 | nginx `map $http_user_agent $block_bot { "" 1; }` 규칙 — 빈 User-Agent 차단. iOS 네이티브 WebSocket은 UA 미전송 |
| 클라이언트 | RN WebSocket의 text 프레임 전송 시 STOMP 종료 NULL(`\0`) 누락 버그 → 서버가 CONNECT 프레임 미완성으로 인식 |

두 원인 모두 **"RN 네이티브 WebSocket이 브라우저 WebSocket과 다르게 동작한다"**는 한 뿌리에서 나온다. FE(브라우저)가 정상이었던 이유도 동일하다 — 브라우저는 UA를 보내고, NULL 종료 바이트를 정상 전송한다.

---

## 6. 해결 (Fix)

### 6-1. RN 클라이언트 (`src/services/websocket/useRegularGroupStomp.ts`)

```ts
const client = new Client({
  // [원인1] iOS 네이티브 WebSocket은 User-Agent를 안 보내서 nginx 봇 차단(빈 UA=444)에 걸림.
  // webSocketFactory로 직접 만들어 User-Agent 헤더를 붙인다.
  // 서브프로토콜은 brokerURL 사용 시 stompjs가 넣어주던 기본값과 동일하게 직접 전달.
  webSocketFactory: () =>
    new (WebSocket as any)(
      PUBLIC_ENV.WS_BASE_URL,
      ['v12.stomp', 'v11.stomp', 'v10.stomp'],
      { headers: { 'User-Agent': 'checkmo-app' } },
    ),
  heartbeatOutgoing: 25000,
  heartbeatIncoming: 20000,
  reconnectDelay: 5000,
  // [원인2] RN WebSocket은 text 프레임 전송 시 STOMP 종료 NULL(\0)을 잘라먹어 서버가 CONNECT를 못 받음.
  // 바이너리 프레임으로 보내 \0까지 그대로 전송. appendMissingNULLonIncoming(수신측)과 짝으로 사용.
  forceBinaryWSFrames: true,
  appendMissingNULLonIncoming: true,
  onConnect: () => { /* setIsConnected(true) + subscribe */ },
  // onDisconnect / onStompError / onWebSocketError / onWebSocketClose 에서 setIsConnected(false)
});
```

**적용한 옵션 3종:**

| 옵션 | 역할 |
|------|------|
| `webSocketFactory` + `User-Agent` 헤더 | nginx 빈-UA 봇 차단 회피 (원인 1) |
| `forceBinaryWSFrames: true` | 나가는 프레임을 바이너리로 전송 → `\0` 보존 (원인 2, 송신측) |
| `appendMissingNULLonIncoming: true` | 들어오는 프레임에 `\0`이 없으면 보충 (원인 2의 역방향, 수신측 안전장치) |

> 두 NULL 관련 옵션은 stompjs의 React Native 사용 시 **항상 짝으로** 권장된다.
> `forceBinaryWSFrames`가 동작하려면 `TextEncoder`가 필요한데, 4-5에서 확인했듯 이 런타임에 이미 존재하므로 **별도 polyfill 설치는 불필요**했다.

### 6-2. UI 정확성 (`src/screens/meeting/useBookshelfState.ts` 외)

연결 문제와 별개로, 발제 탭 시 **연결되지 않은 상태에서도 로컬 체크가 먼저 바뀌는** optimistic update 문제를 함께 정리했다 (FE와 동일하게 서버 기준으로 확정).

- 탭 즉시 `completed`를 반전하던 optimistic update 제거
- `/sub/.../presentation` 이벤트 수신 시에만 `completed = payload.isSelected` 반영
- `pending` Set 도입 — 응답 대기 중인 발제 카드 중복 탭 방지 + 비활성/반투명 처리
- 미연결 시 "실시간 연결이 아직 되지 않았습니다" 토스트
- 본인 조 또는 운영진이 아니면 "현재 조의 발제만 선택할 수 있습니다" 토스트
- 연결 끊기면 pending Set 초기화

> ⚠️ **상호작용 주의**: optimistic update를 제거하면서, 발제 토글은 이제 **WebSocket 연결이 성공해야만** 동작한다. 즉 6-1의 연결 수정이 없으면 기능이 완전히 멈춘다(이전엔 가짜로라도 체크됐음). 두 수정은 반드시 함께 가야 한다.

---

## 7. 검증 (Verification)

iOS 실기기에서 발제 탭 진입 후 정상 왕복 동기화 확인:

```
[STOMP DEBUG] Web Socket Opened...
[STOMP DEBUG] >>> CONNECT
[STOMP DEBUG] Received data            ← 서버 응답 도착 (이전엔 없던 라인)
[STOMP DEBUG] <<< CONNECTED
                user-name:LOCAL_09c4905a
                version:1.2
[STOMP] connected, subscribing to /sub/clubs/32/meetings/12/teams/9/presentation
[STOMP DEBUG] >>> SUBSCRIBE
[STOMP DEBUG] >>> SEND   (발제 토글 발행)
[STOMP DEBUG] <<< MESSAGE
[STOMP] received: {"clubId":32,"meetingId":12,"teamId":9,"topicId":16,"isSelected":true}
```

- `CONNECT → CONNECTED → SUBSCRIBE → SEND → MESSAGE` 전체 사이클 성립
- 발제 선택/해제가 서버를 거쳐 구독으로 되돌아옴(`isSelected: true/false`) → 실시간 동기화 동작
- `tsc --noEmit` (typecheck) 통과

---

## 8. 남은 과제 (Follow-up)

| 우선순위 | 항목 | 비고 |
|---------|------|------|
| 중 | **Android 검증** | Android(okhttp)는 기본 User-Agent(`okhttp/x.y`)를 보내므로 nginx는 통과할 가능성이 높고, `forceBinaryWSFrames`도 동일 적용됨. 다만 실기기 확인 필요 |
| 하 | **로깅 표준 통일** | `useRegularGroupStomp.ts`가 raw `console.log/warn` 사용. 프로젝트엔 [STD-21] `createLogger`/`stompLog` 표준 존재 → 교체 검토 |
| 하 | **User-Agent 값 정식화** | 현재 `'checkmo-app'` 임시값. `checkmo-app/<version> (iOS)` 등 버전 포함 포맷 고려 |
| 검토 | **nginx 빈-UA 차단 정책** | 모바일 네이티브 클라이언트가 늘어나면, 빈 UA 차단을 `/ws-stomp`에 한해 완화할지 vs 클라가 항상 UA를 보내도록 강제할지 정책 결정 필요. 현재는 후자(클라가 UA 부착)로 해결 |

---

## 9. 교훈 (Lessons Learned)

1. **하나의 증상에 여러 계층의 원인이 직렬로 숨을 수 있다.** `1001` 하나에 nginx 차단 + RN 프레임 버그 두 개가 겹쳐 있었다. 한 겹을 벗기자 다음 겹이 드러났다.
2. **로그의 "없는 것"이 "있는 것"만큼 중요하다.** `Received data`가 **안 찍힌 것**, STOMP ERROR가 **안 온 것**이 각각 결정적 단서였다.
3. **클라이언트 라이브러리 소스를 직접 읽는 것이 가장 빠른 길일 때가 있다.** stompjs `start()`의 로그 출력 순서를 코드로 확인해 "Parser 생성 성공 → TextEncoder 존재"를 역산했고, 불필요한 polyfill 작업을 피했다.
4. **네이티브 WebSocket ≠ 브라우저 WebSocket.** UA 헤더, NULL 종료 바이트 등 브라우저가 당연히 해주는 것을 RN은 안 해준다. "FE는 되는데 RN만 안 됨"의 단골 원인.
5. **추측으로 코드를 바꾸기 전에 사실을 확정한다.** nginx/JWT/CORS를 미리 의심했지만 로그·설정 확인으로 차례차례 배제한 것이 헛수고를 줄였다.
6. **인프라(BE/nginx)는 함부로 바꾸지 않는다.** 봇 차단 규칙을 약화시키는 대신, 통제 범위인 RN 쪽에서 UA를 정상적으로 보내도록 해 부작용 없이 해결했다.

---

## 부록 A. 참고 옵션 (stompjs + React Native 권장 설정)

```ts
new Client({
  forceBinaryWSFrames: true,        // 송신: \0 보존
  appendMissingNULLonIncoming: true, // 수신: \0 보충
  // 네이티브 클라이언트가 UA 차단되는 환경이면 webSocketFactory로 헤더 부착
});
```

## 부록 B. 진단에 쓴 주요 명령어

```bash
# 컨테이너 기동 시각 확인 (배포 여부)
docker ps

# nginx access 로그에서 ws-stomp 응답 코드 확인 (444 = nginx 차단)
docker logs nginx-proxy 2>&1 | grep "ws-stomp" | tail -10

# 차단 규칙 위치/내용 확인
docker exec nginx-proxy grep -rn "block_bot\|block_suspicious" /etc/nginx/
docker exec nginx-proxy sed -n '33,75p' /etc/nginx/nginx.conf

# 백엔드가 요청을 받았는지 / STOMP 에러가 있는지
docker logs checkmo-app --since 2m 2>&1 | grep -viE "JWT 필터|블랙리스트|토큰 조회" | tail -50

# 클라이언트 라이브러리 동작 확인
grep -rniE "forceBinaryWSFrames|TextEncoder|TextDecoder" node_modules/@stomp/stompjs/esm6/*.js
```
