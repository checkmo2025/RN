# Silent Refresh (자동 로그인 유지) 구현 계획

> 작성일: 2026-06-09
> 상태: 구현 대기

---

## 배경 및 문제

현재 앱은 **쿠키 기반 JWT 인증** 방식을 사용한다.

- 로그인 시 BE가 `accessToken`(2시간), `refreshToken`(14일) 쿠키를 내려줌
- 앱 시작 시 `GET /members/me/login-status`를 호출해 로그인 상태 확인
- BE의 `JwtAuthenticationFilter`가 Access Token 만료 시 Refresh Token으로 자동 재발급

### 문제점

React Native에서 **쿠키가 앱 재시작 시 유실**될 수 있다.

- `httpOnly + secure + SameSite=None` 쿠키는 개발 환경(HTTP)에서 거부됨
- Android CookieManager flush 타이밍 이슈
- 쿠키가 없으면 BE 필터가 재발급 시도 자체를 할 수 없음 → 401 → 로그아웃 처리

---

## 해결 방향

로그인 시 **Refresh Token 값을 `expo-secure-store`에 별도 저장**해두고,
앱 재시작 시 쿠키가 없어 401이 발생하면 **저장된 토큰으로 Silent Refresh**를 시도한다.

---

## 구현 계획

### BE (5개 파일)

#### 1. `AuthResponseDTO.java` — Login DTO 추가
```java
@Getter @Builder @NoArgsConstructor @AllArgsConstructor
public static class Login {
    private String refreshToken;
}
```

#### 2. `JwtLoginProcessor.java` — processLogin 반환값 변경
```java
// void → String (refresh token 반환)
public String processLogin(HttpServletResponse response, Authentication authentication) {
    // 기존 로직 동일
    return jwtToken.getRefreshToken();
}
```

#### 3. `AuthFacade.java` — login() 반환값 변경
```java
// void → String
public String login(AuthRequestDTO.Login request, HttpServletResponse response) {
    Authentication authentication = authSessionCommandService.login(request);
    return jwtLoginProcessor.processLogin(response, authentication);
}
```

#### 4. `AuthController.java` — 로그인 응답에 refresh token 포함
```java
public ApiResponse<AuthResponseDTO.Login> login(...) {
    String refreshToken = authFacade.login(request, response);
    return ApiResponse.onSuccess(Login.builder().refreshToken(refreshToken).build());
}
```

#### 5. `MemberController.java` — `/me/refresh` 엔드포인트 추가
```java
// POST /api/members/me/refresh
// JwtAuthenticationFilter가 요청을 가로채 Access Token 자동 재발급
// 이 컨트롤러 자체는 로직 없이 200 반환만
public ApiResponse<Void> refreshToken() {
    return ApiResponse.onSuccess(null);
}
```

> `/api/members/**`는 필터 제외 경로가 아니므로 필터가 정상 동작함.

---

### RN (설치 + 3개 파일)

#### 설치
```
expo-secure-store (설치 완료)
```

#### 1. `src/services/tokenStore.ts` (신규)
```ts
import * as SecureStore from 'expo-secure-store';

const KEY = 'refreshToken';

export const saveRefreshToken = (token: string) => SecureStore.setItemAsync(KEY, token);
export const getRefreshToken = () => SecureStore.getItemAsync(KEY);
export const deleteRefreshToken = () => SecureStore.deleteItemAsync(KEY);
```

#### 2. `authApi.ts` — 3곳 수정

**loginByIdentifier**: 로그인 성공 시 refresh token → SecureStore 저장
```ts
const response = await requestJson<ApiEnvelope<{ refreshToken: string }>>('/auth/login', { ... });
const token = unwrapResult(response)?.refreshToken;
if (token) await saveRefreshToken(token);
```

**silentRefreshSession()** 신규 추가:
```ts
export async function silentRefreshSession(): Promise<boolean> {
  const storedToken = await getRefreshToken();
  if (!storedToken) return false;

  try {
    // Cookie 헤더 수동 주입 → BE 필터가 refresh token 인식 → 새 Access Token 쿠키 발급
    await requestJson('/members/me/refresh', {
      method: 'POST',
      headers: { Cookie: `refreshToken=${storedToken}` },
      suppressErrorToast: true,
    });
    return true;
  } catch {
    await deleteRefreshToken(); // 유효하지 않으면 저장된 토큰도 삭제
    return false;
  }
}
```

**logoutSession()**: 로그아웃 시 SecureStore 토큰도 함께 삭제
```ts
export async function logoutSession(): Promise<void> {
  await requestJson('/auth/logout', { method: 'POST' });
  await deleteRefreshToken();
}
```

#### 3. `AuthGateContext.tsx` — 앱 시작 시 silent refresh 시도

```ts
// 기존: 401 → isLoggedIn = false
// 변경:
const syncLoginState = async () => {
  try {
    const status = await fetchLoginStatusSilently(true);
    setLoginState(status !== null);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await silentRefreshSession();
      if (refreshed) {
        try {
          const status = await fetchLoginStatusSilently(true);
          setLoginState(status !== null);
        } catch {
          setLoginState(false);
        }
      } else {
        setLoginState(false);
      }
    } else {
      setLoginState(false);
    }
  } finally {
    setIsReady(true);
  }
};
```

---

## 전체 흐름

```
앱 재시작
  └─ fetchLoginStatus() 호출
       ├─ 쿠키 살아있음 → 200 → 자동 로그인 ✅ (기존 동작)
       └─ 쿠키 없음 (401)
            ├─ SecureStore에서 refresh token 꺼냄
            │    ├─ 없음 → 로그아웃 화면
            │    └─ 있음
            │         └─ POST /members/me/refresh (Cookie 헤더 수동 주입)
            │              ├─ BE 필터: refresh token 검증 → 새 Access Token 쿠키 발급
            │              ├─ 성공 → fetchLoginStatus() 재시도 → 자동 로그인 ✅
            │              └─ 실패 (토큰 만료/불일치) → SecureStore 토큰 삭제 → 로그아웃 화면
```

---

## 참고

- Access Token 유효시간: **2시간** (`application-jwt.yml`)
- Refresh Token 유효시간: **14일** (`application-jwt.yml`)
- 필터 제외 경로: `/api/auth/**`, `/swagger-ui/**` 등 (`JwtAuthenticationFilter.java`)
- `/api/members/me/refresh`는 제외 경로가 아니므로 필터 정상 동작
