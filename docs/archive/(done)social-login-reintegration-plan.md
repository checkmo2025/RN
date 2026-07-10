# 소셜 로그인 재연동 계획 (RN)

작성일: 2026-06-18
대상 브랜치: `ios-version-3`
목표: 앱 심사 때문에 제거했던 소셜 로그인(구글/카카오/네이버)을 다시 연동하되, **애플 로그인을 포함한 App Store 정책 준수** 형태로 재구축한다.

---

## 0. 요약 (TL;DR)

- 현재 RN 앱은 소셜 로그인 코드가 **완전히 제거**된 상태다. (이메일/닉네임 + 비밀번호 로그인만 동작)
- 백엔드(`checkmo_be2/BE`)는 구글/카카오/네이버 OAuth2가 **살아있지만 "웹 전용"**이다.
  - 성공 시 **쿠키를 굽고 `checkmo.co.kr`(웹)로 리다이렉트**하는 구조 → 네이티브 앱에서 그대로 쓰기 어렵다.
  - 앱은 별도로 `/auth/app/login`(바디로 refreshToken 반환)을 쓰고 있음 → 소셜도 **앱 전용 토큰 발급 엔드포인트가 필요**.
- **애플 로그인은 RN에도, 백엔드에도 아직 전혀 구현돼 있지 않다.** (신규 작업)
- App Store 가이드라인 4.8: 제3자 소셜 로그인을 제공하면 **Sign in with Apple도 반드시 제공**해야 함 → 애플 먼저 끝내고 나머지 붙이려는 현재 순서는 정책상 올바름.

권장 방향: **네이티브 SDK + 백엔드 앱 전용 토큰 엔드포인트** (Option A). 과거의 WebView 폴링 방식(Option B)은 빠르지만 심사 리스크가 크다.

---

## 1. 현재 상태 조사 결과

### 1-1. RN 앱 (제거 완료 상태)

| 영역 | 파일 | 현재 상태 |
|------|------|-----------|
| 로그인 화면 | [src/screens/AuthFlowScreen.tsx](../../src/screens/AuthFlowScreen.tsx) | 이메일/닉네임 + 비밀번호만. 소셜 버튼/WebView 모달 **삭제됨** |
| 인증 API | [src/services/api/authApi.ts](../../src/services/api/authApi.ts) | `OAuthProvider` 타입, `getOAuthLoginUrl()`, `getApiOrigin()` **삭제됨** |
| 인증 상태 | [src/contexts/AuthGateContext.tsx](../../src/contexts/AuthGateContext.tsx) | `loggedOut / profileIncomplete / loggedIn` 상태 존재 (소셜 신규가입 후 프로필 완성 흐름에 재사용 가능) |
| 토큰 저장 | [src/services/api/authTokenStore.ts](../../src/services/api/authTokenStore.ts) | refreshToken을 `expo-secure-store`에 저장 |
| 앱 설정 | [app.json](../../app.json) | 소셜 관련 plugin/scheme/entitlement 없음. bundleId `kr.co.checkmo.app` |
| 의존성 | [package.json](../../package.json) | 소셜 SDK 없음. `expo-dev-client`도 제거됨(Play 심사 정리) |
| 에셋 | `assets/icons/` | `googleLogo.svg`, `kakaoImage.svg`, `naverLogo.svg` **삭제됨** |

**과거 구현 방식(복원/참고용, 커밋 `37ed737^`):**
- `oauthProviders` 배열(google/naver/kakao) + 아이콘 버튼
- `react-native-webview`로 `${API_ORIGIN}/oauth2/authorization/{provider}` 로드하는 **모달**
- 로그인 후 `fetchLoginStatus`를 **폴링**해서 성공 감지 (`checkSocialLoginStatus`)
- → 네이티브에서 WebView 쿠키와 앱 fetch 쿠키가 공유되지 않는 구조라 본질적으로 취약했음.

### 1-2. 백엔드 (`checkmo_be2/BE`)

활성 OAuth2 provider: **구글 / 카카오 / 네이버** (애플 ❌)

| 항목 | 경로 |
|------|------|
| 인증 컨트롤러 | `BE/.../authentication/web/controller/AuthController.java` |
| 시큐리티 설정 | `BE/.../internal/config/SecurityConfig.java` |
| OAuth2 유저 서비스 | `BE/.../internal/security/oauth2/CustomOAuth2UserService.java` |
| provider 속성 파서 | `BE/.../internal/security/oauth2/OAuth2Attributes.java` |
| 성공 핸들러 | `BE/.../internal/security/oauth2/OAuth2AuthenticationSuccessHandler.java` |
| 유저 변환 | `BE/.../internal/converter/AuthConverter.java` |
| OAuth2 설정 | `BE/src/main/resources/application-oauth2.yml` |

핵심 동작:
- 웹 리다이렉트 플로우: `GET /oauth2/authorization/{provider}` → provider 로그인 → `/login/oauth2/code/{provider}` 콜백
- `CustomOAuth2UserService`가 이메일로 기존회원 조회, 신규면 `AuthConverter.toOAuth2User()`로 생성
  - `AuthUser.id = "{PROVIDER}_{providerId}"`, `password=""`, `profileCompleted=false`
- 성공 핸들러: `jwtLoginProcessor.processLogin()`으로 **쿠키 설정** 후 웹(`app.oauth2.redirect.base-uri`)으로 리다이렉트
  - 프로필 완성 → `/`, 미완성 → `/signup/terms?isSocial=true`

**앱 전용 엔드포인트(이메일용, 토큰을 바디로 반환):**
- `POST /api/v1/auth/app/login` → `AuthResponseDTO.Login`
- `POST /api/v1/auth/app/refresh`
- `POST /api/v1/auth/app/logout`
- → **소셜용 앱 전용 엔드포인트는 없음.** 이게 이번 작업의 백엔드 핵심.

---

## 2. 아키텍처 결정 (먼저 정해야 함)

### Option A — 네이티브 SDK + 앱 전용 토큰 엔드포인트 ✅ 권장
1. 기기에서 네이티브 SDK로 로그인 → `idToken`/`accessToken` 획득
   - Apple: `expo-apple-authentication` (identityToken JWT)
   - Google: `@react-native-google-signin/google-signin` (idToken)
   - Kakao: `@react-native-seoul/kakao-login` (accessToken)
   - Naver: `@react-native-seoul/naver-login` (accessToken)
2. RN이 백엔드 신규 엔드포인트로 토큰 전송 → 백엔드가 검증 후 **refreshToken을 바디로 반환** → `authTokenStore`에 저장 (이메일 로그인과 동일 흐름)

- 장점: App Store 정책 준수(특히 Apple 네이티브 필수), 쿠키 의존 제거, 견고함
- 단점: 백엔드 신규 엔드포인트 + provider별 토큰 검증 구현 필요, 네이티브 모듈이라 **EAS Dev Build/Prebuild 필요(Expo Go 불가)**

### Option B — 과거 WebView 폴링 방식 복원
- 빠르지만 ① Apple은 WebView 기반 OAuth 거부 가능 ② 네이티브 쿠키 공유 취약 ③ 애플 네이티브 요구사항 미충족
- → **비권장.** 임시/웹뷰 한정으로만.

> 결정 필요: **Option A로 진행 + 재연동할 provider 목록(애플/구글/카카오/네이버 중)** 확정.

---

## 3. 백엔드 선행 작업 (`checkmo_be2/BE`) — RN보다 먼저 필요

> RN 작업은 이 엔드포인트가 있어야 완성된다.

1. **애플 provider 추가**
   - `OAuth2Attributes`에 APPLE 분기, Apple 공개키(JWKS)로 `identityToken` JWT 검증 로직
   - `application-oauth2.yml`에 Apple client 설정, `.env`에 Apple Service ID/Key
2. **앱 전용 소셜 로그인 엔드포인트 신설** (예: `POST /api/v1/auth/app/oauth/{provider}`)
   - 요청 바디: `{ "token": "<idToken 또는 accessToken>" }`
   - 동작: provider별 토큰 검증 → 이메일/providerId 추출 → 기존/신규 회원 처리(`CustomOAuth2UserService`/`AuthConverter` 재사용) → `AuthResponseDTO.Login`(refreshToken 등) **바디 반환**
   - 응답에 `isProfileCompleted` 포함 → RN이 프로필 완성 화면 분기
3. provider별 검증
   - Google: idToken 검증(aud=클라이언트ID)
   - Apple: identityToken JWT 서명/aud/iss 검증
   - Kakao/Naver: accessToken으로 user-info 호출해 이메일/ID 확보
4. 기존 웹 쿠키 플로우는 그대로 두고 **앱 경로만 추가** (웹 FE와 공존)

---

## 4. RN 수정 작업 목록

### 4-1. 의존성 / 빌드
- [ ] `package.json`에 SDK 추가
  - `expo-apple-authentication`
  - `@react-native-google-signin/google-signin`
  - `@react-native-seoul/kakao-login` (+ 필요 시 `@react-native-seoul/naver-login`)
- [ ] 네이티브 모듈 → **Expo Go 불가**. `expo prebuild` 또는 EAS Dev Build 파이프라인 정비
  - 과거 제거한 `expo-dev-client` 재도입 검토(개발용)

### 4-2. `app.json`
- [ ] iOS: `ios.usesAppleSignIn: true` (Apple 엔타이틀먼트)
- [ ] config plugins 추가
  - `expo-apple-authentication`
  - `@react-native-google-signin/google-signin` (iOS reversed client id)
  - kakao plugin (iOS URL scheme `kakao{NATIVE_APP_KEY}`, Android queries)
- [ ] bundleId/package는 `kr.co.checkmo.app` 유지(provider 콘솔 등록값과 일치 확인)

### 4-3. `src/services/api/authApi.ts`
- [ ] `export type OAuthProvider = 'apple' | 'google' | 'kakao' | 'naver';` 복원/확장
- [ ] 신규 함수: `loginBySocial(provider, token)` → `POST /auth/app/oauth/{provider}` 호출 → 응답 refreshToken을 `saveStoredRefreshToken()` 저장 (`loginByIdentifier` 패턴 그대로)
- [ ] 응답의 `isProfileCompleted`로 프로필 완성 필요 여부 반환
- [ ] (Option B 안 쓰면) `getOAuthLoginUrl`/WebView 관련은 복원하지 않음

### 4-4. `src/screens/AuthFlowScreen.tsx`
- [ ] 로그인 스텝(라인 ~1526)에 소셜 버튼 영역 재추가
  - iOS는 **Apple 버튼 필수**(가이드라인), Android는 Apple 생략 가능
- [ ] 각 버튼 onPress → 네이티브 SDK 로그인 → 토큰 획득 → `authApi.loginBySocial()` 호출
- [ ] 성공 시: 기존 `completeAuthFlow` 재사용, `isProfileCompleted=false`면 `profileCompletion` 모드로 전환(`AuthGateContext`)
- [ ] 과거 WebView 모달/폴링 상태값(`socialLoginProvider`, `socialLoginWebViewKey`, `checkSocialLoginStatus` 등)은 **복원하지 않고 네이티브 콜백으로 대체**

### 4-5. 에셋
- [ ] `assets/icons/`에 아이콘 복원/추가: `googleLogo.svg`, `kakaoImage.svg`, `naverLogo.svg`, `appleLogo`
  - 과거 커밋 `9b75c46^`에서 복원 가능
- [ ] 각 provider 브랜드 가이드라인 준수한 버튼 디자인(특히 Apple/Google)

### 4-6. 인증 상태/세션
- [ ] `AuthGateContext`: 소셜 신규가입 → `profileIncomplete` 흐름 연결 확인(이미 존재)
- [ ] 로그아웃/리프레시: 소셜도 동일하게 `/auth/app/logout`, `/auth/app/refresh` 사용(앱 토큰 통일)

---

## 5. 권장 진행 순서

1. **결정**: provider 목록 + Option A 확정
2. **BE**: 애플 검증 + 앱 전용 소셜 엔드포인트 구현/배포 (RN 선행 의존성)
3. **RN 빌드환경**: prebuild/EAS Dev Build 정비
4. **RN 코드**: app.json → authApi → AuthFlowScreen → 에셋 순
5. **provider 콘솔**: Apple(Service ID/Key), Google(iOS/Android OAuth client), Kakao/Naver 앱 등록·키 발급, redirect/bundle 일치 확인
6. **실기기 테스트**: 신규가입(프로필 미완성) / 기존 로그인 / 토큰 리프레시 / 로그아웃
7. **심사 제출**: Apple 포함 상태로

---

## 6. 리스크 / 결정 필요 사항

- ⚠️ **Expo Go 불가**: 네이티브 모듈 → Dev Build 필수. 현재 빌드 파이프라인 점검 필요.
- ⚠️ **백엔드 신규 작업 분량**: 애플 검증 + 앱 전용 소셜 엔드포인트는 신규 구현. RN만으로 끝나지 않음.
- ⚠️ **provider 콘솔 키 관리**: `.env`에 노출된 기존 시크릿이 있으므로(레포 내 평문) 재발급/관리 정책 점검 권장.
- ❓ 재연동 provider 범위(애플/구글/카카오/네이버 전부 vs 일부)
- ❓ Option A(네이티브) 확정 여부
- ❓ Android에서 Apple 버튼 노출 여부(보통 iOS만)

---

## 7. 참고 (과거 제거 이력)

| 날짜 | 커밋 | 내용 |
|------|------|------|
| 2026-03-30 | `37ed737` | 로그인 화면 소셜 UI/WebView 모달 제거, `authApi`의 `OAuthProvider`/`getOAuthLoginUrl` 제거 |
| 2026-05-07 | `9b75c46` | 소셜 아이콘 에셋 및 `LoginStatus.provider` 필드 제거 |
| 2026-06-16 | `fa69326` | Play Store 심사 준비(권한 정리, `expo-dev-client` 제거 등) |

복원 참고: `git show 37ed737^:src/screens/AuthFlowScreen.tsx`, `git show 9b75c46^ -- assets/icons/`
