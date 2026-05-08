# TODO

> 마지막 업데이트: 2026-05-08 KST

## 📌 에이전트 프롬프트 블록 (여기는 프롬프트)

> TODO/문서 정리 요청 시, 에이전트가 우선 확인하는 전용 영역입니다.
> 아래 블록에 운영 지침을 자유롭게 작성/수정하세요.

```prompt
TODO 수정 시 아래 규칙만 지킨다.

- 신규/수정 항목은 사용자가 바로 이해하도록 "어디서 / 무엇을 / 왜"와 완료 기준(DoD)을 간결히 적는다.
- 날짜는 `YYYY-MM-DD`로 관리한다. 날짜가 없거나 소급 입력이 애매한 기존 항목은 `-`를 쓴다.
- 상태 순서는 `⬜ 미완료` → `🔄 진행 중` → `✅ 완료`로 유지한다.
- 테스트/검증성 항목은 `🧪 직접 테스트 필요 항목`에 분리한다.
- 완료 항목은 삭제하지 않고 `✅` 상태로 남긴다. 장기 보관은 별도 done 문서 링크로 대체한다.
- 새 `##` 섹션이 필요하면 기존 유사 섹션을 확인한 뒤 만들고, `TODO 섹션 목록`도 함께 갱신한다.
```

## 🗺 TODO 섹션 목록 (위치 안내)

| 순서 | 섹션명 | 위치 | 용도 |
| ------ | ------ | ------ | ------ |
| 1 | `## 📌 에이전트 프롬프트 블록 (여기는 프롬프트)` | 문서 최상단 | TODO 운영 규칙/작성 기준 |
| 2 | `## 🗺 TODO 섹션 목록 (위치 안내)` | 프롬프트 블록 바로 아래 | 섹션 탐색용 인덱스 |
| 3 | `## 🖼 에셋 / 디자인` | 상단 | 이미지/아이콘/디자인 작업 |
| 4 | `## 🧭 UI 통일 10개 항목` | 상단 | UI 일관성 항목 10개 관리 |
| 5 | `## 🔜 구현 예정` | 중단 | 코드/문서 구현 TODO(미완료 중심) |
| 6 | `## 📝 검토 대기 항목` | 중단 | 적용은 되었고 리뷰/확인 대기인 항목 |
| 7 | `## 🧪 직접 테스트 필요 항목` | 중하단 | 실기기 QA/수동 검증 항목 |
| 8 | `## 🐛 issue-fetch 미완료 항목` | 하단 | API/계약 이슈 추적 항목 |
| 9 | `## 상태 범례` | 문서 최하단 | 상태 표기 기준 |

---

## 🖼 에셋 / 디자인

| 상태 | 역할 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **RN** | **소식 기본 이미지 추가** | `assets/images/news-default.png` (800×600) 적용 완료. 목록 썸네일 / 상세 히어로 / 프로모션 캐러셀 세 곳 모두 `NEWS_DEFAULT_IMAGE` 단일 상수로 통일. | - | - |
| ✅ | **RN** | **앱 아이콘 / 스플래시 교체** | `checkmo-app-icon.png` (1024×1024) 앱 아이콘 유지. `checkmo-splash.png` Expo 플레이스홀더 → 책모 로고 이미지로 교체 완료. | - | 2026-05-07 |
| ✅ | **RN** | **책 표지 기본 이미지 추가** | `assets/images/book-default.png` (200×280) 적용 완료. `MyPageScreen`, `UserProfileScreen`, `MeetingScreen`(책장/발제) 세 곳에 `BOOK_DEFAULT_IMAGE` 상수로 통일. | - | - |
| ✅ | **디자인** | **모임 기본 이미지 전용 에셋** | `assets/images/club-default.png` (512×512) 적용 완료. 모임 카드 썸네일(`MeetingListCard`), 모임 상세 프로필, 모임 생성/수정 미리보기에 `CLUB_DEFAULT_IMAGE` 상수로 통일. | - | - |
| ✅ | **RN** | **내비/파비콘 에셋 정리 + 유지 정책 반영** | `assets/navigation/navi-*.svg` 10개 + `assets/write-floating.svg` 삭제(미사용). 웹 파비콘을 `assets/checkmo-favicon.png`(64×64)로 교체하고 기존 `assets/favicon.png` 삭제. `assets/icons/*`는 기본 유지하되, 명시적 정리 대상(미사용 화살표/소셜 로고)은 제거. | 2026-05-07 | 2026-05-07 |
| ✅ | **RN** | **아이콘 경로 중앙화(icon map) + 화살표 정리** | `src/constants/iconMap.ts` 신규 생성. RN 내 SVG 경로 하드코딩을 `iconMap` 단일 소스로 통합(AppHeader/AuthFlow/MyPage/Story/Meeting/BottomTabs/BookStoryCard/UserProfile/DefaultProfileAvatar/BookFlipLoadingScreen). 미사용 화살표 SVG 9개 삭제, RN 화살표는 MaterialIcons 사용으로 유지. | 2026-05-07 | 2026-05-07 |
| ✅ | **RN** | **글씨 크기 통일 확인** | `fontSize`/`lineHeight`/`letterSpacing` 하드코딩 제거 완료(0건). `typography` 토큰 승격(15/16 포함), 재발 방지 스크립트(`npm run check:typography`) 적용 완료. | - | - |
| ✅ | **RN** | **로딩 화면 전수 점검 문서화** | `../documents/(done)loading-screen.md` 작성 완료. `BookFlipLoadingScreen` 사용처, 인라인 로딩 문구, 버튼 상태형 로딩, `RefreshControl` 위치를 전수 정리. | - | - |
| ✅ | **RN** | **로딩 UX 통일/안정화** | (1) 문구 표기: `동사 + 중...` 공백+말줄임표 통일 완료. (2) 부팅 로더: 1500ms 고정 타이머 → `AuthGate.isReady` 이벤트 기반 전환 완료. (3) 인라인 피드백: 텍스트 방식으로 통일, 스피너 없음 정책 확정. (4) `RefreshControl`: 시스템 기본 색상 사용으로 확정. `../documents/(done)loading-screen.md` 최신화 완료. | - | - |

---

## 🧭 UI 통일 10개 항목

| 상태 | 역할 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **RN** | **화면 움직임 신경쓰기(애니메이션 적용)** | `src/theme/motion.ts` 토큰화 + 주요 화면(AppHeader/Meeting/MyPage/Story/News/UserProfile/로딩/토스트) `Animated.timing` 하드코딩 duration 치환 완료. 기준 문서 `../documents/(done)ui-motion-haptic-consistency.md`, `../documents/(done)ui-interaction-token-consistency.md` 반영. | - | 2026-05-07 |
| ✅ | **RN** | **총 10개 항목 정리하기** | `../documents/(done)ui-consistency-top10.md` 작성. RN 기준 통일 항목 10개 전체 완료(1~10번 모두 ✅). | - | - |
| ✅ | **RN** | **1번: 문구/카피 규칙 통일** | `../documents/(done)ui-copy-consistency.md` 작성. `~중` 표기 통일 완료 — 상태 라벨형(`구독중`, `로딩중` 등) 공백 없이, 진행 동작형(`업로드 중...` 등) 공백+말줄임표 적용. `오류 메시지 기술용어 대체` 커밋(f6b7b32) 포함. | - | - |
| ✅ | **RN** | **2번: 로딩 피드백 규칙 통일** | 부팅 로더 1500ms 고정 타이머 → `AuthGate.isReady` 이벤트 기반 전환. 인증 전환 로더는 현재 `AUTH_TRANSITION_MS=1000ms` 기준으로 통일 적용. `StoryScreen` `isLoadingMore` 리스트 하단 인라인 피드백 추가. `../documents/(done)loading-screen.md` 최신화 완료. | - | - |
| ✅ | **RN** | **3번: 버튼 규격 통일** | `AppButton` 컴포넌트 강화 — variant(primary/secondary/outline/danger), size(lg/md), loading+loadingLabel, fullWidth prop 추가. `AuthFlowScreen` 전체 주요 CTA 버튼 AppButton으로 교체 완료. 나머지 336 Pressable은 2차 정리 대상. | - | - |
| ✅ | **RN** | **4번: 입력 폼 규격 통일** | `src/constants/inputLimits.ts` (INPUT_LIMITS 상수) + `src/theme/inputStyles.ts` (base/multiline 토큰) 신규 생성. AuthFlowScreen·MyPageScreen·MeetingScreen·ReportMemberModal·MeetingListCard 전체 `maxLength` 하드코딩 → INPUT_LIMITS 교체. MyPageScreen 소개 20자→40자 버그 수정. AppHeader placeholderTextColor gray2→gray3 통일. `FormTextInput` 공용 컴포넌트 적용(필드타입 규칙 공통화), 길이 초과 입력 차단 + 토스트 `"입력 가능한 길이를 초과했습니다."`로 통일. | - | - |
| ✅ | **RN** | **5번: spacing 토큰 적용 통일** | 하드코딩 54건 → 0건(정책 예외 제외). 예외 정책(0/음수/2·3·6/디자인값) 주석 명시. `npm run check:spacing` 스크립트 추가, `npm run check`에 통합. | - | - |
| ✅ | **RN** | **6번: radius/border/shadow 통일** | borderRadius 하드코딩 58건 → 0건(정책 예외 제외). shadowColor `'#000'`/`'#000000'` 11건 → `colors.black` 교체. AppHeader의 `spacing.xs/md` borderRadius 오용 → `radius.sm/lg` 교정. 예외 정책(원형 아바타 width/2, 컴포넌트 전용 shape) `radius.ts` 주석에 명시. | - | - |
| ✅ | **RN** | **round(버튼/상태) 전수 기준서 작성** | `../documents/(done)ui-round-button-state-consistency.md` 작성. 버튼/칩/탭/토글 스타일 키 313건 전수 점검, round 정의 85건 매트릭스화 완료. 상태 키(`Active/Disabled/Selected/Pressed/Inactive`)에서 round 재정의 0건 확인, 하드코딩 8건은 원형/배지 예외로 분류. | - | - |
| ✅ | **RN** | **7번: 모달/바텀시트 패턴 통일** | `../documents/(done)ui-modal-bottomsheet-consistency.md` 작성. `DialogOverlay`(`Modal+transparent+fade`) · `BottomSheet`(`Modal+transparent+slide`) 공용 컴포넌트 생성. MeetingScreen 5건·MyPageScreen 1건·AuthFlowScreen 2건·StoryScreen 1건 총 9개 인라인 Modal → 공용 컴포넌트 교체 완료. | - | - |
| ✅ | **RN** | **8번: 모션/햅틱 규칙 통일** | `../documents/(done)ui-motion-haptic-consistency.md` 작성. BottomTabs 직접 햅틱 호출(`Haptics.selectionAsync`) → `triggerSelectionHaptic()` 통일. `useNativeDriver: false` 3건 이유 주석 추가. MeetingScreen PanResponder 임계값 7개 named 상수로 추출(감도 값 유지). | - | - |
| ✅ | **RN** | **9번: 피드백 문구 통일** | `../documents/(done)ui-feedback-message-consistency.md` 작성. Alert 메시지 본문 요→니다체 3건 수정(탈퇴할까요/삭제할까요/이용해주세요). Alert 버튼 레이블 이미 전부 취소/동사 일관 확인. 토스트 71건 어투 통일은 별도 todo로 분리. | - | - |
| ✅ | **RN** | **10번: 접근성/이벤트 네이밍 통일** | `../documents/(done)ui-accessibility-event-naming-consistency.md` 작성. `IconButton`·`FloatingActionButton` 컴포넌트에 `accessibilityRole="button"` + `accessibilityLabel` prop 추가. AppHeader(뒤로가기/검색/알림/검색어지우기) 4건·StoryScreen 3건·MeetingScreen 1건·NewsScreen 1건 총 9건 라벨 부여. | - | - |

---

## 🔜 구현 예정

| 상태 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ |
| ⬜ | **비밀번호 변경 후 자동 로그아웃** | `useAccountSettingsState.handleSubmitPasswordUpdate` 성공 시 `logout()` 호출 추가. 토스트 문구: "비밀번호가 변경되었습니다. 다시 로그인해 주세요." 완료 기준(DoD): 비밀번호 변경 성공 → 로그아웃 → 로그인 화면 진입. | 2026-05-08 | 2026-05-08 |
| ⬜ | **헤더 알림 클릭 시 리스트 표출 효과 수정** | `AppHeader` 알림 아이콘 클릭 시 알림 리스트가 열리는 전환 효과/노출 타이밍을 자연스럽게 조정. 완료 기준(DoD): 클릭 직후 리스트가 튀거나 겹치지 않고 일관된 애니메이션으로 표시됨. | 2026-05-08 | - |
| ⬜ | **모임 방문하기 토스트 메시지 수정** | 모임 방문하기 액션에서 노출되는 토스트 문구를 상황에 맞게 정리. 완료 기준(DoD): 방문 성공/제한 상황의 문구가 사용자에게 명확하게 보임. | 2026-05-08 | - |
| ✅ | **[MEET-SPLIT-01] MeetingScreen 분해 설계/경계 정의** | `src/screens/MeetingScreen.tsx`의 도메인 경계 + 목표 파일 구조 + 단계별 계획을 `docs/agent/meet-split-design.md`에 확정. search/home/notice/bookshelf/regularMeeting/management 6개 도메인 정의. | 2026-05-06 | 2026-05-06 |
| ✅ | **[MEET-SPLIT-02] mapper/formatter 순수 함수 분리** | `src/screens/meeting/formatters.ts` (16개) + `src/screens/meeting/mappers.ts` (6개) 신규 생성. MeetingScreen.tsx에서 함수 본체 제거 → import로 교체. tsc 타입 에러 0건 확인. | 2026-05-06 | 2026-05-06 |
| ✅ | **[MEET-SPLIT-03] 공지/책장/채팅/관리 도메인 hook 분리** | `useNoticeState.ts`, `useBookshelfState.ts`, `useManagementState.ts` 신규 생성 완료. `GroupHomeView`에서 3개 hook 조립 완료. 중복 state/effect/handler 제거 완료(8099→4475줄). proxy ref 패턴으로 circular dependency 해결. `tsc --noEmit` 통과. | 2026-05-06 | 2026-05-07 |
| ✅ | **[MEET-SPLIT-04] 하위 View 컴포넌트 분리** | `GroupNoticeView.tsx`, `GroupBookshelfView.tsx`, `GroupManagementOverlay.tsx` 생성 완료. notice/bookshelf 탭 JSX 블록 교체, 관리 Modal 교체 완료. 미사용 파생 변수(`visibleNotices`, `visiblePageNumbers` 등) 정리. `tsc --noEmit` 통과. MeetingScreen.tsx: 10091줄 → 8099줄 (-1992줄). | 2026-05-06 | 2026-05-07 |
| ✅ | **[MEET-SPLIT-05] MeetingScreen 컨테이너 축소(조립 전용화)** | 중복 타입/함수 정의(781줄) 제거 후 `./meeting/types`, `./meeting/helpers`에서 import로 교체. 미사용 API import 정리(clubApi 대폭 축소, bookApi/date utils 제거). `tsc --noEmit` 통과. MeetingScreen.tsx: 10091줄 → 3988줄 (원본 대비 -60%). | 2026-05-06 | 2026-05-07 |
| ✅ | **프로젝트 루트 직속 `*.md` 파일 정리** | 루트 문서 4개(`font.md`, `hamburger.md`, `icon-usage.md`, `svg-usage.md`)를 `docs/documents`의 완료 문서로 이동. 루트에는 `README.md`, `AGENTS.md`, `CLAUDE.md`만 남았으며 활성 링크 참조 없음 확인 완료. | 2026-05-06 | 2026-05-06 |
| ✅ | **CLAUDE.md 생성 및 AGENTS.md 내용 이전** | 현재 Codex 전용인 `AGENTS.md`의 규칙(`/md`, `/cpa`, agent-log 순서 등)을 Claude Code가 자동으로 읽는 `CLAUDE.md`로 옮긴다. 완료 기준(DoD): 프로젝트 루트에 `CLAUDE.md`가 생성되고, Claude Code 대화 시작 시 규칙이 자동 적용되는 것을 확인. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-01] opacity 토큰화** | `interactionOpacity.ts` 신규 생성 및 pressed/pressedStrong/disabled/disabledSoft 4종 토큰 정의. 하드코딩 opacity 교체 완료. 완료 기준(DoD): `interactionOpacity.*` 외 임의 opacity 값 0건. 참고: `docs/documents/(done)ui-interaction-token-consistency.md` 2-1. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-02] motion 토큰화** | `src/theme/motion.ts` 신규 생성. `Animated.timing duration` 하드코딩 15건 → `motion.duration.*` 토큰 교체. loader 전용(240/700/1300)과 일반 전환(160/180/220) 분리. 완료 기준(DoD): 하드코딩 duration 0건. 참고: `docs/documents/(done)ui-interaction-token-consistency.md` 2-2. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-03] zIndex 레이어 스케일 토큰화** | `layers.raised/sticky/dropdown/overlay/toast` 5단계 상수 정의 후 9곳 하드코딩 교체. `zIndex: 999` → `layers.toast(60)` 교체. 완료 기준(DoD): 임의 zIndex 숫자 0건. 참고: `docs/documents/(done)ui-interaction-token-consistency.md` 2-3. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-04] hitSlop 기준 통일** | hitSlop 6 → 8 통일. 전수 확인 결과 이미 전부 8로 통일된 상태(6 0건). `IconButton` 기본값도 8로 고정 확인. 완료 기준(DoD): `hitSlop={6}` 0건. 참고: `docs/documents/(done)ui-interaction-token-consistency.md` 2-4. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-05] 버튼 height 4단계 고정** | `buttonSize.chip=28/icon=36/field=48/cta=52` 토큰 정의. MeetingScreen 버튼 14곳(chip/icon/field/cta) + MyPageScreen emailVerificationButton 교체. 30→28, 32→36 수렴. teamManageSaveButton minHeight 제거. 완료 기준(DoD): 버튼 height 4단계 토큰으로 수렴. 참고: `docs/documents/(done)ui-interaction-token-consistency.md` 2-5. | 2026-05-06 | 2026-05-06 |
| ✅ | **[ARCH-03] 도메인 로직 문자열 결합 해소** | `isMember` 계산을 표시 문자열 비교에서 enum 기반(`membershipStatus`)으로 전환. `helpers.ts`, `workspaceLoader.ts`, `meeting/types.ts` 경유로 raw status를 유지하도록 정리. 참고: `docs/documents/(done)app-architecture-03-domain-logic-coupled-to-display-strings.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-21] 로깅/관측 레이어 통일** | `src/utils/logger.ts` 신규: `createLogger(domain)` — 레벨별(debug/info/warn/error) + `__DEV__` 게이트 + 도메인 prefix. `useMeetingChatStomp` console 11건 → chatLog/stompLog 교체. `logMeetingAction` console 2건 → meetingLog 교체. 도메인 코드 직접 console 호출 0건. `tsc --noEmit` 통과. 참고: `docs/documents/app-standardization-21-logging-observability-layer.md` | 2026-05-08 | 2026-05-08 |
| ✅ | **[STD-22] CI 품질 게이트 파이프라인 고정** | `.github/workflows/ci.yml` 신규 생성. 트리거: `pull_request`/`push`(main/develop). 스텝: `npm ci` → `lint` → `typecheck` → `check:typography` → `check:spacing`. `doctor`(expo-doctor)는 CI 환경 부적합으로 제외. PR 머지 차단 강제 가능. 참고: `docs/documents/(done)app-standardization-22-ci-quality-gate-pipeline.md` | 2026-05-08 | 2026-05-08 |
| ✅ | **[ARCH-04] 서버 상태 오케스트레이션 hook/service 계층 분리** | `useMeetingDiscover.ts` 신규: myGroups/discoverGroups 상태 + 페이지네이션 루프 추출. `workspaceLoader.ts` 신규: `fetchAllClubBookshelvesWithCursor` + `fetchClubWorkspaceData`(공지 다중 페이지, 병렬 fetch 포함) 추출. `reloadClubWorkspace` 본체 → `fetchClubWorkspaceData` 호출로 교체. MeetingScreen.tsx: 3988→3665줄(-323줄). `tsc --noEmit` 통과. 참고: `docs/documents/(done)app-architecture-04-server-state-orchestration-in-ui.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-05] 비동기 레이스 방지 일관화** | `useMeetingDiscover`에 `discoverSeqRef`를 도입해 stale 응답의 state 반영을 차단. 검색/로딩 최신성 정책을 시퀀스 게이트로 통일. 참고: `docs/documents/(done)app-architecture-05-async-race-consistency.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-06] 네트워크 계층 책임 분리** | `requestJson` 기본값을 `suppressErrorToast: true`로 전환하고, 쓰기 경로에서만 명시적 토스트를 허용하도록 정리. `resolveErrorMessage` export 및 직접 `fetch` 예외 경로 주석 정비 완료. 참고: `docs/documents/(done)app-architecture-06-network-layer-responsibility-blur.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-07] API 타입 경계 강화** | `src/services/api/parseUtils.ts` 생성(`asRecord`, `toStringValue`, `toBooleanValue`, `toNumberValue`, `firstDefined`, `asStringArray`) 후 `clubApi` 중복 파서 제거/치환 완료. 참고: `docs/documents/(done)app-architecture-07-weak-api-type-boundary.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-08] 네비게이션 타입 안정성 강화** | `src/navigation/types.ts`에 `TabParamList`, `RootStackParamList` 정의. `MeetingScreen`의 `ParamListBase` 의존 제거 및 라우트 파라미터 타입 적용. 참고: `docs/documents/(done)app-architecture-08-navigation-type-safety-and-custom-stack.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-09] 이미지 업로드 파이프라인 공통화** | `src/utils/imageUpload.ts` 생성(`inferMimeType`, `uploadImageFromUri`, `pickAndUploadImage`) 후 Meeting/MyPage/Auth 중복 업로드 코드 치환 완료. 참고: `docs/documents/(done)app-architecture-09-duplicated-image-upload-pipeline.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **로그인/회원가입 성공 후 이전 화면 복귀** | `requireAuth(callback)` + `pendingActionRef` 패턴 전면 적용 완료. MyPageScreen(팔로워/팔로잉 목록, 설정)·AppHeader(책 좋아요 토글, 알림 열기) 4곳에 콜백 추가. StoryScreen 글 작성은 이미 적용돼 있었음. 로그인·회원가입 모두 `completeAuthFlow` 경로로 통일 확인. | - | - |
| ✅ | **[STD-10] 입력 레이어 통일(FormTextInput)** | 길이 제한 입력을 `FormTextInput` 기준으로 통일하고, `src/utils/input.ts` 데드코드 삭제. `GroupNoticeView` 댓글 입력 포함 raw `TextInput` 경로 정리 완료. 참고: `docs/documents/(done)app-standardization-10-input-layer-unification.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-11] Pressable 프리미티브 통일** | `MeetingListCard`, `MyGroupsDropdownCard` raw `Pressable`을 `FeedbackPressable`로 전환하고 미사용 `Pressable` import 정리. 참고: `docs/documents/(done)app-standardization-11-pressable-primitive-unification.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-12] 도메인 상수 중앙화** | `src/constants/validation.ts` (regex 4종) + `src/constants/defaultAssets.ts` (이미지 URI 3종) 신규 생성. AuthFlowScreen·MyPageScreen·HomeScreen·meeting/helpers·GroupManagementOverlay·MeetingListCard·MeetingScreen·UserProfileScreen 9개 파일 중복 선언 제거. 참고: `docs/documents/(done)app-standardization-12-domain-constants-centralization.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-13] cursor 페이지네이션 공통 유틸** | `src/utils/pagination.ts` — `collectAllCursorPages<Item>` 제네릭 함수 신규 생성. HomeScreen·NewsScreen·MyPageScreen·memberApi 4곳의 for-loop 대체. 참고: `docs/documents/(done)app-standardization-13-cursor-pagination-policy.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-14] 에러 리졸버 통합** | `src/utils/resolveApiError.ts` 신규 생성. 화면별 `resolve*ErrorMessage` 함수 제거 → `resolveApiError(error, overrides, fallback)` 공통 호출로 교체(HomeScreen·NewsScreen·StoryScreen·MyPageScreen 4곳). 참고: `docs/documents/(done)app-standardization-14-error-resolver-consolidation.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-15] edge swipe back hook 공통화** | `src/hooks/useEdgeBackSwipe.ts` 신규 생성. `requireHorizontalDominance` 옵션 포함. StoryScreen·NewsScreen·UserProfileScreen 3곳의 PanResponder 보일러플레이트 제거. 참고: `docs/documents/(done)app-standardization-15-edge-swipe-hook.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-16] 네비게이션 파라미터 헬퍼** | `navigateToHome.ts`에 `parsePositiveIntParam` + `findNavigatorWithRoute` 추가. MeetingScreen·NewsScreen·StoryScreen·UserProfileScreen 4곳 인라인 파싱/nav chain 탐색 제거. 참고: `docs/documents/(done)app-standardization-16-navigation-param-helper.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-17] 품질 게이트 확장** | BottomTabs.tsx 데드코드(`Placeholder`, `labelsMap`, unused imports/styles) 제거. `package.json`에 `lint` 스크립트(`eslint src --ext .ts,.tsx --max-warnings 0`) 추가. 참고: `docs/documents/(done)app-standardization-17-quality-gate-expansion.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-10] 대형 화면 기능 경계 재정의** | `useNotificationState` + `useAccountSettingsState` 훅 신규 생성. `MyPageScreen` 알림/계정설정 도메인 추출(3567→3059줄). StoryScreen·AuthFlowScreen은 cross-domain coupling 과다로 스킵. `tsc --noEmit` 통과. 참고: `docs/documents/(done)app-architecture-10-screen-feature-composition-boundary.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-18] 도메인 레이블 딕셔너리 중앙화** | `src/constants/domain/category.ts` + `participant.ts` 신규 생성(LABEL↔CODE 양방향 맵). 5개 파일(MyPageScreen·UserProfileScreen·AuthFlowScreen·meeting/helpers·MeetingScreen·useManagementState)에서 인라인 Record 제거. `tsc --noEmit` 통과. 참고: `docs/documents/(done)app-standardization-18-domain-label-dictionary-centralization.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-19] 라우트 파라미터 소비/초기화 훅 통일** | `src/hooks/useConsumeRouteParam.ts` 신규 생성. NewsScreen·MeetingScreen·MyPageScreen(×2)·AppHeader 5곳의 one-shot param useEffect 보일러플레이트 제거. `parsePositiveIntParam` 시그니처를 `unknown`으로 넓힘. StoryScreen 복합 파라미터(openCompose+composeBook, openStoryId+openStoryFocus)는 결합 과다로 스킵. `tsc --noEmit` 통과. 참고: `docs/documents/(done)app-standardization-19-route-param-consume-reset-hook.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-20] 이메일 인증 플로우 공통 훅화** | `src/hooks/useEmailVerificationFlow.ts` 신규 생성(state: sent/verified/remainingSeconds/remainingText/sending/confirming, action: sendCode/confirmCode/reset). AuthFlowScreen에서 7개 상태·useMemo·타이머 useEffect·두 핸들러 제거 → 훅 적용. `useAccountSettingsState`도 동일하게 교체. 두 화면의 API 호출·카운트다운 정책이 단일 훅으로 통합. `tsc --noEmit` 통과. 참고: `docs/documents/(done)app-standardization-20-email-verification-flow-shared-hook.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **후속 표준화/아키텍처 문서 6건 작성** | 완료된 `(done)` 범위를 제외한 남은 구조 개선 과제를 문서화: `app-architecture-10`, `app-standardization-18~22` 신규 작성. 각 문서에 코드 근거/리스크/개선가이드/DoD 포함. | 2026-05-07 | 2026-05-07 |

---

## 📝 검토 대기 항목

| 상태 | 항목 | 배경 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ |
| ✅ | **입력 필드 글자 수 카운터 추가 적용** | 장문 입력 5종(발제/한줄평, 책이야기 본문, 모임 소개글(생성/수정), 프로필 소개글(회원가입/프로필편집))에 `N/max` 카운터 적용 완료. | - | - |
| ✅ | **토스트 문구 어투 통일 (~해주세요 → ~합니다 체)** | `showToast` 호출 중 "~해주세요." 끝나는 문구 약 71건. 입력 안내형(`닉네임을 입력해주세요`) → `~해야 합니다` 또는 `~이 필요합니다` 체로 통일. 재시도형(`다시 시도해주세요`) → `다시 시도해 주십시오` 체로 분리 처리. 103건 적용 완료(12개 파일). | - | - |

---

## 🧪 직접 테스트 필요 항목

> 코드를 기계로 확인할 수 없어서, 실제 앱을 켜서 눈으로 봐야 하는 것들

| 상태 | 항목 | 어디서 테스트하나 | 뭘 확인하나 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ⬜ | **앱 처음 켤 때 로딩 화면** | 앱을 완전히 종료 후 다시 실행 | 책모 로딩 화면이 뜨다가, 네트워크 응답 끝나는 시점에 자연스럽게 사라지는지. 전에는 무조건 1.5초였는데 이제 서버 응답 기준으로 바뀜 → 너무 빨리 사라지거나 아예 안 사라지면 이상한 것. | - | - |
| ✅ | **로그인 안 된 상태에서 로그인 필요 기능 누를 때** | 비로그인 상태로 구독, 좋아요 등 버튼 클릭 | 책모 로딩 화면이 잠깐 뜨면서(약 1.0초) "로그인이 필요합니다" 안내가 보이고, 그 뒤 로그인 화면으로 넘어가는지. (`AUTH_TRANSITION_MS=1000ms` 기준) | - | 2026-05-08 |
| ✅ | **간격 통일 이후 컴포넌트 확인 QA** | 전체 화면 직접 탐색 | `spacing.xs / 2` → `spacing.xxs` 교체(78건) 이후 실기기에서 카드·입력폼·모달·리스트 등 주요 컴포넌트의 내부 간격이 시각적으로 이상하지 않은지 확인. | - | 2026-05-08 |
| ⬜ | **신고 유형 칩 모양 QA** | 책이야기 상세 → 신고 / 내 페이지 → 신고 | StoryScreen `reportTypeButton`(radius.sm)과 MyPageScreen `reportTypeChip`(radius.sm으로 변경)이 동일하게 직각에 가까운 칩 모양으로 보이는지 확인. | - | - |
| ✅ | **책이야기 구독 버튼 모양 QA** | 책이야기 카드(BookStoryCard) 탭 탐색 | `subscribeChip` radius.lg→sm 변경으로 FeedCard의 subButton과 동일한 덜 둥근 모양인지 확인. | - | 2026-05-08 |
| ✅ | **내 페이지 카테고리 칩 모양 QA** | 내 페이지 → 프로필 편집 → 독서 취향 | `categoryChip` radius.sm→lg 변경으로 AuthFlowScreen 회원가입 장르 선택칩과 동일하게 둥근 chip 모양인지 확인. | - | 2026-05-08 |
| ⬜ | **기본 프로필 색상 적용 QA** | 기본 프로필이 보이는 화면 전반 | 기본 프로필 이미지/아바타가 여러 사용자·상태에서 다른 색상으로 정상 적용되는지 확인. | 2026-05-08 | - |
| ⬜ | **모임 책장 세션·그룹 필터 칩 QA** | 모임 → 책장 탭 | `bookshelfSessionChip`(radius.md→sm)과 `bookshelfGroupChip`(radius.sm) 두 필터가 동일한 모양인지 확인. | - | - |
| 🔄 | **책이야기 피드 스크롤 끝까지 (데이터 쌓이고 확인 필요)** | 책이야기 탭에서 맨 아래까지 스크롤 | 현재 데이터량 부족으로 실기기 확인 보류. 데이터가 충분히 쌓인 뒤, 다음 페이지 불러올 때 맨 아래에 "불러오는 중..." 텍스트가 잠깐 보이는지 확인. | - | - |
| 🔄 | **입력 한도 토스트** | 닉네임·이름·소개·모임이름·소개·지역·링크·신청사유·신고내용 각 필드에서 한도 초과 입력 시도 | `maxLength` 초과 입력이 차단되고 `"입력 가능한 길이를 초과했습니다."` 토스트가 노출되는지 확인. (모임 가입 신청 사유 1차 확인 완료, 나머지 필드 실기기 확인 필요) | - | - |
| ✅ | **로그인 완료 직후 전환 + 이전 화면 복귀** | 책이야기 작성 버튼 클릭 → 로그인/회원가입 성공 | 로그인 완료 후 작성 화면이 자동으로 열리는지. 팔로워/팔로잉 목록, 설정, 책 좋아요도 동일 확인. | - | - |
| ✅ | **로그아웃 직후 전환** | 내 페이지 → 설정 → 로그아웃 | 로그아웃 확인 후 홈 탭으로 이동하는지. (`navigateToHome` 적용 완료, 실기기 확인 완료) | - | - |

---

## 🐛 issue-fetch 미완료 항목

> 출처: [issue-fetch.md](./issue-fetch.md) — 완료 항목 제외, 미처리 항목만 정리

### BE 문서 수정 필요

| 상태 | 역할 | ID | 항목 | 내용 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| ⬜ | **BE 문서** | `BOOK-04` | 공개/인증 필요 여부 문서-실서버 불일치 | 일부 엔드포인트(`all/member/search`)는 익명 200인데 문서엔 401이 혼재. 실제 정책 기준으로 Swagger 정리 필요. | - | - |
| ⬜ | **BE 문서** | `BOOK-05` | 날짜 형식 표기 차이 | 스키마는 `date-time`인데 실제는 `YYYY-MM-DD HH:mm` 응답. RFC3339로 통일하거나 현재 포맷을 문서에 명시. | - | - |
| ⬜ | **BE 문서** | `BOOKS-03` | 다른 회원 좋아요 목록 권한 불일치 | Swagger엔 401이 명시되지만 실서버는 비로그인 200 응답. 공개/비공개 정책 확정 후 서버 또는 문서 정리 필요. | - | - |
| ⬜ | **BE 문서** | `BOOKS-04` | nullable 필드 문서 누락 | 실응답에서 `currentPage`, `nextCursor`가 null인데 스키마는 정수로만 정의됨. Swagger에 `nullable` 명시 필요. | - | - |
| ⬜ | **BE 문서** | `BOOKS-05` | 검색 "결과 없음" 상태코드 불일치 | Swagger는 404 정의, 실서버는 200 + 빈 배열 반환. 정책 고정 후 문서 또는 서버 통일 필요. | - | - |
| ⬜ | **BE 문서** | `NEWS-04` | 소식 조회 권한 문서-실서버 불일치 | `/news`, `/news/{id}`는 익명 조회 가능(실서버)인데 문서엔 401 케이스 혼재. | - | - |
| ⬜ | **BE 문서** | `MEET-SEARCH-02` | 추천 API 권한 문서-실서버 불일치 | `/clubs/recommendations` 비로그인 401인데 Swagger는 200만 정의. | - | - |
| ⬜ | **BE** | `MEET-SEARCH-05` | 키워드 길이 초과 시 500 응답 | 40자 초과 시 400 대신 500(`COMMON_500`) 반환. 서버 입력 검증 예외를 400으로 정규화 필요. | - | - |
| ⬜ | **BE 문서** | `MYPAGE-01` | 내 모임 API 권한 응답 문서 누락 | `/me/clubs` 비로그인 401인데 Swagger는 200/400만 명시. | - | - |
| ⬜ | **BE 문서** | `MEET-HOME-02` | 내 클럽 상태 조회 API 문서 누락 | `/clubs/{clubId}/me` 비로그인 401인데 Swagger는 200/404만 정의. | - | - |
| ⬜ | **BE 문서** | `MEET-NOTICE-01` | 공지 조회 API 권한 응답 문서 누락 | `/clubs/{clubId}/notices*` 비로그인 401인데 Swagger는 200/403/404 중심. | - | - |
| ⬜ | **BE 문서** | `MEET-BOOKSHELF-01` | 책장/정기모임 API 권한 응답 문서 누락 | `/bookshelves*`, `/meetings*` 비로그인 401인데 문서에 누락. | - | - |
| ⬜ | **BE 문서** | `AUTH-02` | 로그인 상태 조회 API 권한 응답 문서 누락 | `/members/me/login-status` 비로그인 401인데 Swagger는 200만 정의. | - | - |
| ⬜ | **BE 문서** | `MEM-07` | 내 계정 API 권한 응답 문서 누락 | `/members/me/follow-count` 등 비로그인 401인데 Swagger 누락. | - | - |
| ⬜ | **BE 문서** | `MEET-MGMT-05` | 모임 운영/관리 API 권한 응답 문서 누락 | `/clubs`(POST), `/clubs/{clubId}`(PUT/DELETE), `/clubs/{clubId}/members*` 401 누락. | - | - |
| ⬜ | **BE 문서** | `CHAT-03` | 채팅 히스토리 API 권한 응답 문서 누락 | 채팅 히스토리 API 비로그인 401인데 문서엔 200/400만 정의. | - | - |

### 공동 협의 필요 (RN 선반영 완료)

| 상태 | 역할 | ID | 항목 | 현황 / 남은 작업 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| ⬜ | **공동** | `MEET-HOME-03` | 이번 모임 바로가기 권한/응답 불일치 | BE 문서에 401 추가 + RN에서 비로그인 사전 차단 또는 401 전용 UX 정리. | - | - |
| ⬜ | **공동** | `MEET-MGMT-04` | 모임 수정 요청에서 링크 필드 미전송 | BE의 "미전송 필드 처리 정책" 확정 후 앱 수정 화면 링크 편집/전송 정리. | - | - |
| ⬜ | **공동** | `CHAT-02` | REST 채팅 전송 함수가 스펙/실사용과 불일치 | `sendClubMeetingTeamChatMessage` 유지/폐기 정책 확정 후 RN 미사용 함수 제거 또는 경로 정리. | - | - |
| ⬜ | **공동** | `REPORT-01` | 신고 대상 엔티티 식별자 미전달 | BE: 신고 모델에 `domainType/domainId` 확장. RN: 앱 신고 호출을 엔티티 기반으로 전환. | - | - |
| 🔄 | **공동** | `MEM-04` | find-email GET fallback | RN: POST 단일 경로 정리 완료. BE 정책/문서 최종 확정 필요. | - | - |
| 🔄 | **공동** | `MEM-09` | 사용자 차단 기능 | RN: 준비중 안내 UX 정리 완료. 차단 API 계약/BE 연동 필요. | - | - |
| 🔄 | **공동** | `AUTH-01` | 회원가입 완료 플로우 비원자성 | RN: 보상/재시도 흐름 보완 완료. 서버 트랜잭션/상태모델 BE 협의 필요. | - | - |

## 상태 범례

- ⬜ 미완료
- 🔄 진행 중
- ✅ 완료
