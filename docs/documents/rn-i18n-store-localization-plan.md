# RN 다국어(한국어/영어) 및 스토어 현지화 계획

작성일: 2026-07-01

## 1. 목적

`checkmo_rn`은 Expo / React Native 기반의 책모 모바일 앱이다. FE 영어 지원 계획과 맞춰 RN도 한국어/영어를 지원하려면 앱 내부 UI 문자열뿐 아니라 네이티브 앱 이름, 권한 문구, App Store Connect / Google Play Console 메타데이터, 스크린샷, 앱 심사 QA까지 같이 관리해야 한다.

이 문서는 현재 RN 구조를 기준으로 영어 지원과 iOS App Store / Google Play 제출 전략을 정리한다.

## 2. 공식 근거

- Expo Localization: `expo-localization`은 네이티브 기기의 locale 정보를 제공하고, `react-i18next`, `i18n-js`, `react-intl` 등과 함께 사용할 수 있다고 설명한다. Android는 앱 실행 중에도 시스템 locale 변경을 반영하려면 foreground 복귀 시 다시 읽어야 한다.
  https://docs.expo.dev/versions/latest/sdk/localization/
- Apple App Store Connect Help: App Store Connect의 app metadata localization은 Xcode binary localization과 다르며, localized metadata / keyword / screenshots / app name / privacy policy URL을 언어별로 관리한다.
  https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/
- Android Developers Localize your app: Android는 기본 `res/values/strings.xml`과 locale별 `res/values-*/strings.xml` 리소스를 사용하며, default resource가 빠지면 unsupported locale에서 앱이 실행되지 않을 수 있다. 하드코딩 문자열을 resource로 빼는 것을 권장한다.
  https://developer.android.com/guide/topics/resources/localization
- Google Play Console Help: Play Console은 store listing, app strings, in-app products 번역을 별도로 지원하고, store listing에는 localized graphic assets도 추가할 수 있다. 영어(미국), 한국어 등 언어별 listing이 가능하다.
  https://support.google.com/googleplay/android-developer/answer/9844778

## 3. 현재 RN 구조 진단

### 3.1 기술 스택

- Expo `~54.0.35`
- React Native `0.81.5`
- React `19.1.0`
- React Navigation 7
- TypeScript
- Native iOS / Android directory가 존재한다.
- EAS Updates 사용: `runtimeVersion` 현재 `1.1.1`
- 현재 i18n 전용 dependency는 없다.

### 3.2 네이티브/스토어 관련 현재값

- `app.json`
  - `expo.name`: `책모`
  - `ios.bundleIdentifier`: `kr.co.checkmo.app`
  - `android.package`: `kr.co.checkmo.app`
  - `expo.plugins[expo-image-picker].photosPermission`: 한국어 고정
- iOS
  - `ios/app/Info.plist`
    - `CFBundleDisplayName`: `책모`
    - `NSCameraUsageDescription`: 한국어 고정
    - `NSPhotoLibraryUsageDescription`: 한국어 고정
- Android
  - `android/app/src/main/AndroidManifest.xml`
    - `android:label="@string/app_name"`
  - `android/app/src/main/res/values/strings.xml`
    - `app_name`: `책모`
  - 현재 `values-en` 같은 locale-specific resource는 없다.

### 3.3 문자열 분포

조사 기준:

- 한국어 포함 TS/TSX 파일: 70개
- 한국어 포함 라인: 약 1,769라인

문자열 밀집 파일 상위:

- `src/screens/MyPageScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/meeting/GroupManagementOverlay.tsx`
- `src/constants/termsDocuments.ts`
- `src/screens/meeting/useBookshelfState.ts`
- `src/screens/meeting/helpers.ts`
- `src/screens/meeting/useNoticeState.ts`
- `src/screens/UserProfileScreen.tsx`
- `src/components/common/AppHeader.tsx`

해석:

- RN은 FE보다 파일 수는 적지만 화면 단위 파일이 커서 한 번에 전체 치환하면 위험하다.
- 인증/회원가입, 마이페이지, 모임, 책이야기, 공지/책장 관리 쪽에 validation/toast/alert 문자열이 몰려 있다.
- `category`, `participant`, `report reason`, `notice type` 같은 domain label은 API enum과 UI label을 분리해야 한다.

## 4. 핵심 결론

앱 내부 i18n 전략은 iOS와 Android가 같다.

- `expo-localization`으로 기기 locale을 읽는다.
- `i18next + react-i18next`를 앱 내부 번역 레이어로 둔다.
- `src/i18n/messages/ko.ts`, `src/i18n/messages/en.ts` 같은 catalog를 만든다.
- UI, toast, alert, accessibilityLabel, placeholder, empty/loading/error 상태를 `t()`로 치환한다.
- API enum은 code-first로 유지하고 label만 번역한다.
- 날짜/시간/상대시간은 `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` 또는 i18next formatter로 locale별 표시한다.

플랫폼별로 달라지는 부분은 앱 바이너리 메타데이터와 스토어 제출이다.

- iOS: `InfoPlist.strings`, App Store Connect localization, iPhone/iPad localized screenshot 세트
- Android / Play Store: `res/values-*/strings.xml`, Play Console store listing localization, localized graphic assets, Play app strings preview 여부

## 5. 추천 라이브러리

### 5.1 권장안

```bash
npx expo install expo-localization
npm install i18next react-i18next
```

권장 이유:

- Expo 공식 문서에서 `expo-localization`과 함께 사용할 수 있는 localization library로 `react-i18next` 계열을 명시한다.
- 현재 앱은 React Navigation / hooks 중심 구조라 `useTranslation()`을 붙이기 쉽다.
- plural, interpolation, namespace, language fallback이 필요한 화면이 많다.
- 장기적으로 FE의 `messages` namespace와 용어를 맞추기 쉽다.

### 5.2 대안

- 단순한 key-value 번역만 원하면 `i18n-js + expo-localization`도 가능하다.
- 하지만 현재 앱은 validation/toast/terms/date/enum label이 넓게 퍼져 있어 `i18next + react-i18next`가 더 유지보수에 유리하다.

## 6. 권장 파일 구조

```text
src/i18n/
  index.ts
  locale.ts
  keys.ts
  formats.ts
  labels.ts
  messages/
    ko.ts
    en.ts
```

역할:

- `index.ts`: i18next 초기화, fallback language, resources 등록
- `locale.ts`: Expo locale 감지, 지원 locale 정규화, foreground 복귀 시 Android locale 재감지
- `keys.ts`: typed key helper 또는 namespace type
- `formats.ts`: 날짜/시간/상대시간/숫자 표시 helper
- `labels.ts`: API enum -> translated label helper
- `messages/*.ts`: namespace별 번역 catalog

초기 namespace:

```text
Common
Navigation
Auth
Signup
Home
Meeting
Bookshelf
Notice
Story
News
MyPage
Profile
Settings
Report
Notification
Terms
Validation
Toast
Errors
Enums
UpdateGate
Onboarding
Accessibility
Store
```

## 7. 단계별 구현 계획

### Phase 0. Baseline 정리

목표:

- i18n 작업 전 현재 상태를 고정한다.

작업:

- `npm run typecheck`
- `npm run lint`
- `npm run check:typography`
- `npm run check:spacing`
- `rg "[가-힣]" src app.json ios android` 결과 저장
- 현재 iOS/Android 빌드 버전 정책 확인
- `runtimeVersion` 변경 필요 여부 판단

주의:

- 앱 내부 JS 번역만 바꾸면 OTA로 배포 가능할 수 있다.
- `app.json`, `Info.plist`, Android resource, plugin, 네이티브 권한 문구를 바꾸면 새 native build가 필요하다.

### Phase 1. i18n 기반 레이어 추가

작업:

1. `expo-localization`, `i18next`, `react-i18next` 설치
2. `src/i18n/index.ts`에서 resource와 fallback 설정
3. `src/i18n/locale.ts`에서 `ko`, `en`만 지원하도록 normalize
4. 앱 루트에서 i18n 초기화 완료 후 화면 렌더
5. Android는 foreground 복귀 시 locale 변경 반영 여부 결정
6. 앱 내부 language override를 둘지 결정

권장 정책:

- 기본은 시스템 언어 자동 감지
- 미지원 언어는 `ko` fallback
- 설정 화면에 언어 선택을 넣는 것은 2차 기능으로 둔다
- 영어 스토어 사용자가 앱을 켰을 때 기기 언어가 영어면 자동 영어 UI가 보이게 한다

### Phase 2. 공통 컴포넌트/네비게이션부터 치환

대상:

- `src/components/common/AppHeader.tsx`
- `src/navigation/BottomTabs.tsx`
- `src/components/common/AppUpdateGateModal.tsx`
- `src/components/common/DateTimeField.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `src/components/common/ToastHost.tsx`
- `src/components/common/BookFlipLoadingScreen.tsx`
- `src/hooks/useUnsavedChangesGuard.ts`
- `src/utils/toast.ts`
- `src/utils/resolveApiError.ts`
- `src/utils/notification.ts`

작업:

- 탭 이름, 헤더 타이틀, accessibilityLabel, placeholder, modal button label을 번역한다.
- 공통 loading label은 `Common.loading`, `Common.saving`, `Common.retry` 등으로 통합한다.
- 앱 업데이트 게이트 문구는 `UpdateGate` namespace로 분리한다.
- notification 문구는 type별 formatter를 `t("Notification.types.X", {actor})` 형태로 변경한다.

### Phase 3. Auth / Signup / Terms

대상:

- `src/screens/AuthFlowScreen.tsx`
- `src/hooks/useEmailVerificationFlow.ts`
- `src/contexts/AuthGateContext.tsx`
- `src/constants/termsDocuments.ts`
- `src/constants/validation.ts`
- `src/services/auth/appleAuth.ts`
- `src/services/auth/socialAuth.ts`
- `src/services/api/authApi.ts`

작업:

- 로그인, 이메일 인증, 비밀번호, 약관 동의, 프로필 완성, 이메일 찾기/비밀번호 찾기 문구를 번역한다.
- `Alert.alert` title/body/button label을 모두 key로 분리한다.
- 약관 문서는 짧은 UI label과 본문을 분리한다.
- 약관/개인정보처리방침 영어 본문은 법률/운영 검토가 필요하므로 1차 공개 전에 별도 승인 대상으로 둔다.
- BE가 약관을 API로 내려주는 경우 locale query/header 지원 여부를 BE와 협의한다.

### Phase 4. Domain enum label 분리

대상:

- `src/constants/domain/category.ts`
- `src/constants/domain/participant.ts`
- `src/screens/meeting/helpers.ts`
- `src/screens/meeting/types.ts`
- `src/screens/meeting/mappers.ts`
- `src/screens/meeting/ChatMessageReportModal.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `src/screens/mypage/useAccountSettingsState.ts`

원칙:

- API에는 `FICTION_POETRY_DRAMA`, `STUDENT`, `GENERAL`, `VOTE` 같은 code만 보낸다.
- 화면 label은 `t("Enums.category.FICTION_POETRY_DRAMA")`처럼 변환한다.
- `"일반"`, `"모임"`, `"투표"` 같은 notice category도 union label이 아니라 code union으로 바꾼다.
- `어린이/청소년`처럼 색상 매핑에 label이 들어간 부분은 code 기준으로 바꾼다.

### Phase 5. 주요 화면군 번역

우선순위:

1. `HomeScreen`
2. `NewsScreen`
3. `StoryScreen`
4. `UserProfileScreen`
5. `MyPageScreen`
6. `MeetingScreen`
7. `meeting/*` 하위 화면
8. `OnboardingScreen`

이유:

- Home/News/Story/Profile은 사용자-facing chrome이 많고 영어 사용자가 가장 먼저 접한다.
- MyPage/Meeting은 문자열이 가장 많으므로 공통/enum/validation 분리 후 진행해야 안전하다.
- Onboarding은 현재 노출 비활성 정책이 있으므로 마지막에 번역해도 된다.

작업 기준:

- 사용자 생성 콘텐츠, 책 제목, 모임명, 닉네임, API 본문은 번역하지 않는다.
- 화면 chrome, 버튼, empty/loading/error, toast, alert, 입력 placeholder, accessibilityLabel만 번역한다.
- 번역 후 긴 영어 문구가 버튼/카드/바텀시트에서 잘리는지 확인한다.

### Phase 6. 날짜/시간/상대시간 현지화

대상:

- `src/utils/date.ts`
- `src/screens/meeting/formatters.ts`
- `src/components/common/DateTimeField.tsx`
- 각 화면의 `format*` helper

현재 예:

- `방금 전`
- `${diffHours}시간전`
- `${diffDays}일전`
- `${date.getFullYear()}년 ${date.getMonth() + 1}월`
- `YYYY.MM.DD`

권장:

- API 전송 포맷은 기존 KST/LocalDateTime 계약을 유지한다.
- 표시 포맷만 locale별 helper로 분리한다.
- 한국어: `2026.07.01`, `3시간전`
- 영어: `Jul 1, 2026`, `3 hours ago`
- DateTimePicker placeholder도 locale key로 분리한다.

### Phase 7. Error / API message 정책

현재:

- `src/services/api/http.ts`, `resolveApiError.ts`, 각 service/hook에 한국어 fallback이 있다.
- BE가 내려주는 `message`가 한국어일 가능성이 높다.

권장:

- FE/RN 모두 error code 우선 번역을 사용한다.
- known code: `Errors.AUTH_404`, `Errors.MEMBER_416` 등
- unknown code: locale별 generic fallback
- 영어 locale에서 BE 한국어 message를 그대로 보여줄지 여부는 UX 정책으로 결정한다.
- 장기적으로 `Accept-Language` header를 API 요청에 넣고 BE message locale화를 협의한다.

## 8. iOS App Store 전략

iOS는 세 층을 분리한다.

### 8.1 앱 내부 UI

- JS catalog는 Android와 동일하게 사용한다.
- 기기 언어가 영어면 앱 내부 UI가 영어로 뜨도록 한다.
- iOS는 Expo 문서 기준으로 앱 실행 중 locale 값이 유지되므로, 앱 실행 중 언어 변경을 즉시 반영하려면 재시작 안내 또는 app state refresh 정책이 필요하다.

### 8.2 iOS binary localization

대상:

- `ios/app/Info.plist`
- `ios/app/ko.lproj/InfoPlist.strings`
- `ios/app/en.lproj/InfoPlist.strings`
- 필요 시 `ios/app/Base.lproj`

현황:

- `CFBundleDisplayName`이 `책모`로 고정되어 있다.
- `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`이 한국어로 고정되어 있다.

권장:

- `Info.plist`의 display name / permission usage description을 localized string으로 관리한다.
- 한국어:
  - `CFBundleDisplayName = "책모";`
  - `NSPhotoLibraryUsageDescription = "프로필 이미지를 등록하기 위해 사진 접근 권한이 필요합니다.";`
  - `NSCameraUsageDescription = "프로필 이미지를 촬영하기 위해 카메라 접근 권한이 필요합니다.";`
- 영어:
  - `CFBundleDisplayName = "Checkmo";` 또는 브랜드 정책상 `"책모"` 유지
  - `NSPhotoLibraryUsageDescription = "Allow photo access to add a profile image.";`
  - `NSCameraUsageDescription = "Allow camera access to take a profile image.";`

주의:

- `app.json` plugin permission 문구만 바꿔도 prebuild에 반영될 수 있지만, 이 repo는 native `ios/`가 존재하므로 실제 심사 빌드는 native 파일이 source of truth가 되는 경우가 많다.
- 네이티브 권한 문구 변경은 새 iOS binary build가 필요하다. OTA만으로는 반영되지 않는다.

### 8.3 App Store Connect metadata

언어:

- 기본: Korean
- 추가: English (U.S.) 권장

관리 항목:

- App name
- Subtitle
- Description
- Keywords
- Promotional text
- What's New
- Support URL
- Marketing URL
- Privacy Policy URL
- iPhone screenshot
- iPad screenshot
- App Preview가 있으면 preview도 언어별 검토

권장 전략:

- App Store Connect에서 한국어 primary language는 유지한다.
- English (U.S.) localization을 추가한다.
- 스크린샷은 영어 UI가 실제로 보이는 iPhone / iPad 빌드로 다시 캡처한다.
- Apple 문서상 metadata localization과 binary localization은 별개이므로 둘 다 맞춰야 한다.
- 현재 iPad 지원이 켜져 있으므로 iPad 스크린샷도 영어 버전이 필요할 수 있다.

## 9. Google Play / Play Store 전략

Android도 세 층을 분리한다.

### 9.1 앱 내부 UI

- JS catalog는 iOS와 동일하게 사용한다.
- Android는 시스템 locale 변경이 앱 실행 중에도 바뀔 수 있으므로 foreground 복귀 시 `expo-localization` locale을 다시 읽는 정책을 둔다.
- RTL 언어는 1차 범위가 아니므로 `ko/en`만 지원한다.

### 9.2 Android native resources

대상:

- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-en/strings.xml`
- 필요 시 `android/app/src/main/res/values-ko/strings.xml`

현황:

- `app_name`은 default `values/strings.xml`에만 `책모`로 있다.
- `AndroidManifest.xml`은 `@string/app_name`을 참조한다.

권장:

- default `values/strings.xml`은 한국어 유지:

```xml
<resources>
  <string name="app_name">책모</string>
</resources>
```

- 영어 리소스 추가:

```xml
<resources>
  <string name="app_name">Checkmo</string>
</resources>
```

주의:

- Android Developers 문서 기준으로 default resource는 모든 key를 포함해야 한다.
- app name만 native resource로 관리하고, React Native 화면 문구는 JS catalog에서 관리한다.
- native resource 변경은 새 Android AAB build가 필요하다. OTA만으로는 반영되지 않는다.

### 9.3 Google Play Console store listing

언어:

- Default language는 현재 콘솔 설정 확인 필요
- 권장: Korean default 유지 + English (United States, en-US) translation 추가

관리 항목:

- App name
- Short description
- Full description
- Screenshots
- Feature graphic
- Phone / tablet screenshot
- Privacy policy URL
- Release notes

권장 전략:

- Play Console의 Store listing translation에 `en-US`를 추가한다.
- Google Play는 text translation만 추가하고 graphic assets를 추가하지 않으면 default language graphic이 표시될 수 있으므로, 영어 UI 스크린샷/그래픽을 별도로 준비한다.
- Gemini app strings 자동 번역은 RN JS catalog와 충돌 가능성이 있다. React Native 화면 문자열은 JS bundle에 있으므로 Play의 `strings.xml` 기반 app strings translation에 의존하지 않는 쪽이 안전하다.
- Play Console의 app strings preview는 native Android resource 중심이므로, RN 앱은 실제 영어 AAB 또는 internal testing 설치로 QA한다.

## 10. 스토어별 차이 요약

| 영역 | iOS App Store | Google Play |
| --- | --- | --- |
| 앱 내부 UI | 공통 JS catalog | 공통 JS catalog |
| locale 감지 | `expo-localization`, 실행 중 값 고정 경향 | `expo-localization`, foreground 복귀 시 재감지 필요 |
| 앱 이름 | `InfoPlist.strings` / `CFBundleDisplayName` | `values-en/strings.xml` / `app_name` |
| 권한 문구 | `InfoPlist.strings`의 usage description | Android 권한 runtime 문구는 앱/시스템 정책 영향. 현재 media 권한은 blocked, image-picker permission은 iOS 중심 확인 필요 |
| 스토어 메타데이터 | App Store Connect localization | Play Console store listing translation |
| 스크린샷 | iPhone/iPad 언어별 승인 필요 | phone/tablet graphic assets 언어별 등록 가능 |
| 자동 번역 | App Store metadata는 직접 localization 관리 | Play 자동 번역/기계 번역 가능하지만 직접 번역 권장 |
| 빌드 필요 | native strings 변경 시 필요 | native resources 변경 시 필요 |

공통으로 가져갈 것:

- 앱 내부 i18n catalog
- enum label 분리
- error code mapping
- date/time formatter
- QA 시나리오

분리해서 가져갈 것:

- 앱 이름 / 권한 문구 native resource
- 스토어 메타데이터
- 스크린샷/그래픽 asset
- App Review / Play Review notes

## 11. 검증 기준

### 자동 검증

- `npm run typecheck`
- `npm run lint`
- `npm run check:typography`
- `npm run check:spacing`
- `rg "[가-힣]" src` 후 허용 목록 점검
- Android native resource key 누락 점검
- iOS `InfoPlist.strings` syntax 점검

### iOS QA

- 기기 언어 한국어: 앱 이름, 권한 문구, 앱 내부 UI가 한국어
- 기기 언어 영어: 앱 이름, 권한 문구, 앱 내부 UI가 영어
- 로그인/회원가입/약관/프로필 완성
- 홈/소식/책이야기/모임/마이페이지
- 사진 선택 권한 요청
- Apple/Kakao/Google/Naver 로그인 버튼 문구와 접근성
- 앱 업데이트 게이트 문구
- iPhone + iPad 스크린샷 캡처

### Android / Play QA

- 기기 언어 한국어: 앱 이름, 앱 내부 UI가 한국어
- 기기 언어 영어: 앱 이름, 앱 내부 UI가 영어
- foreground 복귀 후 locale 변경 반영 정책 확인
- 로그인/회원가입/약관/프로필 완성
- 홈/소식/책이야기/모임/마이페이지
- 사진 선택 흐름
- 소셜 로그인 딥링크
- 앱 업데이트 게이트 문구
- internal testing AAB 설치 후 영어 UI 스크린샷 캡처

## 12. 1차 완료 정의

1차 완료 조건:

- 한국어/영어 app internal catalog가 존재한다.
- 앱 시작 시 system locale 기반으로 `ko`/`en`이 결정된다.
- Header, BottomTabs, Login, Signup, Home, News, Story, MyPage, Meeting의 핵심 버튼/상태/토스트/placeholder가 번역된다.
- domain enum label이 한국어 label type에 의존하지 않는다.
- 날짜/상대시간이 locale별로 표시된다.
- iOS `InfoPlist.strings`와 Android `values-en/strings.xml`이 추가된다.
- App Store Connect와 Play Console에 영어 listing을 추가할 준비 자료가 정리된다.
- `npm run typecheck`, `npm run lint`, typography/spacing 체크가 통과한다.
- 영어 iOS/Android 실기기 또는 시뮬레이터 QA에서 주요 플로우가 깨지지 않는다.

## 13. 권장 진행 순서

1. `expo-localization`, `i18next`, `react-i18next` 설치
2. `src/i18n` scaffold 추가
3. 공통 컴포넌트와 navigation label 번역
4. Auth/Signup/Terms 번역
5. enum label code-first 리팩터링
6. 날짜/시간 formatter locale화
7. Home/News/Story/Profile/MyPage 번역
8. Meeting/Notice/Bookshelf/Management 번역
9. iOS `InfoPlist.strings` 추가
10. Android `values-en/strings.xml` 추가
11. App Store Connect 영어 metadata/screenshot 준비
12. Play Console 영어 store listing/graphic assets 준비
13. iOS/Android 새 binary build
14. TestFlight / Play internal testing QA
15. 심사 제출
