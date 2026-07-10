# 앱/웹 로그인 계약 정리 및 백엔드 전달안

## 목적

배포 앱에서 로그인 상태가 풀리고, 채팅 WebSocket 연결도 함께 불안정해지는 문제가 있다. 현재 구조는 백엔드에서 앱 로그인과 웹 로그인을 구분해 두었지만, 실제 앱의 보호 API 인증은 여전히 쿠키에 강하게 의존한다. 이 문서는 백엔드에 전달할 문제 정의와 변경 요청안을 정리한다.

핵심은 "앱/웹 로그인 엔드포인트를 무조건 하나로 합친다"가 아니다. 웹과 앱은 토큰 전달 방식이 다르므로, 백엔드 계약을 다음처럼 명확히 분리하는 것이 목표다.

- 웹: HttpOnly Cookie 기반 인증 유지
- 앱: 응답 바디 토큰 + Authorization 헤더 기반 인증

## 현재 구조

### 백엔드

현재 인증 엔드포인트가 웹과 앱으로 나뉘어 있다.

- 웹 로그인: `POST /api/v1/auth/login`
- 앱 로그인: `POST /api/v1/auth/app/login`
- 앱 refresh: `POST /api/v1/auth/app/refresh`
- 앱 logout: `POST /api/v1/auth/app/logout`

현재 앱 로그인은 refreshToken을 응답 바디로 내려주고, 동시에 `accessToken` / `refreshToken` 쿠키도 내려준다.

관련 코드:

- `ref_code/BE/src/main/java/checkmo/authentication/web/controller/AuthController.java`
- `ref_code/BE/src/main/java/checkmo/authentication/internal/security/jwt/JwtLoginProcessor.java`
- `ref_code/BE/src/main/java/checkmo/authentication/internal/service/command/AuthTokenRotationService.java`

반면 일반 보호 API 인증 필터는 쿠키의 `accessToken` / `refreshToken`만 확인한다. `X-Refresh-Token` 헤더나 `Authorization` 헤더를 보호 API 인증 수단으로 사용하지 않는다.

관련 코드:

- `ref_code/BE/src/main/java/checkmo/authentication/internal/security/jwt/JwtAuthenticationFilter.java`
- `ref_code/BE/src/test/java/checkmo/authentication/AuthApiTest.java`

특히 백엔드 테스트에는 헤더 refreshToken만으로 보호 API를 인증하지 않는다는 계약이 명시되어 있다.

```java
void protectedRouteDoesNotRotateTokensFromHeaderOnlyRefreshToken()
```

### RN 앱

RN 앱은 로그인 성공 시 refreshToken만 SecureStore에 저장한다.

- `src/services/api/authApi.ts`
- `src/services/api/authTokenStore.ts`

일반 API 요청은 `credentials: 'include'`로 쿠키를 포함시키는 방식이다.

- `src/services/api/http.ts`

401이 발생하면 저장된 refreshToken으로 `/auth/app/refresh`를 호출하고, 응답으로 새 refreshToken을 저장한다. 다만 그 이후 보호 API가 성공하려면 백엔드가 내려준 `Set-Cookie`가 네이티브 앱의 쿠키 저장소에 정상 저장되어야 한다.

WebSocket도 별도 인증 토큰을 보내지 않고, 백엔드 SecurityContext가 이미 인증되어 있기를 기대한다.

- `src/services/websocket/createCheckmoStompClient.ts`
- `src/services/websocket/useMeetingChatStomp.ts`

## 문제

현재 앱은 refreshToken을 SecureStore에 가지고 있어도, 보호 API 인증은 쿠키에 의존한다.

따라서 배포 앱에서 다음 중 하나만 흔들려도 로그인 상태가 풀릴 수 있다.

- 네이티브 fetch가 `Set-Cookie`를 저장하지 않음
- 앱 재시작 후 쿠키가 복원되지 않음
- WebSocket handshake에 쿠키가 붙지 않음
- 소셜 로그인 code exchange 이후 쿠키가 없는 상태에서 `login-status`가 먼저 호출됨
- refresh 응답은 성공했지만 새 쿠키가 다음 요청에 반영되지 않음

특히 소셜 로그인은 더 취약하다. 앱 OAuth code exchange는 refreshToken만 내려주고 쿠키를 설정하지 않는 계약이다. 그러면 RN은 바로 `login-status`를 호출하면서 401을 받고, 다시 app refresh로 쿠키를 받아야 한다. 이 경로가 배포 환경에서 실패하면 "로그인 성공 후 바로 풀림"처럼 보인다.

## 앱/웹 구분 제거 시 주의점

앱 로그인과 웹 로그인을 단순히 하나로 합치면서 모든 클라이언트에 `accessToken` / `refreshToken`을 응답 바디로 내려주면 웹 보안이 약해질 수 있다.

웹은 HttpOnly 쿠키를 쓰는 이유가 있다. refreshToken이 JS에서 읽히는 응답 바디에 노출되면 XSS 상황에서 토큰 탈취 위험이 커진다.

따라서 "앱/웹 구분 제거"는 아래처럼 해석하는 것이 안전하다.

- 제거해도 되는 것: `/auth/app/login`처럼 경로가 중복되어 있는 API 표면
- 제거하면 안 되는 것: 웹은 쿠키, 앱은 명시적 토큰을 쓰는 인증 전달 방식의 차이

## 권장 변경안

### 1. 앱 인증은 Bearer token 기반으로 명확히 지원

앱 로그인/refresh 응답에 accessToken과 refreshToken을 모두 내려준다.

예시:

```json
{
  "isSuccess": true,
  "code": "COMMON_200",
  "message": "성공입니다.",
  "result": {
    "accessToken": "...",
    "refreshToken": "...",
    "accessTokenExpiresIn": 7200,
    "refreshTokenExpiresIn": 2592000
  }
}
```

RN 앱은 다음처럼 동작한다.

- accessToken: 메모리 또는 SecureStore에 저장 후 `Authorization: Bearer ...`로 보호 API 호출
- refreshToken: SecureStore에 저장
- 401 발생 시 refreshToken으로 token pair 재발급
- refresh 실패가 명확히 401 / `AUTH_412`일 때만 로컬 토큰 삭제

### 2. 보호 API는 쿠키와 Authorization 둘 다 허용

백엔드 인증 필터는 다음 순서로 토큰을 해석한다.

1. `Authorization: Bearer <accessToken>`이 있으면 우선 사용
2. 없으면 기존처럼 `accessToken` 쿠키 사용
3. accessToken 만료 시 앱 경로에서는 refresh endpoint를 통해 명시적으로 갱신
4. 웹 쿠키 자동 refresh 정책은 현재 정책을 유지하거나 별도 검토

이렇게 하면 기존 웹은 깨지지 않고, RN 앱은 쿠키 저장소에 의존하지 않아도 된다.

### 3. WebSocket 인증도 Authorization을 허용

RN WebSocket/STOMP 연결 시 다음 중 하나를 백엔드가 허용해야 한다.

- WebSocket handshake header의 `Authorization: Bearer <accessToken>`
- STOMP CONNECT frame의 `Authorization: Bearer <accessToken>`

권장 우선순위는 STOMP CONNECT header다. 클라이언트에서 reconnect 시 새 accessToken을 넣기 쉽고, WebSocket handshake cookie 의존도를 낮출 수 있다.

### 4. 엔드포인트 통합은 후순위로 처리

엔드포인트를 꼭 줄이고 싶다면, 먼저 인증 전달 계약을 안정화한 뒤 진행한다.

가능한 형태:

```http
POST /api/v1/auth/login
X-Client-Type: APP
```

또는

```json
{
  "identifier": "user@example.com",
  "password": "Pass123!",
  "clientType": "APP"
}
```

단, 웹 요청에는 refreshToken을 응답 바디로 내려주지 않는 정책을 유지해야 한다.

## 백엔드에 요청할 작업

1. 앱 로그인/refresh 응답에 `accessToken`을 추가한다.
2. 보호 API 인증 필터에서 `Authorization: Bearer` accessToken을 허용한다.
3. 앱 refresh는 refreshToken을 받아 새 accessToken + refreshToken을 응답 바디로 내려준다.
4. WebSocket 인증에서 Authorization header 또는 STOMP CONNECT Authorization header를 허용한다.
5. 기존 웹 쿠키 인증은 유지한다.
6. 기존 `/auth/app/*`는 당장 삭제하지 말고, RN 앱 전환 완료 후 deprecated 처리한다.

## RN 앱 변경 예정

백엔드 계약이 추가되면 RN은 다음 방향으로 바꾼다.

1. SecureStore에 refreshToken 저장
2. accessToken은 앱 런타임 상태 또는 SecureStore에 저장
3. 모든 보호 API 요청에 `Authorization: Bearer <accessToken>` 추가
4. 401 발생 시 single-flight refresh 수행
5. refresh 성공 시 새 accessToken으로 원 요청 재시도
6. WebSocket 연결 시 Authorization 전달
7. 쿠키 기반 `credentials: include` 의존도 제거

## 수용 기준

백엔드 변경이 완료되었다고 판단하려면 아래가 통과해야 한다.

- 앱 로그인 응답 바디에 `accessToken`과 `refreshToken`이 모두 존재한다.
- 쿠키가 전혀 없는 요청도 `Authorization: Bearer <accessToken>`만으로 보호 API가 200을 반환한다.
- 만료된 accessToken 요청은 401을 반환하고, 앱 refresh로 새 token pair를 받을 수 있다.
- refreshToken replay는 기존처럼 실패해야 한다.
- 웹 로그인은 기존 쿠키 기반 플로우가 유지된다.
- WebSocket/STOMP 연결이 쿠키 없이 Authorization만으로 성공한다.
- 소셜 로그인 code exchange 이후에도 앱이 즉시 보호 API를 호출할 수 있다.

## 백엔드 공유용 요약문

현재 RN 앱은 `/auth/app/login`에서 refreshToken을 받아 SecureStore에 저장하지만, 보호 API 인증은 백엔드 쿠키 필터에 의존하고 있습니다. 배포 앱에서 네이티브 쿠키 저장/전송이 흔들리면 refreshToken이 로컬에 있어도 `/members/me/login-status`와 WebSocket 인증이 실패해서 로그인 상태가 풀리는 문제가 생깁니다.

앱/웹 로그인 경로 중복을 없애는 방향은 동의하지만, 웹에 refreshToken을 바디로 내려주는 식의 단순 통합은 보안상 위험합니다. 요청드리는 방향은 웹은 HttpOnly 쿠키 인증을 유지하고, 앱은 accessToken/refreshToken 응답 바디 + Authorization 헤더 인증을 공식 지원하는 것입니다.

우선 백엔드에서 앱 로그인/refresh 응답에 accessToken을 추가하고, 보호 API와 WebSocket에서 `Authorization: Bearer` 인증을 허용해 주시면 RN은 쿠키 의존도를 제거하는 방식으로 전환하겠습니다. 기존 웹 쿠키 플로우와 `/auth/app/*`는 전환 기간 동안 유지하고, RN 앱 전환 확인 후 deprecated 처리하는 방식이 안전합니다.
