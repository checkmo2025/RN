# 온보딩(첫 사용자 가이드) 구현 계획

> 작성일: 2026-06-21
> 상태: ⬜ 계획 확정(구현 대기)
> 목적: 처음 진입한 사용자가 책모의 5개 핵심 화면을 스와이프로 빠르게 훑도록 돕는 온보딩 캐러셀 추가
> 기준 콘텐츠: `docs/pm/functional-spec.md`

## 0. 확정 결정 (2026-06-21)

| 항목 | 결정 | 근거 |
|---|---|---|
| **화면 수** | **5장** (헤더바는 홈 슬라이드에 흡수) | 업계 표준 상한 5장에 부합. 헤더는 목적지가 아닌 공통 바라 별도 장 불필요 |
| **비주얼** | **하이브리드** — 실제 화면 크롭 스크린샷을 폰 프레임에 넣고 하이라이트 콜아웃 + 캡션 | 사실성 + 강조. 단, 스크린샷 재캡처 유지비 일부 감수 |
| **노출 시점** | **첫 콜드런치 즉시** (로그인 무관, GUEST 포함) | 둘러보기 사용자도 첫 진입에 안내 필요 |
| **건너뛰기** | 항상 제공(우상단) | 표준 권장 |

### 업계 표준 요약
- 권장 3~5장(3장 안전, 5장 상한), 60초 이내. 5장 초과 시 건너뛰기 필수.
- 첫 장 이후 이탈 급격 → **1번 슬라이드가 가장 중요**(가치 제안을 1장에).
- 출처: Userpilot, VWO(2026), Material Design Onboarding, Smashing Magazine, DesignerUp(200개 플로우 연구).

## 1. 슬라이드 구성 (5장)

| # | 화면 | 헤드라인(초안) | 본문(초안) | 콜아웃 강조 |
|---|---|---|---|---|
| 1 | **홈 + 헤더** | "책모에 오신 걸 환영해요" | 소식·추천 독자·책이야기를 한 화면에서. 상단 🔍 검색으로 책/사람 찾고 🔔에서 알림 확인 | 상단 헤더(검색/알림 아이콘) |
| 2 | **모임** | "마음 맞는 독서모임 찾기" | 모임을 탐색·가입하고 공지·책장·발제·정기모임까지 함께 | 모임 카드 / 가입 버튼 |
| 3 | **책이야기** | "내 책 감상을 기록하고 나누기" | 책을 골라 글을 쓰고 좋아요·댓글·구독으로 소통 | 작성 FAB / 좋아요·댓글 |
| 4 | **소식** | "책모의 새 소식과 추천 도서" | 공식 소식과 추천 책을 한곳에서 확인 | 소식 캐러셀 |
| 5 | **마이페이지** | "내 활동을 한눈에" | 프로필·서재·내 모임·알림·설정 관리 | 하단 "시작하기" CTA |

- 1장은 순수 환영 스플래시로 낭비하지 않고, "책모 = 독서모임 커뮤니티" 가치 제안을 헤드라인에 포함.
- 카피는 토스트/피드백 문체 규칙(`~합니다`/`~해요` 일관) 따름, 확정 전 PM 검수.

## 2. 비주얼 제작 (하이브리드)

- 탭별 실제 화면 1장씩 캡처(데이터가 채워진 상태로) → 핵심 영역만 크롭.
- 공용 폰 프레임(브랜드 컬러 보더) 안에 배치 + 강조 지점에 콜아웃(원형 하이라이트 또는 핀 + 짧은 라벨).
- 에셋: `assets/onboarding/onboarding-{home,meeting,story,news,mypage}.png`.
- **유지보수 주의**: UI 대개편 시 스크린샷 재캡처 필요 → 저장 키 버전(`v1`)으로 재노출 관리.

## 3. 기술 구현

### 파일
- `src/screens/onboarding/OnboardingScreen.tsx` — 가로 페이징 캐러셀(`FlatList pagingEnabled`, 신규 의존성 0)
  - 페이지 점(dots), 우상단 **건너뛰기**, 하단 **다음 / 시작하기**
- `src/constants/onboardingSlides.ts` — `ONBOARDING_SLIDES` 배열(key/image/title/body/callout). 카피·이미지 중앙화, i18n 확장 대비
- `src/services/onboardingStore.ts` — `expo-secure-store` 기반(기존 `authTokenStore.ts` 패턴 재사용)
  - 키: `checkmo.onboarding.v1.seen` (버전 키)
  - `getOnboardingSeen()`, `setOnboardingSeen()`, (재노출용) `resetOnboardingSeen()`

### 노출 게이트 (`App.tsx`)
- `AppRoutes`에 absolute overlay 추가(기존 `authPageOverlay` 패턴, `layers` zIndex 토큰).
- 부팅 완료(`isReady`) 후 `onboardingSeen === false`면 표시.
- 건너뛰기/시작하기 → `setOnboardingSeen()` 후 닫기.
- 로그인 여부와 무관(첫 콜드런치). AuthGate 상태에 `onboardingVisible` 추가하거나 로컬 state로 관리.

### 다시 보기
- 마이페이지 설정에 "온보딩 다시 보기" 추가 → `resetOnboardingSeen()` 또는 직접 오버레이 재실행.

### 토큰/품질
- `motion`(전환 duration)·`colors`·`spacing`·`typography`·`radius`·`buttonSize`·`layers` 토큰만 사용 → `check:spacing`/`check:typography` 통과.
- 페이지 전환 시 `triggerSelectionHaptic`(선택).
- 접근성: dots/건너뛰기/다음/시작에 `accessibilityRole="button"` + `accessibilityLabel`. 스와이프+버튼 양방향.

## 4. 작업 체크리스트

- [ ] 탭별 스크린샷 5장 캡처 + 크롭 + 폰 프레임/콜아웃 합성 → `assets/onboarding/`
- [ ] `onboardingStore.ts` (SecureStore, 버전 키)
- [ ] `onboardingSlides.ts` (카피/이미지/콜아웃 데이터)
- [ ] `OnboardingScreen.tsx` (페이징 캐러셀 + dots + 건너뛰기 + 다음/시작)
- [ ] `App.tsx` 노출 게이트 연결(isReady 이후 1회)
- [ ] 마이페이지 설정 "온보딩 다시 보기"
- [ ] iOS/Android 실기기 확인(스와이프/건너뛰기/재노출/safe-area)

## 5. 완료 기준(DoD)

- 신규 설치 첫 실행 시 5장 캐러셀이 1회 노출되고, 건너뛰기/끝까지 보기 후 재실행해도 다시 안 뜸.
- 마이페이지에서 "다시 보기" 시 재노출.
- GUEST(비로그인)도 노출, 온보딩 종료 후 정상적으로 앱(홈) 진입.
- `npm run check`(typography/spacing/typecheck) 통과.
