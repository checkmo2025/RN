# 약관 동의 매핑 React Native 구현 계획

> 작성 기준일: 2026-06-21 KST
> 기준 코드: 현재 RN workspace
> 상태: 구현 대기
> BE 계약 원본: `docs/documents/terms-agreement-backend-plan.md`

## 1. 목적과 범위

RN 회원가입의 하드코딩 약관을 BE 활성 약관과 버전 고정 WebView 문서로 교체하고, 이메일·향후 소셜 가입, 기존 회원 재동의, 선택 약관 철회 상태를 서버에 저장한다.

- 이메일 신규 가입은 signup payload에 활성 약관 전체 상태를 포함한다.
- Apple/Kakao/Naver/Google 신규 가입은 provider 인증 후 약관 저장, 프로필 입력 순서를 사용한다.
- 기존 회원은 앱 시작 또는 로그인 시 필수 재동의를 우선 처리한다.
- 약관 본문은 앱 bundle에 보관하지 않고 `termUrl`을 WebView로 조회한다.
- 약관 API 실패 시 정적 fallback으로 가입을 진행하지 않는다.

## 2. 현재 코드 조사 결과

- `src/constants/termsDocuments.ts`에 약관 제목과 본문 네 개가 하드코딩되어 있다.
- `AuthFlowScreen`은 `agreeService`, `agreeCheckmo`, `agreeThirdParty`, `agreeMarketing` boolean 네 개를 따로 관리한다.
- 약관 선택은 `signUpByEmail()` payload에 포함되지 않는다.
- `signUpByEmail()`은 이메일과 비밀번호만 `POST /auth/signup`으로 보낸다.
- `AuthGateContext`는 `loggedOut`, `profileIncomplete`, `loggedIn`만 구분하고 약관 재동의 상태가 없다.
- 마이페이지 이용약관 화면도 앱 bundle의 전체 본문을 직접 표시한다.
- `react-native-webview`는 설치되어 있지만 현재 source에서는 사용하지 않는다.

## 3. 타입과 API 함수

`src/services/api/termsApi.ts`를 추가해 auth API와 약관 책임을 분리한다.

```ts
export type TermsType =
  | 'SERVICE_TERMS'
  | 'PRIVACY_COLLECTION'
  | 'THIRD_PARTY_PROVISION'
  | 'MARKETING';

export type ActiveTerm = {
  termsId: number;
  termsType: TermsType;
  title: string;
  termUrl: string;
  version: number;
  isRequired: boolean;
};

export type MemberTerm = ActiveTerm & {
  isAgreed: boolean;
};

export type TermAgreement = {
  termsId: number;
  isAgreed: boolean;
};

export type MemberTermsStatus = {
  requiresRequiredAgreement: boolean;
  terms: MemberTerm[];
};
```

함수:

```ts
fetchActiveTerms(): Promise<ActiveTerm[]>
fetchMyTermsStatus(): Promise<MemberTermsStatus>
saveMyTermsAgreements(agreements: TermAgreement[]): Promise<void>
```

`signUpByEmail()`은 agreement를 필수 인자로 받는다.

```ts
signUpByEmail(
  email: string,
  password: string,
  agreements: TermAgreement[],
  options?: { suppressErrorToast?: boolean },
): Promise<void>
```

## 4. 회원가입 약관 상태

네 개 boolean을 다음 상태로 교체한다.

```ts
const [terms, setTerms] = useState<ActiveTerm[]>([]);
const [agreements, setAgreements] = useState<Record<number, boolean>>({});
const [termsLoading, setTermsLoading] = useState(false);
const [termsLoadError, setTermsLoadError] = useState<string | null>(null);
```

terms 단계 진입 동작:

1. `fetchActiveTerms()`를 호출한다.
2. 성공하면 응답 순서를 유지하고 각 ID를 false로 초기화한다.
3. 같은 가입 세션에서 재진입하면 동일 ID의 기존 선택을 유지한다.
4. 서버 활성 ID가 바뀌면 제거된 ID는 버리고 새 ID는 false로 추가한다.
5. 실패하면 로딩을 종료하고 재시도 UI를 표시한다.
6. 성공한 활성 목록이 없으면 가입 진행을 차단한다.

파생 상태:

```ts
const requiredTermsAgreed = terms
  .filter((term) => term.isRequired)
  .every((term) => agreements[term.termsId] === true);

const allTermsAgreed = terms.every(
  (term) => agreements[term.termsId] === true,
);
```

`termsDocuments.ts`와 `TermsAgreementKey`는 모든 사용처가 API 기반으로 전환된 후 삭제한다.

## 5. WebView 약관 상세

기존 `DialogOverlay` 안의 텍스트 `ScrollView`를 `react-native-webview`로 교체한다.

표시 규칙:

- `https:` URL만 허용한다.
- host는 `www.checkmo.co.kr`만 허용한다.
- path는 `/support/terms/`로 시작해야 한다.
- 허용되지 않은 navigation은 중단하고 외부 이동을 실행하지 않는다.
- 로딩 indicator와 로드 실패 안내·재시도를 제공한다.
- WebView를 닫아도 체크 상태는 바뀌지 않는다.
- 모달의 "동의" 버튼을 눌렀을 때만 해당 ID를 true로 만든다.
- Android hardware back은 WebView history가 있으면 뒤로 이동하고, 없으면 모달을 닫는다.
- 앱 background/foreground 전환 후 현재 문서와 체크 상태를 유지한다.

WebView에서 쿠키, 카메라, 마이크, 파일 접근은 필요하지 않으므로 활성화하지 않는다.

## 6. 이메일 가입 흐름

password 단계에서 계정을 생성할 때 현재 활성 약관 전체를 전송한다.

```ts
const agreementPayload = terms.map((term) => ({
  termsId: term.termsId,
  isAgreed: agreements[term.termsId] === true,
}));
```

- 필수 약관 true를 클라이언트에서 먼저 검증한다.
- 선택하지 않은 선택 약관도 false로 보낸다.
- `signUpByEmail()` 재시도에도 같은 payload를 사용한다.
- `TERMS_409`이면 terms 단계로 이동해 최신 목록을 다시 받고 기존 선택을 초기화한다.
- `AUTH_411`로 미완성 가입을 재개할 때 내 약관 상태를 조회한다. 필수 동의가 부족하면 profile보다 terms를 먼저 표시한다.
- profile submit 직전에도 AuthGate 상태가 `termsRequired`가 아닌지 확인한다. 최종 보안 검증은 BE `additional-info`가 담당한다.

현재 `handlePasswordStepNext()`와 profileExtra의 fallback signup 두 경로 모두 동일 agreement payload를 사용하도록 공통 helper를 둔다.

## 7. 인증 게이트 변경

```ts
type AuthSessionState =
  | 'loggedOut'
  | 'termsRequired'
  | 'profileIncomplete'
  | 'loggedIn';

export type AuthPageMode =
  | 'login'
  | 'termsAgreement'
  | 'profileCompletion';
```

우선순위:

1. 세션 없음 → `loggedOut`
2. 현재 필수 약관 부족 → `termsRequired`
3. 프로필 미완성 → `profileIncomplete`
4. 모두 완료 → `loggedIn`

앱 시작·세션 복원:

- 기존 login-status 또는 profile 조회가 성공하면 내 약관 상태를 추가 조회한다.
- profile 조회가 `AUTH_403`이어도 세션이 존재하므로 내 약관 상태를 조회한다.
- 필수 약관이 부족하면 `termsAgreement` mode로 AuthFlowScreen을 연다.
- 필수 약관이 충족된 뒤 프로필이 미완성이면 같은 화면에서 profileBasic으로 이동한다.
- `TERMS_403`을 세션 만료로 처리하거나 토큰을 삭제하지 않는다.

`closeAuthPage()`는 `termsRequired`와 `profileIncomplete` 상태에서 화면을 닫지 못하게 한다. 사용자가 중단하려면 명시적 로그아웃을 선택하게 한다.

## 8. 기존 회원 재동의

`termsAgreement` mode에서는 `fetchMyTermsStatus()`를 사용한다.

- BE의 현재 `isAgreed`로 체크 상태를 초기화한다.
- 기록 없는 기존 회원은 모두 false로 보인다.
- 필수 약관을 모두 true로 선택해야 제출할 수 있다.
- 선택 약관은 사용자가 직접 true/false를 선택한다.
- 저장 성공 후 상태를 다시 조회한다.
- 프로필 미완성은 profileBasic, 완료 회원은 기존 화면으로 복귀한다.
- 저장 실패 시 auth state를 loggedIn으로 바꾸지 않는다.

강제 활성화 전에도 새 RN은 client gate로 재동의를 유도한다. BE 강제 활성화 후에는 일반 API의 `TERMS_403`도 동일 화면을 연다.

## 9. 향후 소셜 로그인 연결

Apple/Kakao/Naver/Google 앱 로그인 성공 응답은 Checkmo 세션 저장 후 다음 순서로 처리한다.

```text
provider 인증 성공
→ Checkmo refresh token 저장
→ GET /members/me/terms
→ 필수 부족: termsAgreement
→ 필수 충족 + 프로필 미완성: profileCompletion
→ 모두 완료: completeLogin
```

- 신규 소셜 회원은 email/password 단계를 거치지 않는다.
- 약관 POST 성공 전 profile 화면으로 이동하지 않는다.
- Apple 비공개 릴레이 이메일 여부는 약관 처리 분기에 영향을 주지 않는다.
- provider 취소는 동의 상태를 만들지 않는다.
- 같은 소셜 계정으로 재로그인하면 서버의 기존 agreement 상태를 사용한다.

이 연결 지점은 Apple 및 소셜 로그인 계획 문서의 성공 후 화면 분기를 대체한다.

## 10. 마이페이지 약관 관리

현재 `MyPageScreen`의 이용약관 정적 본문을 내 활성 약관 관리 화면으로 바꾼다.

- 화면 진입 시 `fetchMyTermsStatus()`를 호출한다.
- 각 항목에 title, `v{version}`, 필수/선택, 동의 상태를 표시한다.
- 제목을 누르면 회원가입과 동일한 WebView 모달을 연다.
- 필수 약관은 상태만 표시하고 toggle하지 않는다.
- 선택 약관은 switch로 철회·재동의한다.
- toggle 중 재입력을 막고 실패 시 기존 상태로 롤백한다.
- 성공 후 서버 상태를 다시 조회한다.
- 마케팅 철회 성공 toast를 명확히 표시한다.

WebView 모달과 약관 row는 AuthFlowScreen 내부 구현을 복사하지 않고 공용 component로 추출한다.

## 11. 오류 처리

| 오류 | RN 처리 |
| --- | --- |
| 네트워크/GET 실패 | 진행 차단, 재시도 버튼 |
| `TERMS_400` | payload 재생성, 약관 화면 유지 |
| `TERMS_401` | 필수 약관 동의 안내 |
| `TERMS_403` | `termsRequired` 상태로 전환 |
| `TERMS_409` | 최신 약관 재조회, 이전 선택 초기화 |
| WebView 실패 | 모달 내 재시도, 동의 상태 유지 |
| 선택 toggle 실패 | switch 롤백, 오류 toast |

약관 오류는 `ApiError.code`로 분기한다. message 문자열 비교를 기준으로 삼지 않는다.

## 12. 주요 변경 대상

| 영역 | 대상 | 변경 |
| --- | --- | --- |
| API | `src/services/api/termsApi.ts` | 약관 조회·저장 계약 추가 |
| 가입 API | `src/services/api/authApi.ts` | signup agreement payload 추가 |
| 가입 화면 | `src/screens/AuthFlowScreen.tsx` | 동적 약관, terms mode, 오류 처리 |
| 인증 게이트 | `src/contexts/AuthGateContext.tsx` | `termsRequired` 우선 상태 추가 |
| 상세 UI | 공용 Terms WebView component | URL 검증·모달·동의 버튼 |
| 설정 | `src/screens/MyPageScreen.tsx` | 서버 상태·선택 철회 UI |
| 정적 문서 | `src/constants/termsDocuments.ts` | 전환 완료 후 제거 |

## 13. 자동 검증

```bash
npm run typecheck
npm run lint
npm run doctor
npm run check
```

검증 항목:

- API DTO의 boolean과 enum 타입이 정확하다.
- terms 상태가 빈 목록·로딩·오류를 구분한다.
- 기존 typography/spacing 검사에 새 UI 위반이 없다.
- Expo Doctor에서 `react-native-webview` 호환성이 유지된다.

## 14. 실기기 테스트

### iOS와 Android 공통

- 약관 네 개가 BE 순서대로 표시된다.
- 상세 WebView가 각 v1 URL을 연다.
- 필수 약관 미동의 시 진행할 수 없다.
- 선택 약관 미동의 상태로 가입할 수 있다.
- 가입 요청에 true/false 전체 상태가 전달된다.
- 네트워크 실패 후 재시도가 동작한다.
- `TERMS_409`에서 최신 목록으로 교체된다.
- 기존 회원이 앱 시작 시 재동의 화면을 본다.
- 재동의 후 프로필/홈 우선순위가 정확하다.
- 마이페이지에서 선택 동의 철회·재동의가 가능하다.
- WebView 뒤로가기, 닫기, background 복귀가 안정적이다.

### 소셜 로그인 추가 후

- provider 신규 가입이 약관을 거친다.
- provider 취소 시 member_terms가 생성되지 않는다.
- 기존 소셜 회원의 재로그인이 저장된 상태를 복원한다.
- 약관 저장 전 profile API 직접 호출이 BE에서 거부된다.

## 15. 배포와 호환성

1. 웹의 버전 고정 약관 URL이 먼저 배포되어야 한다.
2. BE 약관 API는 enforcement=false로 먼저 배포한다.
3. RN release build에서 staging API와 WebView를 검증한다.
4. App Store/Play Store에 업데이트를 배포한다.
5. 구버전 앱 사용량과 agreement 누락 요청을 관측한다.
6. 지원 가능한 버전이 충분히 전환된 후 BE enforcement를 켠다.

강제 활성화 전 구버전 앱은 기존 가입 payload를 사용할 수 있다. 강제 활성화 후 구버전 가입은 실패하므로 최소 지원 버전 정책 또는 업데이트 안내가 함께 필요하다.

## 16. 완료 조건

- 앱 bundle에 약관 본문과 버전별 ID를 하드코딩하지 않는다.
- 이메일 가입이 활성 약관 전체 상태를 저장한다.
- AuthGate가 약관 재동의를 프로필보다 우선한다.
- 향후 모든 소셜 provider가 동일한 약관 분기를 재사용할 수 있다.
- 마이페이지에서 선택 약관 철회·재동의가 가능하다.
- 허용된 버전 URL만 WebView에서 열린다.
- 자동 검사와 iOS/Android 실기기 시나리오가 통과한다.
