# Checkmo API 버전 관리 가이드

> 작성일: 2026-06-21 KST
> 적용 대상: Backend, Web FE, React Native
> 기본 API 버전: `v1`

## 1. 목적

Checkmo의 API 버전은 HTTP URI의 major 버전으로 관리한다.

```text
https://api.checkmo.co.kr/api/v1/...
https://api.checkmo.co.kr/api/v2/...
```

현재 API는 모두 `v1`을 사용한다. 앞으로 호환되지 않는 변경이 필요한 API만 `v2` endpoint를 추가하고, 웹과 RN에서 해당 API 호출만 `v2`로 전환한다.

웹 버전, RN 앱 버전, Expo `runtimeVersion`은 API 버전과 별개다. 앱이 `1.0.1`이어도 `v1`과 `v2` API를 함께 호출할 수 있다.

## 2. 공통 원칙

1. 기본 API 버전은 계속 `v1`이다.
2. 기존 `/api/v1/...` endpoint를 `/api/v2/...`로 이동하거나 제거하지 않는다.
3. breaking change가 필요한 API만 같은 기능의 `/api/v2/...` endpoint를 추가한다.
4. 웹과 RN은 변경된 API 호출에만 `v2`를 지정한다.
5. 기존 v1 사용자가 남아 있는 동안 BE의 v1 endpoint를 유지한다.
6. 전체 API가 v2로 제공되기 전에는 환경변수나 공통 기본 버전을 v2로 변경하지 않는다.

### v2가 필요한 변경

- request 필수 필드 추가 또는 기존 필드 의미 변경
- response 필드 제거, 이름 변경, 타입 변경
- endpoint path 또는 HTTP method 변경
- 인증·토큰 전달 방식 변경
- 성공 status, error code 또는 오류 처리 계약 변경

optional response 필드 추가, 신규 endpoint 추가, 기존 동작을 유지하는 버그 수정은 v1에서 처리한다.

## 3. Backend 작업 규칙

### 3-1. 현재 v1 유지

현재 controller의 `/api/v1/...` mapping은 그대로 유지한다.

```java
@RequestMapping("/api/v1/members")
public class MemberController {
}
```

기존 controller mapping을 v2로 바꾸면 구버전 웹과 앱이 즉시 중단되므로 금지한다.

### 3-2. breaking API만 v2 추가

예를 들어 회원 프로필 응답 계약만 변경된다면 기존 v1 API를 보존하고 v2 controller를 추가한다.

```text
GET /api/v1/members/me  # 기존 응답 유지
GET /api/v2/members/me  # 변경된 응답 제공
```

v2 controller와 DTO는 버전별 web adapter로 분리하되, 변경할 필요가 없는 domain service와 repository는 재사용한다.

```java
@RequestMapping("/api/v2/members")
public class MemberV2Controller {
}
```

### 3-3. 함께 수정할 항목

v2 endpoint를 추가하는 작업에는 다음 항목을 같은 PR에 포함한다.

- controller mapping과 v2 request/response DTO
- Spring Security public/protected matcher
- JWT·프로필 완성 filter의 예외 경로
- Swagger/OpenAPI 문서
- v1 회귀 테스트와 v2 신규 계약 테스트

OAuth 시작 경로, OAuth callback, `/health`, Swagger 경로와 `/ws-stomp`는 REST API 버전 대상이 아니다.

### 3-4. BE 완료 기준

- v1 요청이 변경 전과 같은 status와 response를 반환한다.
- v2 요청이 신규 계약대로 동작한다.
- v1과 v2의 인증 권한이 의도대로 적용된다.
- 웹/RN이 전환되기 전에 v2가 운영 서버에 먼저 배포된다.

## 4. Web FE 작업 규칙

### 4-1. 기본값은 기존 v1 유지

현재 환경변수는 그대로 v1 base URL을 사용한다.

```env
NEXT_PUBLIC_API_URL=https://api.checkmo.co.kr/api/v1
```

모든 endpoint 파일에 `/v1`을 반복해서 작성하지 않는다. 기존 `API_BASE_URL`을 v1 기본값으로 사용한다.

### 4-2. 버전 선택 helper

공통 API 설정에 지원 버전과 base URL 변환 함수만 추가한다.

```ts
export type ApiVersion = "v1" | "v2";

export function getApiBaseUrl(version: ApiVersion = "v1") {
  const v1BaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!v1BaseUrl) throw new Error("NEXT_PUBLIC_API_URL is required.");
  return v1BaseUrl.replace(/\/v1\/?$/, `/${version}`);
}
```

기존 v1 endpoint는 수정하지 않고, v2로 전환할 endpoint만 명시적으로 v2 base를 사용한다.

```ts
const MEMBER_ENDPOINTS = {
  GET_PROFILE: `${getApiBaseUrl("v2")}/members/me`,
};
```

공통 `apiClient`에 `apiVersion` 옵션을 추가하는 방식도 가능하지만, 한 프로젝트 안에서는 한 방식으로만 사용한다.

### 4-3. 웹 완료 기준

- 변경 대상 API만 `/api/v2/...`를 호출한다.
- 로그인, SSR metadata, 관리자 화면을 포함한 나머지 요청은 계속 `/api/v1/...`를 호출한다.
- 환경변수를 전체 `/api/v2`로 변경하지 않는다.
- S3 presigned URL upload와 OAuth provider URL에는 API 버전 helper를 사용하지 않는다.

## 5. React Native 작업 규칙

### 5-1. 현재 공통 HTTP 계층 사용

RN의 `src/services/api/http.ts`는 기본 `v1`과 요청별 `apiVersion`을 이미 지원한다. 환경변수도 현재 형태를 유지한다.

```env
EXPO_PUBLIC_API_BASE_URL=https://api.checkmo.co.kr/api/v1
```

지원 버전 타입만 제한한다.

```ts
export type ApiVersion = "v1" | "v2";
```

`RequestOptions`와 `FetchApiOptions`의 `apiVersion?: string`은 `apiVersion?: ApiVersion`으로 변경한다.

### 5-2. 변경된 API만 v2 지정

기존 호출은 옵션을 생략해 v1을 사용한다.

```ts
requestJson('/news');
// GET /api/v1/news
```

v2로 변경된 API 서비스 함수에만 버전을 지정한다.

```ts
requestJson('/members/me', {
  apiVersion: 'v2',
});
// GET /api/v2/members/me
```

화면 컴포넌트에서 버전을 선택하지 않는다. `memberApi.ts`, `authApi.ts` 같은 도메인 API 함수가 자기 endpoint의 버전을 소유한다.

### 5-3. RN 완료 기준

- 변경된 도메인 API 함수만 v2를 지정한다.
- refresh, login, logout과 나머지 API는 계속 v1을 사용한다.
- 잘못된 버전 문자열이 TypeScript 단계에서 차단된다.
- 새 버전은 실제 기기와 production EAS build에서 확인한다.

## 6. API별 전환 기록

v2 endpoint가 추가될 때마다 아래 표에 한 행을 추가한다.

| 기능/API | v1 유지 | 신규 버전 | BE 배포 | Web 전환 | RN 전환 | 비고 |
|---|---|---|---|---|---|---|
| 현재 전체 API | 유지 | 없음 | 완료 | v1 사용 | v1 사용 | 기본 상태 |

코드만 보고 버전을 추측하지 않도록 BE·Web·RN PR에서 이 표를 함께 갱신한다.

## 7. 배포 순서

1. BE에 기존 v1을 유지한 상태로 v2 endpoint와 테스트를 추가한다.
2. BE v2를 운영에 먼저 배포하고 Swagger 또는 smoke test로 확인한다.
3. Web의 해당 API endpoint만 v2로 전환해 배포한다.
4. RN의 해당 도메인 API 함수만 `apiVersion: 'v2'`로 변경한다.
5. RN OTA 또는 스토어 업데이트를 배포한다.
6. 서버 로그에서 v1·v2 요청량과 4xx/5xx를 확인한다.

Web이나 RN을 먼저 배포하면 아직 존재하지 않는 v2를 호출하므로 반드시 BE를 먼저 배포한다.

## 8. v1 제거 조건

v2가 추가됐다는 이유만으로 v1을 제거하지 않는다. 다음 조건을 모두 확인한 뒤 별도 작업으로 결정한다.

- 지원 중인 Web과 RN 버전이 해당 v1 endpoint를 더 이상 호출하지 않는다.
- 구버전 RN 사용자가 업데이트할 수 있는 기간이 충분히 지났다.
- 서버 로그에서 정상적인 v1 요청이 더 이상 확인되지 않는다.
- v1 제거 일정과 영향 범위를 팀이 명시적으로 승인했다.

현재 단계에서는 v1 제거를 계획하지 않는다.

## 9. 핵심 요약

```text
BE: v1 유지 + breaking API만 v2 추가
Web: 기본 v1 + 변경된 endpoint만 v2 base 사용
RN: 기본 v1 + 변경된 도메인 API 함수만 apiVersion: 'v2'
배포: BE v2 → Web → RN
제거: 구버전 사용량 확인 전까지 v1 유지
```
