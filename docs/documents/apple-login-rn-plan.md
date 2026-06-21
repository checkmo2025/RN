# Apple 로그인 React Native 구현 계획

> 작성 기준일: 2026-06-18 KST
> 기준 앱: Expo SDK 54 / React Native 0.81
> iOS Bundle ID: `kr.co.checkmo.app`
> 상태: 구현 대기

## 1. 목적과 범위

현재 이메일·닉네임 로그인 화면에 Apple 공식 로그인 버튼을 추가하고, Apple credential을 백엔드의 Checkmo 세션으로 교환한다.

- 1차 지원 범위는 iOS 앱이다.
- Android와 Web에는 Apple 버튼을 표시하지 않는다.
- `expo-apple-authentication`의 네이티브 인증 UI를 사용한다.
- RN은 Apple credential을 자체 검증하거나 회원을 직접 식별하지 않는다.
- 백엔드가 반환한 Checkmo refresh token을 기존 SecureStore 세션에 저장한다.
- 신규 회원은 이메일 인증과 비밀번호 설정을 생략하고 기존 프로필 추가정보 흐름으로 이동한다.

## 2. 현재 RN 인증 구조

### 주요 구성

| 구성 | 현재 책임 | Apple 연동 시 역할 |
| --- | --- | --- |
| `src/screens/AuthFlowScreen.tsx` | 로그인·회원가입·프로필 완성 화면과 상태 관리 | Apple 버튼, submitting 상태, 성공 분기 추가 |
| `src/services/api/authApi.ts` | 앱 로그인, refresh, logout, login-status API | `loginWithApple()` 추가 및 refresh token 저장 |
| `src/services/api/authTokenStore.ts` | SecureStore refresh token 보관 | 변경 없이 재사용 |
| `src/services/api/http.ts` | API envelope, cookie, silent refresh, 오류 처리 | 기존 request/unwrap 로직 재사용 |
| `src/contexts/AuthGateContext.tsx` | loggedOut/profileIncomplete/loggedIn 상태 전환 | Apple 신규 회원도 기존 profileIncomplete 처리 |

현재 이메일 로그인은 다음 순서다.

1. `loginByIdentifier()`가 `/auth/app/login`을 호출한다.
2. 응답 refresh token을 SecureStore에 저장한다.
3. `fetchLoginStatusSilently()`로 프로필 상태를 확인한다.
4. 정상 회원은 `completeAuthFlow()`로 로그인 화면을 닫는다.
5. `AUTH_403` 프로필 미완성 회원은 `enterProfileCompletionFlow()`로 추가정보 화면에 진입한다.

Apple 로그인도 같은 Checkmo session 및 AuthGate 상태를 사용한다.

## 3. 패키지와 Expo 설정

### 패키지 설치

Expo SDK에 맞는 버전을 `expo install`로 설치한다.

```bash
npx expo install expo-apple-authentication expo-crypto
```

- `expo-apple-authentication`: Apple 공식 인증 UI와 credential 제공
- `expo-crypto`: 안전한 random bytes와 SHA-256 nonce 생성

### `app.json`

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "kr.co.checkmo.app",
      "usesAppleSignIn": true
    },
    "plugins": [
      "expo-apple-authentication"
    ]
  }
}
```

기존 plugin 배열은 유지하고 `expo-apple-authentication`만 추가한다.

### iOS capability와 entitlement

EAS Build 또는 prebuild 이후 `ios/app/app.entitlements`에 다음 값이 반영되는지 확인한다.

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

Apple Developer에서 App ID `kr.co.checkmo.app`의 Sign in with Apple capability를 활성화한다. 기존 provisioning profile에 capability가 없다면 development와 production profile을 다시 생성한다. 설정 변경은 OTA 업데이트만으로 적용할 수 없으므로 새 iOS 바이너리가 필요하다.

Expo Go는 실제 앱과 Apple token의 `aud`가 다를 수 있다. API 연동 완료 판정은 Bundle ID가 적용된 EAS development build와 실기기에서만 한다.

## 4. 백엔드 API 계약

### 요청

```http
POST /api/v1/auth/app/apple/login
Content-Type: application/json
```

```json
{
  "identityToken": "eyJraWQiOiJ...",
  "authorizationCode": "c1234567890...",
  "rawNonce": "f6fb53f4c9f3487e9bc44ef6d4f7b4fc"
}
```

`identityToken`, `authorizationCode`, `rawNonce`는 모두 필수다. Apple credential에서 token 또는 code가 `null`이면 API를 호출하지 않는다.

### 성공 응답

```json
{
  "isSuccess": true,
  "code": "COMMON_200",
  "message": "성공입니다.",
  "result": {
    "refreshToken": "checkmo-refresh-token",
    "isProfileCompleted": false,
    "isNewUser": true
  }
}
```

의미:

- `refreshToken`: Apple token이 아닌 Checkmo refresh token
- `isProfileCompleted`: 기존 프로필 추가정보 완료 여부
- `isNewUser`: 이번 Apple 요청에서 Checkmo 회원이 새로 생성됐는지 여부
- 기존 이메일 계정에 Apple이 자동 연결된 경우 `isNewUser=false`

### 오류 계약

백엔드와 RN 문서에서 아래 계약을 동일하게 사용한다.

| HTTP | 코드 | 조건 | RN 처리 |
| --- | --- | --- | --- |
| 400 | `APPLE_AUTH_400` | 필수 credential 누락, 형식 오류, 최초 가입에 사용 가능한 검증 이메일 없음 | Apple 로그인을 완료할 수 없다는 안내 |
| 401 | `APPLE_AUTH_401` | 서명·issuer·audience·만료·nonce 검증 실패 또는 authorization code 무효/재사용 | 인증 실패 안내 후 재시도 허용 |
| 409 | `APPLE_AUTH_409` | Apple identity가 다른 회원에 이미 연결됨, 동시 연결 충돌 | 다른 계정에 연결된 Apple 계정 안내 |
| 502 | `APPLE_AUTH_502` | Apple JWKS/token/revoke 서버 장애 또는 타임아웃 | 잠시 후 다시 시도 안내 |
| 500 | `COMMON_500` | 저장·암호화·JWT 발급 등 내부 오류 | 일반 로그인 실패 안내 |

## 5. nonce 생성과 Apple 인증

nonce는 replay 공격을 막기 위해 매 로그인 시 새로 만든다.

1. `expo-crypto`의 안전한 난수 API로 최소 32바이트 random 값을 만든다.
2. 이를 lowercase hex 또는 base64url 문자열인 `rawNonce`로 인코딩한다.
3. `SHA-256(rawNonce)`를 lowercase hex인 `hashedNonce`로 계산한다.
4. `hashedNonce`를 `AppleAuthentication.signInAsync({ nonce })`에 전달한다.
5. 백엔드 요청에는 해시가 아닌 `rawNonce`를 전달한다.
6. raw/hashed nonce를 SecureStore, AsyncStorage, 전역 상태 또는 로그에 저장하지 않는다.

예상 흐름:

```ts
const randomBytes = await Crypto.getRandomBytesAsync(32);
const rawNonce = bytesToHex(randomBytes);
const hashedNonce = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  rawNonce,
);

const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
  nonce: hashedNonce,
});
```

`Math.random()`과 고정 nonce를 사용하지 않는다. Apple이 이름과 이메일을 최초 동의 시점에만 줄 수 있으므로 RN에서 이 값을 재로그인 식별자로 저장하거나 API payload의 신뢰 근거로 사용하지 않는다. 백엔드는 ID Token claim과 `sub`를 기준으로 처리한다.

## 6. API 함수 설계

`src/services/api/authApi.ts`에 다음 타입과 함수를 추가한다.

```ts
export type AppleLoginPayload = {
  identityToken: string;
  authorizationCode: string;
  rawNonce: string;
};

export type AppleLoginResult = {
  isProfileCompleted: boolean;
  isNewUser: boolean;
};

export async function loginWithApple(
  payload: AppleLoginPayload,
): Promise<AppleLoginResult> {
  // POST /auth/app/apple/login
  // result.refreshToken 검증
  // saveStoredRefreshToken(refreshToken)
  // 화면 분기에 필요한 두 boolean 반환
}
```

구현 규칙:

- 기존 `requestJson<ApiEnvelope<...>>()`, `unwrapResult()`를 사용한다.
- URL은 `http.ts`의 API base에 `/auth/app/apple/login`을 넘겨 최종 `/api/v1/auth/app/apple/login`이 되게 한다.
- `refreshToken`이 없으면 기존 이메일 로그인과 동일하게 `MISSING_REFRESH_TOKEN` 오류를 낸다.
- refresh token 저장이 성공한 뒤에만 성공 결과를 반환한다.
- Apple identity/access/refresh token과 authorization code는 RN 저장소에 보관하지 않는다.
- Checkmo refresh token 저장 실패 시 로그인 성공으로 화면 전환하지 않는다.

## 7. 로그인 화면 UI

### 노출 조건

Apple 버튼은 아래 두 조건을 모두 만족할 때만 렌더링한다.

```ts
Platform.OS === 'ios' && appleLoginAvailable
```

`appleLoginAvailable`은 로그인 화면 mount 시 `AppleAuthentication.isAvailableAsync()` 결과로 설정한다. 확인 중이거나 실패하면 버튼을 숨기되 이메일 로그인은 그대로 사용할 수 있어야 한다.

Android에서는 모듈 메서드를 호출하지 않고 버튼도 렌더링하지 않는다.

### 버튼 구성

`AppleAuthentication.AppleAuthenticationButton`을 사용한다. Apple 버튼을 일반 `Pressable`, 이미지 또는 자체 SVG로 재구현하지 않는다.

권장 속성:

```tsx
<AppleAuthentication.AppleAuthenticationButton
  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
  cornerRadius={8}
  style={styles.appleLoginButton}
  onPress={() => { void handleAppleLogin(); }}
/>
```

- 현재 로그인 카드 폭에 맞추고 Apple 최소 버튼 높이·여백 가이드를 지킨다.
- 이메일 로그인 CTA와 Apple 버튼 사이에 구분 문구를 둔다.
- availability가 false일 때 빈 버튼 자리나 레이아웃 공백을 남기지 않는다.
- 기본 컴포넌트의 공식 문구와 Apple 로고를 변형하지 않는다.

## 8. 화면 상태와 이벤트 처리

`AuthFlowScreen`에 `appleLoginAvailable`, `appleLoginSubmitting` 상태를 추가한다.

### `handleAppleLogin()`

1. `appleLoginSubmitting` 또는 `loginSubmitting` 중이면 반환한다.
2. Apple availability를 다시 확인하거나 준비 상태를 확인한다.
3. `appleLoginSubmitting=true`로 바꾼다.
4. raw nonce와 hashed nonce를 만든다.
5. EMAIL과 FULL_NAME scope로 `signInAsync()`를 호출한다.
6. `identityToken`, `authorizationCode`가 모두 있는지 확인한다.
7. `loginWithApple()`을 호출한다.
8. 응답에 따라 신규/기존 프로필 흐름으로 이동한다.
9. `finally`에서 submitting 상태를 해제한다.

### 취소와 오류

- `ERR_REQUEST_CANCELED`: 사용자가 의도적으로 닫은 것이므로 토스트 없이 종료한다.
- credential token/code 누락: `Apple 로그인 정보를 확인할 수 없습니다. 다시 시도해 주세요.`
- `APPLE_AUTH_400`: `이 Apple 계정으로 로그인을 완료할 수 없습니다.`
- `APPLE_AUTH_401`: `Apple 인증에 실패했습니다. 다시 시도해 주세요.`
- `APPLE_AUTH_409`: `이미 다른 계정에 연결된 Apple 계정입니다.`
- `APPLE_AUTH_502`: `Apple 로그인 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.`
- 그 외: `Apple 로그인에 실패했습니다.`

오류 객체, token, code, nonce를 `console.log`나 Sentry breadcrumb에 그대로 남기지 않는다.

Apple 로그인 중에는 Apple 버튼 재탭을 막는다. 공식 버튼이 loading UI를 직접 제공하지 않으므로 버튼 영역을 비활성 overlay로 막고 기존 앱 로딩 문구 규칙에 맞는 `Apple 로그인 중...` 피드백을 인접 영역에 표시한다.

## 9. 성공 후 화면 분기

### 프로필 완료 회원

```text
loginWithApple 성공
  -> fetchLoginStatusSilently(true)
  -> 로그인 성공 토스트
  -> completeAuthFlow()
  -> AuthGate loggedIn
```

- `isNewUser`가 false이고 `isProfileCompleted=true`면 기존 이메일 로그인 완료 경로를 그대로 사용한다.
- 기존 이메일 계정에 Apple이 자동 연결된 경우도 동일하다.
- `fetchLoginStatusSilently()`는 서버 세션과 앱 상태를 한 번 더 동기화하기 위해 유지한다.

### 신규 또는 프로필 미완성 회원

```text
loginWithApple 성공
  -> Checkmo refresh token은 SecureStore에 저장된 상태
  -> isProfileCompleted=false
  -> enterProfileCompletionFlow()
  -> 기존 profileBasic/profileExtra 단계
  -> /members/additional-info 저장
  -> completeAuthFlow()
```

- 이메일 인증과 비밀번호 설정 단계는 거치지 않는다.
- Apple 인증 전에 Checkmo 약관 동의가 필요하다면 기존 약관 화면을 Apple 전용 진입 모드로 재사용하되, 계정 생성 API를 다시 호출하지 않는다.
- 구현 기준은 백엔드가 Apple 회원과 JWT를 먼저 만든 뒤 프로필 추가정보를 받는 현재 소셜 가입 방식이다.
- 프로필 화면을 닫아도 저장된 Checkmo session은 유지되며, 앱 재시작 시 `AuthGateContext`가 `profileIncomplete`를 감지해 다시 프로필 완성 화면을 연다.
- 응답 boolean과 후속 login-status가 불일치하면 login-status와 기존 `AUTH_403` 처리를 최종 기준으로 삼고 오류를 모니터링한다.

## 10. 로그아웃과 회원탈퇴

### 일반 로그아웃

- 기존 `logoutSession()`으로 Checkmo refresh token과 쿠키를 폐기한다.
- `AppleAuthentication.signOutAsync()`를 호출하지 않는다.
- Apple credential이나 user ID를 RN에 별도로 보관하지 않으므로 추가 로컬 삭제는 없다.

### 회원탈퇴

- RN은 기존 `/api/v1/members/withdrawal`만 호출한다.
- Apple refresh token 복호화와 `/auth/revoke` 호출은 백엔드 책임이다.
- Apple 해지 서버 장애가 있어도 백엔드가 Checkmo 탈퇴를 완료하므로 RN은 기존 탈퇴 성공 응답을 따른다.
- 탈퇴 성공 후 기존 SecureStore Checkmo refresh token을 반드시 삭제한다.

## 11. 변경 대상

| 대상 | 변경 내용 |
| --- | --- |
| `package.json`, lockfile | Expo 호환 Apple Authentication/Crypto 의존성 추가 |
| `app.json` | `usesAppleSignIn`, config plugin 추가 |
| `ios/app/app.entitlements` 및 생성 iOS 설정 | Sign in with Apple capability 확인 |
| `src/services/api/authApi.ts` | Apple API 타입, 호출, Checkmo refresh token 저장 |
| `src/screens/AuthFlowScreen.tsx` | availability, nonce, 버튼, submitting, 오류와 화면 분기 |
| auth 관련 테스트 또는 순수 helper | nonce 인코딩과 응답 분기 테스트 |

nonce 생성·인코딩 로직이 화면을 복잡하게 만들면 작은 auth helper로 분리한다. Apple 로그인 한 곳에서만 쓰는 상태를 별도 전역 store로 만들지 않는다.

## 12. 자동 검증

```bash
npm run typecheck
npm run lint
npx expo-doctor
npx expo run:ios
```

검증 항목:

- Apple 모듈 타입과 iOS conditional rendering
- API 요청 필드 세 개가 모두 전달되는지
- refresh token 누락 시 저장·화면 전환이 일어나지 않는지
- `ERR_REQUEST_CANCELED`가 무음 처리되는지
- 각 `APPLE_AUTH_*` 코드의 사용자 문구
- `isProfileCompleted` true/false 화면 분기
- Android typecheck/build에서 Apple 코드 때문에 오류가 나지 않는지
- `app.json`과 native entitlement가 일치하는지

가능하면 `handleAppleLogin()`의 순수 분기 부분을 helper로 분리해 다음을 단위 테스트한다.

- 완료 회원 -> complete
- 신규/미완성 회원 -> profile completion
- token/code 누락 -> API 미호출
- 중복 탭 -> Apple UI 1회 호출

## 13. iOS 실기기 테스트

Apple 로그인은 시뮬레이터만으로 완료 판정하지 않는다.

| 시나리오 | 기대 결과 |
| --- | --- |
| 실제 이메일 공개 최초 로그인 | 신규 회원 생성 후 프로필 추가정보 진입 |
| 이메일 가리기 최초 로그인 | relay 이메일로 신규 회원 생성 후 프로필 추가정보 진입 |
| 동일 Apple 계정 재로그인 | 동일 Checkmo 회원으로 로그인, 회원 중복 없음 |
| 기존 Checkmo 이메일과 같은 Apple 로그인 | 기존 회원 자동 연결, 기존 데이터 유지 |
| Apple 모달 취소 | 토스트 없이 로그인 화면 유지 |
| 앱 삭제 후 재설치 | Apple `sub`로 기존 회원 재로그인 |
| Checkmo access token 만료 | SecureStore refresh token으로 기존 silent refresh 동작 |
| Apple 설정에서 앱 권한 철회 | 다음 로그인 실패가 정상 안내되고 Checkmo 계정이 오연결되지 않음 |
| 프로필 미완성 상태에서 앱 재시작 | AuthGate가 추가정보 화면을 다시 표시 |
| 회원탈퇴 후 동일 Apple 계정 재가입 | 백엔드 정책에 따라 복구 또는 신규 흐름이 일관되게 동작 |
| Android 앱 실행 | Apple 버튼과 빈 공간이 노출되지 않고 기존 로그인 정상 |

TestFlight 또는 production 서명 빌드에서도 최소 한 번 확인한다. Development Team이나 Bundle ID가 다르면 Apple `sub`와 `aud`가 달라질 수 있으므로 운영 서명 검증이 필요하다.

## 14. 배포 체크리스트

1. 백엔드 Apple API와 DB migration을 먼저 배포한다.
2. 개발 환경에서 EAS development build로 신규/기존 계정 E2E를 통과한다.
3. Apple Developer capability와 production provisioning profile을 확인한다.
4. RN production build를 생성한다.
5. TestFlight에서 실제 이메일/이메일 가리기/재로그인을 확인한다.
6. App Store Connect의 로그인 방식과 개인정보 관련 응답을 최신화한다.
7. 백엔드 `APPLE_AUTH_*` 오류율과 RN crash/Sentry를 배포 직후 모니터링한다.

문제 발생 시 서버 API를 바로 제거하지 않고 RN feature release에서 Apple 버튼을 숨겨 신규 유입을 중단한다. 기존 Apple 로그인 사용자는 Checkmo refresh token으로 세션을 유지할 수 있어야 하며 회원탈퇴 revoke 경로도 유지한다.

## 15. 완료 조건

- [ ] iOS에서만 Apple 공식 버튼이 표시됨
- [ ] 매 요청마다 안전한 raw nonce와 SHA-256 nonce를 사용함
- [ ] token/code/raw nonce가 동일한 API 계약으로 백엔드에 전달됨
- [ ] Checkmo refresh token만 SecureStore에 저장됨
- [ ] 신규 Apple 회원이 기존 프로필 추가정보 흐름을 완료함
- [ ] 기존 회원과 자동 연결된 회원이 기존 데이터를 유지함
- [ ] 취소·credential 누락·서버 오류가 정의된 UX로 처리됨
- [ ] 일반 로그아웃과 회원탈퇴 책임이 구분됨
- [ ] typecheck, lint, Expo Doctor, iOS 빌드와 실기기 시나리오가 통과함
- [ ] credential과 nonce가 로그 또는 저장소에 노출되지 않음

## 16. 공식 참고 자료

- [Expo - AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Expo - Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/)
- [Apple - Authenticating users with Sign in with Apple](https://developer.apple.com/documentation/authenticationservices/authenticating-a-user-through-a-web-service)
- [Apple - Verifying a user](https://developer.apple.com/documentation/signinwithapple/verifying-a-user)
- [Apple - Sign in with Apple button](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [Apple TN3194 - Account deletion and token revocation](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple)
