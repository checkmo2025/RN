# TODO

> 마지막 업데이트: 2026-07-06 KST

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
| 7 | `## 🔎 유관 확인` | 중단 | 최근 반영 변경과 함께 확인할 후속 포인트 |
| 8 | `## 🧪 직접 테스트 필요 항목` | 중하단 | 실기기 QA/수동 검증 항목 |
| 9 | `## 🔤 글자수 테스트 육안` | 중하단 | 입력 글자수 제한/스크롤/토스트 실기기 확인 |
| 10 | `## 👀 버그수정 육안 확인` | 중하단 | 버그수정/기능변경 후 실기기 육안 검증 체크리스트 |
| 11 | `## 7/2 QA 이후 수정한것들 육안 테스트` | 버그수정 육안 확인 아래 | 7/2 QA 이후 반영한 앱 수정사항 실기기 확인 |
| 12 | `## 🐛 issue-fetch 미완료 항목` | 하단 | API/계약 이슈 추적 항목 |
| 13 | `## 🗒 2026-06-18 QA 수집 (상세 설명 대기)` | issue-fetch 아래 | 사용자 QA 메모 원문 수집, 상세 설명 대기 |
| 14 | `## 상태 범례` | 문서 최하단 | 상태 표기 기준 |

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
| ✅ | **RN** | **로딩 화면 전수 점검 문서화** | `../archive/(done)loading-screen.md` 작성 완료. `BookFlipLoadingScreen` 사용처, 인라인 로딩 문구, 버튼 상태형 로딩, `RefreshControl` 위치를 전수 정리. | - | - |
| ✅ | **Android** | **앱 아이콘 로고 크기 조정** | iOS/Android 아이콘 파일 분리 (checkmo-app-icon-ios.png, checkmo-app-icon-android.png). Android adaptive icon safe zone 대응, 로고 65% 축소 적용 완료. 에뮬레이터 확인 완료. | 2026-05-23 | 2026-05-24 |
| ✅ | **RN** | **로딩 UX 통일/안정화** | (1) 문구 표기: `동사 + 중...` 공백+말줄임표 통일 완료. (2) 부팅 로더: 1500ms 고정 타이머 → `AuthGate.isReady` 이벤트 기반 전환 완료. (3) 인라인 피드백: 텍스트 방식으로 통일, 스피너 없음 정책 확정. (4) `RefreshControl`: 시스템 기본 색상 사용으로 확정. `../archive/(done)loading-screen.md` 최신화 완료. | - | - |

---

## 🧭 UI 통일 10개 항목

| 상태 | 역할 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **RN** | **화면 움직임 신경쓰기(애니메이션 적용)** | `src/theme/motion.ts` 토큰화 + 주요 화면(AppHeader/Meeting/MyPage/Story/News/UserProfile/로딩/토스트) `Animated.timing` 하드코딩 duration 치환 완료. 기준 문서 `../archive/(done)ui-motion-haptic-consistency.md`, `../archive/(done)ui-interaction-token-consistency.md` 반영. | - | 2026-05-07 |
| ✅ | **RN** | **총 10개 항목 정리하기** | `../archive/(done)ui-consistency-top10.md` 작성. RN 기준 통일 항목 10개 전체 완료(1~10번 모두 ✅). | - | - |
| ✅ | **RN** | **1번: 문구/카피 규칙 통일** | `../archive/(done)ui-copy-consistency.md` 작성. `~중` 표기 통일 완료 — 상태 라벨형(`구독중`, `로딩중` 등) 공백 없이, 진행 동작형(`업로드 중...` 등) 공백+말줄임표 적용. `오류 메시지 기술용어 대체` 커밋(f6b7b32) 포함. | - | - |
| ✅ | **RN** | **2번: 로딩 피드백 규칙 통일** | 부팅 로더 1500ms 고정 타이머 → `AuthGate.isReady` 이벤트 기반 전환. 인증 전환 로더는 현재 `AUTH_TRANSITION_MS=1000ms` 기준으로 통일 적용. `StoryScreen` `isLoadingMore` 리스트 하단 인라인 피드백 추가. `../archive/(done)loading-screen.md` 최신화 완료. | - | - |
| ✅ | **RN** | **3번: 버튼 규격 통일** | `AppButton` 컴포넌트 강화 — variant(primary/secondary/outline/danger), size(lg/md), loading+loadingLabel, fullWidth prop 추가. `AuthFlowScreen` 전체 주요 CTA 버튼 AppButton으로 교체 완료. 나머지 336 Pressable은 2차 정리 대상. | - | - |
| ✅ | **RN** | **4번: 입력 폼 규격 통일** | `src/constants/inputLimits.ts` (INPUT_LIMITS 상수) + `src/theme/inputStyles.ts` (base/multiline 토큰) 신규 생성. AuthFlowScreen·MyPageScreen·MeetingScreen·ReportMemberModal·MeetingListCard 전체 `maxLength` 하드코딩 → INPUT_LIMITS 교체. MyPageScreen 소개 20자→40자 버그 수정. AppHeader placeholderTextColor gray2→gray3 통일. `FormTextInput` 공용 컴포넌트 적용(필드타입 규칙 공통화), 길이 초과 입력 차단 + 토스트 `"입력 가능한 길이를 초과했습니다."`로 통일. | - | - |
| ✅ | **RN** | **5번: spacing 토큰 적용 통일** | 하드코딩 54건 → 0건(정책 예외 제외). 예외 정책(0/음수/2·3·6/디자인값) 주석 명시. `npm run check:spacing` 스크립트 추가, `npm run check`에 통합. | - | - |
| ✅ | **RN** | **6번: radius/border/shadow 통일** | borderRadius 하드코딩 58건 → 0건(정책 예외 제외). shadowColor `'#000'`/`'#000000'` 11건 → `colors.black` 교체. AppHeader의 `spacing.xs/md` borderRadius 오용 → `radius.sm/lg` 교정. 예외 정책(원형 아바타 width/2, 컴포넌트 전용 shape) `radius.ts` 주석에 명시. | - | - |
| ✅ | **RN** | **round(버튼/상태) 전수 기준서 작성** | `../archive/(done)ui-round-button-state-consistency.md` 작성. 버튼/칩/탭/토글 스타일 키 313건 전수 점검, round 정의 85건 매트릭스화 완료. 상태 키(`Active/Disabled/Selected/Pressed/Inactive`)에서 round 재정의 0건 확인, 하드코딩 8건은 원형/배지 예외로 분류. | - | - |
| ✅ | **RN** | **7번: 모달/바텀시트 패턴 통일** | `../archive/(done)ui-modal-bottomsheet-consistency.md` 작성. `DialogOverlay`(`Modal+transparent+fade`) · `BottomSheet`(`Modal+transparent+slide`) 공용 컴포넌트 생성. MeetingScreen 5건·MyPageScreen 1건·AuthFlowScreen 2건·StoryScreen 1건 총 9개 인라인 Modal → 공용 컴포넌트 교체 완료. | - | - |
| ✅ | **RN** | **8번: 모션/햅틱 규칙 통일** | `../archive/(done)ui-motion-haptic-consistency.md` 작성. BottomTabs 직접 햅틱 호출(`Haptics.selectionAsync`) → `triggerSelectionHaptic()` 통일. `useNativeDriver: false` 3건 이유 주석 추가. MeetingScreen PanResponder 임계값 7개 named 상수로 추출(감도 값 유지). | - | - |
| ✅ | **RN** | **9번: 피드백 문구 통일** | `../archive/(done)ui-feedback-message-consistency.md` 작성. Alert 메시지 본문 요→니다체 3건 수정(탈퇴할까요/삭제할까요/이용해주세요). Alert 버튼 레이블 이미 전부 취소/동사 일관 확인. 토스트 71건 어투 통일은 별도 todo로 분리. | - | - |
| ✅ | **RN** | **10번: 접근성/이벤트 네이밍 통일** | `../archive/(done)ui-accessibility-event-naming-consistency.md` 작성. `IconButton`·`FloatingActionButton` 컴포넌트에 `accessibilityRole="button"` + `accessibilityLabel` prop 추가. AppHeader(뒤로가기/검색/알림/검색어지우기) 4건·StoryScreen 3건·MeetingScreen 1건·NewsScreen 1건 총 9건 라벨 부여. | - | - |

---

## 🔜 구현 예정

| 상태 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ |
| ⬜ | **온보딩(첫 사용자 가이드) 추가** | 온보딩 화면/슬라이드 코드는 보관하되 사용자·개발 환경 모두에서 노출 경로를 비활성화한다. 현재 홈 임시 미리보기 버튼 제거 완료. 추후 재개 전까지 첫 콜드런치 자동 노출, 마이페이지 다시보기, 개발용 미리보기 버튼을 만들지 않는다. DoD: 앱 어디에서도 온보딩 진입 경로가 보이지 않고, `npm run check` 통과. 참고: `docs/documents/onboarding-plan.md` | 2026-06-21 | 2026-06-27 |
| ⬜ | **플레이스토어 제출 전 사용자 준비** | Google Play Console에서 코드 외 제출 준비를 완료한다. 무엇을: 개발자 계정/결제 프로필 확인, 앱 생성(`kr.co.checkmo.app`), 앱 이름/간단한 설명/자세한 설명/그래픽/스크린샷 등록, 개인정보처리방침 URL 등록, 데이터 보안 설문, 콘텐츠 등급 설문, 타겟층/광고 여부/앱 액세스 권한/뉴스 앱 여부 등 정책 설문 작성, 서비스 계정 JSON 준비 후 내부 테스트 트랙 제출. 왜: 코드 빌드는 준비됐지만 Play 심사는 콘솔 메타데이터와 정책 선언이 없으면 제출 불가. DoD: 내부 테스트 트랙에 `app-release.aab` 또는 EAS production AAB 업로드 완료, Play Console 사전 검토/정책 경고 0건 또는 조치 계획 정리. | 2026-06-16 | 2026-06-16 |
| ✅ | **조 관리 드래그 자동 스크롤 안정화** | 조 관리에서 회원을 드래그해 상·하단 112px 영역에 유지하면 180~900px/s 거리 비례·프레임 시간 기반으로 연속 스크롤되도록 개선. viewport/content 높이·offset·maxOffset을 `onLayout`/`onContentSizeChange`/`onScroll`로 추적하고, quick chip/window 좌표와 content card/스크롤 좌표를 분리. responder 종료 거부·terminate 취소, 현재 drop zone 강조 적용. DoD: 타입 검사 통과, 양방향 이동·드롭·취소는 실기기 QA로 분리. | 2026-06-22 | 2026-06-22 |
| ✅ | **조별 채팅 기능 재도입** | 모임 책장 → 정기모임 → 조 상세에 채팅 FAB를 복원하고 권한별 조 선택, REST 최근 30개/상단 커서 페이징, STOMP 실시간 송수신·재연결 병합을 구현. 작성자 클릭은 프로필 사진·아이디·사용자 신고·바로가기 인라인 모달, 채팅 박스 클릭은 내 메시지 복사/타인 메시지 복사·신고 인라인 메뉴로 분리하고 `⋮`는 제거. 복사 시 `expo-clipboard`로 시스템 클립보드에 저장. REST 전송 함수는 복원하지 않고 STOMP 발행만 사용. DoD: 정적 검사 통과, iOS/Android 실시간·페이징·신고는 직접 테스트 항목으로 분리. | 2026-06-22 | 2026-06-22 |
| ✅ | **책 검색 체감 속도 단축** | 서버 알라딘 의존(캐시미스 250~980ms)이라 클라에서 단축. 공용 훅 `useBookSearch`(debounce 400ms prefetch + 최소2자 + normalize/dedupe + AbortController + TTL 캐시 3분). Phase 0(인프라)·1(헤더)·2(책이야기·책장 통일)·3(`totalResults` 정확 표기) **전부 완료** — 헤더/책이야기/책장 3곳 단일화. 참고: `docs/documents/book-search-latency-plan.md` | 2026-06-22 | 2026-06-22 |
| ✅ | **POST 후 즉시 반영 누락 정리** | 사용자 통과 확인(2026-06-27). 뮤테이션 성공 후 화면에 즉시 반영 안 되는 케이스 정리 완료. 잔여로 보던 차단, 신고 히스토리, 이메일 변경, 책이야기 삭제 실패 롤백 등도 통과 처리. DoD: 각 동작 성공 직후 해당 화면/연관 목록에 변경이 보이고, 실패 시 롤백 또는 안내. | 2026-06-22 | 2026-06-27 |
| ✅ | **웹 애플로그인 키 발급** | 사용자 통과 확인(2026-06-27). Apple Developer Console 웹용 Sign in with Apple 자격증명 발급 항목 완료 처리. DoD: Services ID/Key(.p8)/Key ID/Team ID 확보 및 redirect 도메인 등록 완료, BE 환경변수에 주입 가능한 상태. 참고: `docs/documents/apple-login-backend-plan.md` | 2026-06-21 | 2026-06-27 |
| ✅ | **앱 버전 정책 조회 재활성화** | 사용자 실기기 통과 확인(2026-07-01). BE 앱 버전 정책 API(`GET /app/version`) 연동 완료로 `useAppVersionGate`의 `APP_VERSION_POLICY_LOOKUP_ENABLED`를 `true`로 복구했고, iOS/Android 정책 조회 200, 최신 버전 통과, 최소 지원 버전 미만 강제 업데이트 모달, 최신 버전 미만 권장 업데이트 모달, 업데이트 버튼 스토어 이동 확인까지 완료. | 2026-06-29 | 2026-07-01 |
| ✅ | **모달 시각 토큰 통일 (백드롭/radius/max-width)** | 7번(구조/애니메이션/닫기) 통일 이후에도 남은 **시각 토큰 불일치** 정리. 어디서: `DialogOverlay`/`BottomSheet` 사용처 + `ReportMemberModal`. 무엇을: 백드롭 투명도 하드코딩(`rgba 0.24/0.28/0.4`)을 `colors.overlay30` 단일 토큰으로 수렴, 중앙 다이얼로그 max-width(`420/460/760/180`)·radius(`md↔lg`) 기준 1개로 통일, `ReportMemberModal`을 `DialogOverlay` 기반으로 흡수 검토. 왜: 같은 성격 다이얼로그가 화면마다 다른 어둡기/모서리로 보여 일관성 저하. DoD: 다이얼로그 백드롭 하드코딩 rgba 0건(`overlay30` 사용), max-width/radius 기준값 1개 수렴(예외 주석), `ReportMemberModal` 정리 또는 유지사유 문서화. 참고: `docs/archive/(done)ui-modal-visual-token-consistency.md` | 2026-06-13 | 2026-06-13 |
| ✅ | **공지사항 리스트 로딩 문제** | 사용자 통과 확인(2026-06-27). MeetingScreen 모임 내부 공지사항 탭 리스트 로딩/갱신 문제 완료 처리. DoD: 공지 리스트가 초기 진입과 갱신 후 항상 정상 표시되고, 로딩/빈 목록/오류 상태가 구분되어 보임. | 2026-06-14 | 2026-06-27 |
| ✅ | **책이야기 공유하기 문제** | StoryScreen 책이야기 상세/메뉴의 `공유하기` 동작을 재현하고 수정한다. 실기기 통과 확인. DoD: iOS/Android에서 공유 시트가 정상 열리고, 현재 책이야기 제목/본문/링크 정보가 의도대로 전달되며 실패 시 사용자 안내가 표시됨. | 2026-06-14 | 2026-06-14 |
| ✅ | **회원가입 로직 수정** | AuthFlowScreen 회원가입 플로우에서 계정 생성/앱 로그인/추가정보 저장 순서를 분리하고, 미완성 프로필 세션은 `AUTH_403` 기반으로 프로필 생성 화면에 복귀하도록 정리 완료. DoD: 회원가입 성공/실패/재시도, 미완성 계정 앱 재시작, 프로필 완료 후 앱 진입 흐름 확인. | 2026-06-13 | 2026-06-15 |
| ✅ | **마이페이지 SVG 확인하기** | MyPageScreen 및 관련 마이페이지 컴포넌트에서 SVG 아이콘/기본 이미지 렌더링 상태를 실기기 기준으로 확인한다. DoD: 아이콘 크기·잘림·색상·fallback 표시 이상 여부를 정리하고 필요한 코드 수정까지 반영. | 2026-06-13 | 2026-06-14 |
| ✅ | **모임 생성 로직 수정** | 사용자 실기기 통과 확인(2026-06-28). MeetingScreen 모임 생성 플로우에서 필수/선택 입력 조합별 생성 성공 및 실패 안내가 의도대로 동작함. | 2026-06-13 | 2026-06-28 |
| ✅ | **모임 상세정보 로딩 안됨** | MeetingScreen 모임 상세 진입 시 상세정보가 로딩되지 않거나 화면에 반영되지 않는 케이스를 재현하고 원인을 수정한다. DoD: 모임 목록/외부 진입/새로고침 후에도 모임 상세정보가 정상 로딩되고 실패 시 안내가 표시됨. | 2026-06-13 | 2026-06-14 |
| ✅ | **MyPageScreen 내 책이야기 탭 스켈레톤 재구현** | `renderStories`에서 `storyThumb` 스타일 적용, title(40px)/excerpt(34px) 높이 실제 레이아웃과 일치, storyActions 2버튼+divider 구조로 재구현. DoD: 마이페이지 진입 시 책이야기 탭 로딩 중 실제 카드 레이아웃과 동일한 스켈레톤 표시. | 2026-06-11 | 2026-06-11 |
| ✅ | **설정 화면 스켈레톤 구현** | 신고 관리(reportCard 3개) / 차단 관리(reportCard 3개) / 알림 관리(alarmRow 6개) 로딩 텍스트 → SkeletonBox로 교체. 내 소식 관리는 기존에 이미 구현됨. | 2026-06-11 | 2026-06-11 |
| ✅ | **MyPageScreen API 병렬화** | `loadMyPageData`를 `Promise.all`로 개선 — 프로필/팔로우/책이야기/서재/모임 5개 fetch 동시 실행. 내 알림 탭은 데이터 있을 때 재fetch skip. DoD: 마이페이지 로딩 시간 단축. | 2026-06-11 | 2026-06-11 |
| ✅ | **모임 화면 포커싱 동작 확인** | 탭 전환/공지상세/책장상세 진입 시 `focusGroupTitle` 스크롤 기준점을 모임 이름 Text → pillNav Y(`pillNavAnchorYRef`)로 통일. GroupBookshelfView 책 상세/REGULAR_GROUP 진입도 로컬 Y → `onScrollToPillNav()`로 교체해 픽셀 불일치 해소. 관련 문서: `../archive/(done)meeting-focus-scroll-mechanism.md`. DoD: 각 포커싱 시나리오에서 pillNav가 항상 화면 최상단. | 2026-06-10 | 2026-06-11 |
| ✅ | **UserProfileScreen 스켈레톤 UI 재검토** | 마이페이지(내 프로필)와 타인 프로필 양쪽에서 스켈레톤이 정상 노출되지 않는 문제 확인 및 수정. DoD: 두 화면 진입 시 로딩 중 스켈레톤 정상 표시. | 2026-06-10 | 2026-06-11 |
| ✅ | **모임 내부 스켈레톤 직접 테스트 필요** | 공지사항 리스트 스켈레톤(헤더 유지, 리스트 자리 4개 row) / 책장 스켈레톤(기수 버튼 chip + 2열 그리드) 실기기에서 정상 노출 확인. 탭 클릭별 테스트 지연 주입 후 공지/책장 모두 스켈레톤 정상 노출 확인 완료, 지연 제거. | 2026-06-11 | 2026-06-12 |
| ✅ | **모임 내부 화면 스켈레톤 UI 재검토** | GroupNoticeView / GroupBookshelfView 초기 로딩 스켈레톤 표시 이상 확인 및 수정. 실기기 확인 결과 이상 없음. | 2026-06-10 | 2026-06-12 |
| ✅ | **홈 스켈레톤 → 실제 콘텐츠 전환 시 레이아웃 shift 개선** | `userSkeletonRow`에 `height: 64` 고정. SubscribeUserItem 실제 높이(avatar 42 + paddingVertical 10×2 + border 1×2)에 맞춤. DoD: 스켈레톤 → 실제 전환 시 책이야기 목록 위치 변동 없음. | 2026-06-10 | 2026-06-10 |
| ✅ | **모임 내부 화면 스켈레톤 UI 구현** | `GroupNoticeView` 공지 탭 / `GroupBookshelfView` 책장 탭에 `isInitialLoading` prop 추가, `workspaceLoaded` 상태로 제어. `teamManageLoading` 텍스트 → 스켈레톤 rows 교체. `meetingStyles.ts`에 스켈레톤 스타일 추가. DoD: 모임 진입 시 각 탭 첫 로딩에 텍스트 대신 스켈레톤 표시. | 2026-06-10 | 2026-06-10 |
| ✅ | **UserProfileScreen 스켈레톤 UI 구현** | 서재(6 book card), 모임(3 group row), 구독목록(3 user row), 프로필 로딩 영역 스켈레톤 교체. DoD: 유저 프로필 진입 시 각 탭 로딩에 스켈레톤 표시. | 2026-06-10 | 2026-06-10 |
| ✅ | **채팅 기능 제거** | 모임 채팅 기능 제거 결정. `useMeetingChatStomp.ts` 삭제, `useBookshelfState`/`MeetingScreen`/`helpers`/`clubApi`/`types`/`iconMap`/`meetingStyles`에서 채팅 관련 코드 전면 제거. tsc 통과. | 2026-05-08 | 2026-06-01 |
| ✅ | **사용자 차단 화면 API 연결** | 차단 목록/차단/차단해제 화면을 실제 API와 연결. `fetchBlockedMembers`, `blockMember`, `unblockMember` 구현 완료. MyPageScreen(차단 목록/해제), UserProfileScreen(차단) 연결 완료. | 2026-05-20 | 2026-05-24 |
| ✅ | **책이야기 임시저장 API 연결** | 책이야기 저장 플로우에서 임시저장을 `status: DRAFT`로 연동. 기준 경로: `POST /api/book-stories`, `PATCH /api/book-stories/{bookStoryId}`. 완료 기준(DoD): 임시저장 생성/수정, 재진입 시 DRAFT 이어쓰기, 발행 시 `PUBLISHED` 전환까지 확인. | 2026-05-20 | 2026-05-21 |
| ✅ | **비밀번호 변경 후 자동 로그아웃** | `useAccountSettingsState.handleSubmitPasswordUpdate` 성공 시 `logout()` 호출 추가. 토스트 문구: "비밀번호가 변경되었습니다. 다시 로그인해 주세요." 완료 기준(DoD): 비밀번호 변경 성공 → 로그아웃 → 로그인 화면 진입. | 2026-05-08 | 2026-05-08 |
| ✅ | **헤더 알림 클릭 시 리스트 표출 효과 수정** | `AppHeader` 알림 아이콘 클릭 시 알림 리스트가 열리는 전환 효과/노출 타이밍을 자연스럽게 조정. `notiAnim` Animated.Value 추가, fade + translateY(-14→0) 애니메이션 적용(검색 드롭다운과 동일 패턴). 완료 기준(DoD): 클릭 직후 리스트가 튀거나 겹치지 않고 일관된 애니메이션으로 표시됨. | 2026-05-08 | 2026-05-08 |
| ✅ | **모임 방문하기 토스트 메시지 수정** | 모임 방문하기 액션에서 노출되는 토스트 문구를 상황에 맞게 정리. 완료 기준(DoD): 방문 성공/제한 상황의 문구가 사용자에게 명확하게 보임. | 2026-05-08 | 2026-05-08 |
| ✅ | **[MEET-SPLIT-01] MeetingScreen 분해 설계/경계 정의** | `src/screens/MeetingScreen.tsx`의 도메인 경계 + 목표 파일 구조 + 단계별 계획을 `docs/archive/(done)meet-split-design.md`에 확정. search/home/notice/bookshelf/regularMeeting/management 6개 도메인 정의. | 2026-05-06 | 2026-05-06 |
| ✅ | **[MEET-SPLIT-02] mapper/formatter 순수 함수 분리** | `src/screens/meeting/formatters.ts` (16개) + `src/screens/meeting/mappers.ts` (6개) 신규 생성. MeetingScreen.tsx에서 함수 본체 제거 → import로 교체. tsc 타입 에러 0건 확인. | 2026-05-06 | 2026-05-06 |
| ✅ | **[MEET-SPLIT-03] 공지/책장/채팅/관리 도메인 hook 분리** | `useNoticeState.ts`, `useBookshelfState.ts`, `useManagementState.ts` 신규 생성 완료. `GroupHomeView`에서 3개 hook 조립 완료. 중복 state/effect/handler 제거 완료(8099→4475줄). proxy ref 패턴으로 circular dependency 해결. `tsc --noEmit` 통과. | 2026-05-06 | 2026-05-07 |
| ✅ | **[MEET-SPLIT-04] 하위 View 컴포넌트 분리** | `GroupNoticeView.tsx`, `GroupBookshelfView.tsx`, `GroupManagementOverlay.tsx` 생성 완료. notice/bookshelf 탭 JSX 블록 교체, 관리 Modal 교체 완료. 미사용 파생 변수(`visibleNotices`, `visiblePageNumbers` 등) 정리. `tsc --noEmit` 통과. MeetingScreen.tsx: 10091줄 → 8099줄 (-1992줄). | 2026-05-06 | 2026-05-07 |
| ✅ | **[MEET-SPLIT-05] MeetingScreen 컨테이너 축소(조립 전용화)** | 중복 타입/함수 정의(781줄) 제거 후 `./meeting/types`, `./meeting/helpers`에서 import로 교체. 미사용 API import 정리(clubApi 대폭 축소, bookApi/date utils 제거). `tsc --noEmit` 통과. MeetingScreen.tsx: 10091줄 → 3988줄 (원본 대비 -60%). | 2026-05-06 | 2026-05-07 |
| ✅ | **프로젝트 루트 직속 `*.md` 파일 정리** | 루트 문서 4개(`font.md`, `hamburger.md`, `icon-usage.md`, `svg-usage.md`)를 `docs/documents`의 완료 문서로 이동. 루트에는 `README.md`, `AGENTS.md`, `CLAUDE.md`만 남았으며 활성 링크 참조 없음 확인 완료. | 2026-05-06 | 2026-05-06 |
| ✅ | **CLAUDE.md 생성 및 AGENTS.md 내용 이전** | 현재 Codex 전용인 `AGENTS.md`의 규칙(`/md`, `/cpa`, agent-log 순서 등)을 Claude Code가 자동으로 읽는 `CLAUDE.md`로 옮긴다. 완료 기준(DoD): 프로젝트 루트에 `CLAUDE.md`가 생성되고, Claude Code 대화 시작 시 규칙이 자동 적용되는 것을 확인. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-01] opacity 토큰화** | `interactionOpacity.ts` 신규 생성 및 pressed/pressedStrong/disabled/disabledSoft 4종 토큰 정의. 하드코딩 opacity 교체 완료. 완료 기준(DoD): `interactionOpacity.*` 외 임의 opacity 값 0건. 참고: `docs/archive/(done)ui-interaction-token-consistency.md` 2-1. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-02] motion 토큰화** | `src/theme/motion.ts` 신규 생성. `Animated.timing duration` 하드코딩 15건 → `motion.duration.*` 토큰 교체. loader 전용(240/700/1300)과 일반 전환(160/180/220) 분리. 완료 기준(DoD): 하드코딩 duration 0건. 참고: `docs/archive/(done)ui-interaction-token-consistency.md` 2-2. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-03] zIndex 레이어 스케일 토큰화** | `layers.raised/sticky/dropdown/overlay/toast` 5단계 상수 정의 후 9곳 하드코딩 교체. `zIndex: 999` → `layers.toast(60)` 교체. 완료 기준(DoD): 임의 zIndex 숫자 0건. 참고: `docs/archive/(done)ui-interaction-token-consistency.md` 2-3. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-04] hitSlop 기준 통일** | hitSlop 6 → 8 통일. 전수 확인 결과 이미 전부 8로 통일된 상태(6 0건). `IconButton` 기본값도 8로 고정 확인. 완료 기준(DoD): `hitSlop={6}` 0건. 참고: `docs/archive/(done)ui-interaction-token-consistency.md` 2-4. | 2026-05-06 | 2026-05-06 |
| ✅ | **[TOKEN-05] 버튼 height 4단계 고정** | `buttonSize.chip=28/icon=36/field=48/cta=52` 토큰 정의. MeetingScreen 버튼 14곳(chip/icon/field/cta) + MyPageScreen emailVerificationButton 교체. 30→28, 32→36 수렴. teamManageSaveButton minHeight 제거. 완료 기준(DoD): 버튼 height 4단계 토큰으로 수렴. 참고: `docs/archive/(done)ui-interaction-token-consistency.md` 2-5. | 2026-05-06 | 2026-05-06 |
| ✅ | **[ARCH-03] 도메인 로직 문자열 결합 해소** | `isMember` 계산을 표시 문자열 비교에서 enum 기반(`membershipStatus`)으로 전환. `helpers.ts`, `workspaceLoader.ts`, `meeting/types.ts` 경유로 raw status를 유지하도록 정리. 참고: `docs/archive/(done)app-architecture-03-domain-logic-coupled-to-display-strings.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-21] 로깅/관측 레이어 통일** | `src/utils/logger.ts` 신규: `createLogger(domain)` — 레벨별(debug/info/warn/error) + `__DEV__` 게이트 + 도메인 prefix. `useMeetingChatStomp` console 11건 → chatLog/stompLog 교체. `logMeetingAction` console 2건 → meetingLog 교체. 도메인 코드 직접 console 호출 0건. `tsc --noEmit` 통과. 참고: `docs/documents/app-standardization-21-logging-observability-layer.md` | 2026-05-08 | 2026-05-08 |
| ✅ | **[STD-22] CI 품질 게이트 파이프라인 고정** | `.github/workflows/ci.yml` 신규 생성. 트리거: `pull_request`/`push`(main/develop). 스텝: `npm ci` → `lint` → `typecheck` → `check:typography` → `check:spacing`. `doctor`(expo-doctor)는 CI 환경 부적합으로 제외. PR 머지 차단 강제 가능. 참고: `docs/archive/(done)app-standardization-22-ci-quality-gate-pipeline.md` | 2026-05-08 | 2026-05-08 |
| ✅ | **[ARCH-04] 서버 상태 오케스트레이션 hook/service 계층 분리** | `useMeetingDiscover.ts` 신규: myGroups/discoverGroups 상태 + 페이지네이션 루프 추출. `workspaceLoader.ts` 신규: `fetchAllClubBookshelvesWithCursor` + `fetchClubWorkspaceData`(공지 다중 페이지, 병렬 fetch 포함) 추출. `reloadClubWorkspace` 본체 → `fetchClubWorkspaceData` 호출로 교체. MeetingScreen.tsx: 3988→3665줄(-323줄). `tsc --noEmit` 통과. 참고: `docs/archive/(done)app-architecture-04-server-state-orchestration-in-ui.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-05] 비동기 레이스 방지 일관화** | `useMeetingDiscover`에 `discoverSeqRef`를 도입해 stale 응답의 state 반영을 차단. 검색/로딩 최신성 정책을 시퀀스 게이트로 통일. 참고: `docs/archive/(done)app-architecture-05-async-race-consistency.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-06] 네트워크 계층 책임 분리** | `requestJson` 기본값을 `suppressErrorToast: true`로 전환하고, 쓰기 경로에서만 명시적 토스트를 허용하도록 정리. `resolveErrorMessage` export 및 직접 `fetch` 예외 경로 주석 정비 완료. 참고: `docs/archive/(done)app-architecture-06-network-layer-responsibility-blur.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-07] API 타입 경계 강화** | `src/services/api/parseUtils.ts` 생성(`asRecord`, `toStringValue`, `toBooleanValue`, `toNumberValue`, `firstDefined`, `asStringArray`) 후 `clubApi` 중복 파서 제거/치환 완료. 참고: `docs/archive/(done)app-architecture-07-weak-api-type-boundary.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-08] 네비게이션 타입 안정성 강화** | `src/navigation/types.ts`에 `TabParamList`, `RootStackParamList` 정의. `MeetingScreen`의 `ParamListBase` 의존 제거 및 라우트 파라미터 타입 적용. 참고: `docs/archive/(done)app-architecture-08-navigation-type-safety-and-custom-stack.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-09] 이미지 업로드 파이프라인 공통화** | `src/utils/imageUpload.ts` 생성(`inferMimeType`, `uploadImageFromUri`, `pickAndUploadImage`) 후 Meeting/MyPage/Auth 중복 업로드 코드 치환 완료. 참고: `docs/archive/(done)app-architecture-09-duplicated-image-upload-pipeline.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **로그인/회원가입 성공 후 이전 화면 복귀** | `requireAuth(callback)` + `pendingActionRef` 패턴 전면 적용 완료. MyPageScreen(팔로워/팔로잉 목록, 설정)·AppHeader(책 좋아요 토글, 알림 열기) 4곳에 콜백 추가. StoryScreen 글 작성은 이미 적용돼 있었음. 로그인·회원가입 모두 `completeAuthFlow` 경로로 통일 확인. | - | - |
| ✅ | **[STD-10] 입력 레이어 통일(FormTextInput)** | 길이 제한 입력을 `FormTextInput` 기준으로 통일하고, `src/utils/input.ts` 데드코드 삭제. `GroupNoticeView` 댓글 입력 포함 raw `TextInput` 경로 정리 완료. 참고: `docs/archive/(done)app-standardization-10-input-layer-unification.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-11] Pressable 프리미티브 통일** | `MeetingListCard`, `MyGroupsDropdownCard` raw `Pressable`을 `FeedbackPressable`로 전환하고 미사용 `Pressable` import 정리. 참고: `docs/archive/(done)app-standardization-11-pressable-primitive-unification.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-12] 도메인 상수 중앙화** | `src/constants/validation.ts` (regex 4종) + `src/constants/defaultAssets.ts` (이미지 URI 3종) 신규 생성. AuthFlowScreen·MyPageScreen·HomeScreen·meeting/helpers·GroupManagementOverlay·MeetingListCard·MeetingScreen·UserProfileScreen 9개 파일 중복 선언 제거. 참고: `docs/archive/(done)app-standardization-12-domain-constants-centralization.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-13] cursor 페이지네이션 공통 유틸** | `src/utils/pagination.ts` — `collectAllCursorPages<Item>` 제네릭 함수 신규 생성. HomeScreen·NewsScreen·MyPageScreen·memberApi 4곳의 for-loop 대체. 참고: `docs/archive/(done)app-standardization-13-cursor-pagination-policy.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-14] 에러 리졸버 통합** | `src/utils/resolveApiError.ts` 신규 생성. 화면별 `resolve*ErrorMessage` 함수 제거 → `resolveApiError(error, overrides, fallback)` 공통 호출로 교체(HomeScreen·NewsScreen·StoryScreen·MyPageScreen 4곳). 참고: `docs/archive/(done)app-standardization-14-error-resolver-consolidation.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-15] edge swipe back hook 공통화** | `src/hooks/useEdgeBackSwipe.ts` 신규 생성. `requireHorizontalDominance` 옵션 포함. StoryScreen·NewsScreen·UserProfileScreen 3곳의 PanResponder 보일러플레이트 제거. 참고: `docs/archive/(done)app-standardization-15-edge-swipe-hook.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-16] 네비게이션 파라미터 헬퍼** | `navigateToHome.ts`에 `parsePositiveIntParam` + `findNavigatorWithRoute` 추가. MeetingScreen·NewsScreen·StoryScreen·UserProfileScreen 4곳 인라인 파싱/nav chain 탐색 제거. 참고: `docs/archive/(done)app-standardization-16-navigation-param-helper.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-17] 품질 게이트 확장** | BottomTabs.tsx 데드코드(`Placeholder`, `labelsMap`, unused imports/styles) 제거. `package.json`에 `lint` 스크립트(`eslint src --ext .ts,.tsx --max-warnings 0`) 추가. 참고: `docs/archive/(done)app-standardization-17-quality-gate-expansion.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[ARCH-10] 대형 화면 기능 경계 재정의** | `useNotificationState` + `useAccountSettingsState` 훅 신규 생성. `MyPageScreen` 알림/계정설정 도메인 추출(3567→3059줄). StoryScreen·AuthFlowScreen은 cross-domain coupling 과다로 스킵. `tsc --noEmit` 통과. 참고: `docs/archive/(done)app-architecture-10-screen-feature-composition-boundary.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-18] 도메인 레이블 딕셔너리 중앙화** | `src/constants/domain/category.ts` + `participant.ts` 신규 생성(LABEL↔CODE 양방향 맵). 5개 파일(MyPageScreen·UserProfileScreen·AuthFlowScreen·meeting/helpers·MeetingScreen·useManagementState)에서 인라인 Record 제거. `tsc --noEmit` 통과. 참고: `docs/archive/(done)app-standardization-18-domain-label-dictionary-centralization.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-19] 라우트 파라미터 소비/초기화 훅 통일** | `src/hooks/useConsumeRouteParam.ts` 신규 생성. NewsScreen·MeetingScreen·MyPageScreen(×2)·AppHeader 5곳의 one-shot param useEffect 보일러플레이트 제거. `parsePositiveIntParam` 시그니처를 `unknown`으로 넓힘. StoryScreen 복합 파라미터(openCompose+composeBook, openStoryId+openStoryFocus)는 결합 과다로 스킵. `tsc --noEmit` 통과. 참고: `docs/archive/(done)app-standardization-19-route-param-consume-reset-hook.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **[STD-20] 이메일 인증 플로우 공통 훅화** | `src/hooks/useEmailVerificationFlow.ts` 신규 생성(state: sent/verified/remainingSeconds/remainingText/sending/confirming, action: sendCode/confirmCode/reset). AuthFlowScreen에서 7개 상태·useMemo·타이머 useEffect·두 핸들러 제거 → 훅 적용. `useAccountSettingsState`도 동일하게 교체. 두 화면의 API 호출·카운트다운 정책이 단일 훅으로 통합. `tsc --noEmit` 통과. 참고: `docs/archive/(done)app-standardization-20-email-verification-flow-shared-hook.md` | 2026-05-07 | 2026-05-07 |
| ✅ | **후속 표준화/아키텍처 문서 6건 작성** | 완료된 `(done)` 범위를 제외한 남은 구조 개선 과제를 문서화: `app-architecture-10`, `app-standardization-18~22` 신규 작성. 각 문서에 코드 근거/리스크/개선가이드/DoD 포함. | 2026-05-07 | 2026-05-07 |

---

## 📝 검토 대기 항목

| 상태 | 항목 | 배경 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ |
| ✅ | **입력 필드 글자 수 카운터 추가 적용** | 장문 입력 5종(발제/한줄평, 책이야기 본문, 모임 소개글(생성/수정), 프로필 소개글(회원가입/프로필편집))에 `N/max` 카운터 적용 완료. | - | - |
| ✅ | **토스트 문구 어투 통일 (~해주세요 → ~합니다 체)** | `showToast` 호출 중 "~해주세요." 끝나는 문구 약 71건. 입력 안내형(`닉네임을 입력해주세요`) → `~해야 합니다` 또는 `~이 필요합니다` 체로 통일. 재시도형(`다시 시도해주세요`) → `다시 시도해 주십시오` 체로 분리 처리. 103건 적용 완료(12개 파일). | - | - |

---

## 🔎 유관 확인

> 최근 반영한 변경사항과 배포/실기기에서 함께 확인할 포인트

| 상태 | 항목 | 관련 변경 / 확인 포인트 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ |
| ✅ | **책이야기 탭 무한스크롤 중복 요청 방지** | 사용자 실기기 통과 확인(2026-07-06). 어디서: 책이야기 탭 `StoryScreen`. 무엇을: ref 기반 in-flight 락, `onEndReached` 짧은 중복 차단, footer 재시도 상태를 추가했다. 왜: 배포 앱에서 같은 `cursorId` 요청이 동시에 여러 번 나가 429/과다 요청 오류가 날 수 있어서. DoD: 빠르게 하단 스크롤해도 같은 커서 요청이 중복 발사되지 않고, 연속 오류 토스트가 재현되지 않음. | 2026-07-03 | 2026-07-06 |
| ✅ | **모임 가입신청 폼 버튼 정리** | 사용자 실기기 통과 확인(2026-07-06). 어디서: 모임 카드 가입신청 폼 `MeetingListCard`. 무엇을: 하단 액션을 `가입 신청하기`와 `닫기`로 분리했다. 왜: 신청 폼을 열었을 때 닫는 버튼이 없어 되돌아가기 어려웠기 때문. DoD: `닫기`는 신청 없이 폼만 닫고, `가입 신청하기`는 사유 입력 후 정상 제출됨. | 2026-07-03 | 2026-07-06 |
| ✅ | **모임 가입신청 입력칸 키보드 보정** | 사용자 실기기 통과 확인(2026-07-06). 어디서: 모임 카드 가입신청 사유 입력칸. 무엇을: 입력칸 실측 위치 기준으로 스크롤 보정해 입력박스가 키보드 위에 오도록 수정했다. 왜: 기존 포커싱 스크롤은 기기별 화면 높이/키보드 높이에 따라 위치가 어긋날 수 있어서. DoD: iOS/Android 여러 화면 높이에서 입력칸, 카운터, 신청/닫기 버튼이 키보드에 가리지 않음. | 2026-07-03 | 2026-07-06 |
| ✅ | **모임 수정 이름 중복확인 적용** | 사용자 실기기 통과 확인(2026-07-06). 어디서: 모임 상세 > 운영진 관리 > 모임 수정. 무엇을: 모임명 중복확인을 수정 플로우에도 연결하고, 기존 이름은 변경 없음으로 통과 처리했다. 왜: 생성에는 중복확인이 있지만 수정에는 없어 중복 이름 저장 가능성이 있었기 때문. DoD: 기존 이름 저장 가능, 새 이름은 중복확인 전 저장 차단, 중복 이름은 안내 문구로 차단됨. | 2026-07-03 | 2026-07-06 |
| ⬜ | **추가 문구/i18n 및 품질 게이트 확인** | 어디서: 가입신청/책이야기 로드 실패 등 신규 사용자 문구. 무엇을: 한국어/영어 문자열을 추가하고 `npm run check` 통과 상태로 커밋했다. 왜: 새 버튼/오류 상태가 다국어 전환과 정적 검사에서 누락되지 않게 하기 위해서. DoD: 언어 전환 시 문구 키 누락이 없고 TypeScript/품질 게이트가 계속 통과함. | 2026-07-03 | 2026-07-03 |

---

## 🧪 직접 테스트 필요 항목

> 코드를 기계로 확인할 수 없어서, 실제 앱을 켜서 눈으로 봐야 하는 것들

| 상태 | 항목 | 어디서 테스트하나 | 뭘 확인하나 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **조 관리 드래그 자동 스크롤 QA** | 모임 → 책장 → 정기모임 → 조 관리하기 | 사용자 실기기 통과 확인(2026-06-27). 하단 회원을 상단에 유지하면 1조까지, 상단 회원을 하단에 유지하면 미배정까지 연속 이동함. 상단 빠른 조 칩/본문 조 카드 드롭, 활성 테두리, 경계 정지, 드래그 취소 시 원래 조 유지, 탭 선택 후 조 버튼 이동 정상. | 2026-06-22 | 2026-06-27 |
| ✅ | **조별 채팅 재도입 실기기 QA** | iOS/Android 두 계정 → 모임 → 책장 → 정기모임 → 조 상세 → 채팅 FAB | 사용자 실기기 통과 확인(2026-06-28). 일반 회원/운영진 조 선택, 최근 메시지/과거 로드, 실시간 송수신·중복 방지·재연결, 작성자/메시지 인라인 메뉴, 복사/신고, 키보드·safe-area·뒤로가기 동작 정상. | 2026-06-22 | 2026-06-28 |
| ⬜ | **플레이스토어 Android 실기기 QA** | Android 폰/태블릿 portrait, 가능하면 내부 테스트 트랙 설치본 | 회원가입/로그인/프로필 이미지 선택/홈/모임/책이야기/마이페이지 핵심 플로우가 정상인지 확인. 특히 프로필 이미지 선택 시 마이크/카메라/전체 사진 접근 권한 팝업이 뜨지 않고 시스템 picker만 열리는지, 태블릿에서 텍스트 잘림·모달 폭·바텀시트 safe-area·이미지 뷰어가 깨지지 않는지 확인. | 2026-06-16 | 2026-06-16 |
| ✅ | **편집 중 이탈 경고 통일 QA** | 공지 작성/수정, 발제/한줄평 작성/수정, 모임 정보 수정, 책장 생성/수정, 책이야기 글/댓글/대댓글, 마이페이지 이메일/비밀번호 변경, 회원가입 프로필 단계 | 실기기 통과 확인. 변경 없이 닫기 → 경고 없음, 변경 후 닫기/뒤로가기/탭 전환/Android 백 → 경고, 원복 후 닫기 → 경고 없음 기준 정상. | 2026-06-14 | 2026-06-14 |
| ⬜ | **뒤로가기 액션 확인** | 책이야기 상세 / 모임 상세 / 마이페이지 설정 / 회원가입 각 단계 | 하드웨어 뒤로가기(Android) 및 스와이프 백(iOS)이 각 화면에서 의도한 화면으로 이동하는지, 작성 중 내용이 있을 때 이탈 경고가 뜨는지, 모달 열린 상태에서 뒤로가기 시 모달만 닫히는지 확인. | 2026-06-14 | 2026-06-14 |
| ✅ | **앱 처음 켤 때 로딩 화면** | 앱을 완전히 종료 후 다시 실행 | 책모 로딩 화면이 뜨다가, 네트워크 응답 끝나는 시점에 자연스럽게 사라지는지. 전에는 무조건 1.5초였는데 이제 서버 응답 기준으로 바뀜 → 너무 빨리 사라지거나 아예 안 사라지면 이상한 것. | - | 2026-05-08 |
| ✅ | **로그인 안 된 상태에서 로그인 필요 기능 누를 때** | 비로그인 상태로 구독, 좋아요 등 버튼 클릭 | 책모 로딩 화면이 잠깐 뜨면서(약 1.0초) "로그인이 필요합니다" 안내가 보이고, 그 뒤 로그인 화면으로 넘어가는지. (`AUTH_TRANSITION_MS=1000ms` 기준) | - | 2026-05-08 |
| ✅ | **간격 통일 이후 컴포넌트 확인 QA** | 전체 화면 직접 탐색 | `spacing.xs / 2` → `spacing.xxs` 교체(78건) 이후 실기기에서 카드·입력폼·모달·리스트 등 주요 컴포넌트의 내부 간격이 시각적으로 이상하지 않은지 확인. | - | 2026-05-08 |
| ✅ | **신고 유형 칩 모양 QA** | 책이야기 상세 → 신고 / 내 페이지 → 신고 | StoryScreen `reportTypeButton`(radius.sm)과 MyPageScreen `reportTypeChip`(radius.sm으로 변경)이 동일하게 직각에 가까운 칩 모양으로 보이는지 확인. | - | 2026-05-08 |
| ✅ | **책이야기 구독 버튼 모양 QA** | 책이야기 카드(BookStoryCard) 탭 탐색 | `subscribeChip` radius.lg→sm 변경으로 FeedCard의 subButton과 동일한 덜 둥근 모양인지 확인. | - | 2026-05-08 |
| ✅ | **내 페이지 카테고리 칩 모양 QA** | 내 페이지 → 프로필 편집 → 독서 취향 | `categoryChip` radius.sm→lg 변경으로 AuthFlowScreen 회원가입 장르 선택칩과 동일하게 둥근 chip 모양인지 확인. | - | 2026-05-08 |
| ✅ | **기본 프로필 색상 선택 제거** | 회원가입(profileExtra) / 마이페이지 프로필 편집 | 색상 선택 모달 제거. "기본 프로필" 클릭 시 즉시 고정 색상(subbrown3) 적용. | 2026-05-08 | 2026-06-04 |
| ✅ | **모임 책장 세션·그룹 필터 칩 QA** | 모임 → 책장 탭 | `bookshelfSessionChip`(radius.md→sm)과 `bookshelfGroupChip`(radius.sm) 두 필터가 동일한 모양인지 확인. | - | 2026-05-08 |
| ✅ | **책이야기 피드 스크롤 끝까지 (데이터 쌓이고 확인 필요)** | 책이야기 탭에서 맨 아래까지 스크롤 | 현재 데이터량 부족으로 실기기 확인 보류. 데이터가 충분히 쌓인 뒤, 다음 페이지 불러올 때 맨 아래에 "불러오는 중..." 텍스트가 잠깐 보이는지 확인. | - | - |
| ✅ | **입력 한도 토스트** | 닉네임·이름·소개·모임이름·소개·지역·링크·신청사유·신고내용 각 필드에서 한도 초과 입력 시도 | `maxLength` 초과 입력이 차단되고 `"입력 가능한 길이를 초과했습니다."` 토스트가 노출되는지 확인. 코드 전수 확인 완료: NICKNAME(AuthFlow:947) / USER_NAME(AuthFlow:991) / USER_DESCRIPTION(AuthFlow:977, MyPage:1454) / CLUB_NAME(Meeting:3256) / CLUB_DESCRIPTION(Meeting:3300) / CLUB_REGION(Meeting:3485) / CLUB_LINK_LABEL(Meeting:3529) / CLUB_LINK_URL(Meeting:3544) / APPLY_REASON(MeetingListCard:122) / REPORT_CONTENT(ReportMemberModal:159) 10개 필드 모두 FormTextInput+maxLength 연결 확인. 실기기 QA 잔여. | - | 2026-05-08 |
| ✅ | **로그인 완료 직후 전환 + 이전 화면 복귀** | 책이야기 작성 버튼 클릭 → 로그인/회원가입 성공 | 로그인 완료 후 작성 화면이 자동으로 열리는지. 팔로워/팔로잉 목록, 설정, 책 좋아요도 동일 확인. | - | - |
| ✅ | **로그아웃 직후 전환** | 내 페이지 → 설정 → 로그아웃 | 로그아웃 확인 후 홈 탭으로 이동하는지. (`navigateToHome` 적용 완료, 실기기 확인 완료) | - | - |
| ✅ | **모임 탭바 포커싱 동작 통일 확인** | 모임 진입 → 모임 홈 / 공지사항 / 책장 탭 전환 | 포커싱 기준을 pillNav → 모임 이름 Text(`groupTitleAnchorYRef`)로 변경, 모임 이름이 화면 상단에 보이게 통일. 모임홈/공지/책장 탭 실기기 통과 확인. 책장 상세 진입은 `< 책장` breadcrumb 기준 포커싱으로 별도 분리 완료. | 2026-06-11 | 2026-06-13 |

---

## 🔤 글자수 테스트 육안

> 글자수 제한, 긴 입력 내부 스크롤, 초과 토스트가 실기기에서 실제로 보이는지 확인하는 항목

| 상태 | 항목 | 어디서 | 뭘 확인하나 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **책이야기 본문 긴 입력** | 책 이야기 > 책이야기 작성/수정 > 본문 입력칸 | 사용자 실기기 통과 확인(2026-06-28). 긴 본문 입력 시 내부 스크롤, 마지막 줄/커서, 카운터, 초과 토스트 가시성 정상. BE는 본문 길이 제한 없음(`TEXT`), RN은 5000자 제한으로 문서화 유지. | 2026-06-17 | 2026-06-28 |
| ✅ | **신고 내용 긴 입력/초과 토스트** | 프로필/사용자/댓글 메뉴 등 > 신고하기 > 신고 내용 입력칸 | 사용자 실기기 통과 확인(2026-06-28). 긴 신고 내용 입력/붙여넣기 시 내부 스크롤과 초과 토스트가 키보드에 가리지 않음. | 2026-06-17 | 2026-06-28 |
| ✅ | **모임 정보 수정 소개글 초과 토스트** | 모임 > 모임 상세 > 관리 > 모임 정보 수정 > 모임 소개글 입력칸 | 사용자 실기기 통과 확인(2026-06-28). 소개글 초과 토스트, 마지막 줄/커서 가시성 정상. | 2026-06-17 | 2026-06-28 |
| ✅ | **발제·한줄평 초과 토스트 밝기** | 모임 > 모임 상세 > 책장/발제·한줄평 작성 > 발제 내용 또는 한줄평 내용 입력칸 | 사용자 실기기 통과 확인(2026-06-28). 발제·한줄평 각각 초과 토스트와 내부 스크롤 정상. | 2026-06-17 | 2026-06-28 |
| ✅ | **공지 제목 초과 토스트** | 모임 > 모임 상세 > 공지 작성/수정 > 제목 입력칸 | 사용자 실기기 통과 확인(2026-06-28). 제목 초과 토스트, 내부 스크롤, 카운터 가시성 정상. | 2026-06-17 | 2026-06-28 |
| ✅ | **공지 내용 초과 토스트** | 모임 > 모임 상세 > 공지 작성/수정 > 내용 입력칸 | 사용자 실기기 통과 확인(2026-06-28). 내용 초과 토스트, 부모 스크롤 충돌 여부, 마지막 줄/커서 가시성 정상. | 2026-06-17 | 2026-06-28 |

---

## 👀 버그수정 육안 확인

> 버그수정/기능변경 후 실기기에서 눈으로 확인해야 하는 체크리스트 (공지사항 + 모임 생성 + 회원가입 등)

| 상태 | 항목 | 어디서 | 뭘 확인하나 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **모임 가입신청 입력칸 키보드 포커싱** | 모임 > 모임 카드 > 가입신청하기 > 신청 사유 입력칸 | 사용자 실기기 통과 확인(2026-07-01). 가입신청하기 클릭 시 신청 사유 입력칸 자동 포커스, 제출 버튼 키보드 위 노출, 열림 중 끊김 없이 포커싱 동작 정상. | 2026-06-17 | 2026-07-01 |
| ✅ | **공개모임 가입 즉시 반영 QA** | 모임 > 공개모임 카드 > 가입신청하기 | 사용자 실기기 통과 확인(2026-06-27). 공개모임 가입 성공 직후 카드 문구가 `가입 완료되었습니다`로 바뀌고, 새로고침 없이 내 모임 목록에 나타남. 같은 카드/상세 진입 시 신청 완료가 아니라 가입 완료 상태로 표시됨. 비공개모임은 `신청 완료되었습니다` 상태 유지. | 2026-06-26 | 2026-06-27 |
| ✅ | **모임 생성·수정·삭제 목록 즉시 반영 QA** | 모임 > 모임 생성 / 모임 상세 > 운영진 관리 > 모임 수정·삭제 | 사용자 실기기 통과 확인(2026-06-27). 모임 생성 후 내 모임 목록에 새 모임이 나타나고, 수정 후 상세/내 모임/검색 카드 표시가 동기화됨. 삭제 후 상세가 닫히고 목록에서 사라지며 재진입 404 없음. | 2026-06-26 | 2026-06-27 |
| ✅ | **책 좋아요 화면 간 동기화 QA** | 헤더 책 검색 / 마이페이지 > 내 서재 | 사용자 실기기 통과 확인(2026-06-27). 헤더 검색 결과·책 상세에서 내 서재 담기/제거 시 마이페이지 내 서재가 즉시 추가/삭제되고, 마이페이지에서 좋아요 취소 시 카드가 사라지며 헤더 하트 상태도 같이 바뀜. | 2026-06-26 | 2026-06-27 |
| ✅ | **책이야기 상세 바텀시트 메뉴 QA** | 책이야기 상세 → 우측 `...` 메뉴 | 글 단위 메뉴가 앵커 메뉴가 아니라 하단 바텀시트로 열리는지 확인. 내 글은 수정/삭제, 타인 글은 신고/공유가 보이고, 백드롭 탭/Android 뒤로가기로 닫히며, 수정·삭제·신고·공유 액션이 기존처럼 동작해야 함. 사용자 실기기 확인 통과. | 2026-06-15 | 2026-06-15 |
| ✅ | **책이야기 댓글 메뉴 유지 QA** | 책이야기 상세 → 댓글/대댓글 `...` 메뉴 | 댓글·대댓글처럼 작은 대상의 빠른 액션은 기존 앵커 메뉴로 유지되는지 확인. 댓글 위치 근처에 메뉴가 뜨고, 대댓글 쓰기/수정/삭제/신고 액션과 2뎁스 제한이 기존처럼 동작해야 함. 사용자 실기기 확인 통과. | 2026-06-15 | 2026-06-15 |
| ✅ | **공지 상세 바텀시트 메뉴 QA** | 모임 → 공지사항 → 공지 상세 `...` 메뉴 | 공지 단위 메뉴가 공용 바텀시트로 열리는지 확인. 운영진은 수정/삭제, 일반 사용자는 신고가 보이고, 삭제 선택 시 즉시 삭제되지 않고 `Alert.alert` 확인창이 먼저 떠야 함. 사용자 실기기 확인 통과. | 2026-06-15 | 2026-06-15 |
| ✅ | **책장 상세 바텀시트 메뉴 QA** | 모임 → 책장 탭 → 책장 상세 우측 `...` 메뉴 | 기존 텍스트 링크 대신 우측 `...` 버튼 하나가 보이고, 바텀시트에 책장 수정/책장 삭제/조 관리하기가 표시되는지 확인. 수정 진입, 삭제 확인창, 삭제 후 목록 갱신, 조 관리 진입이 정상이어야 함. 사용자 실기기 확인 통과. | 2026-06-15 | 2026-06-15 |
| ✅ | **발제·한줄평 메뉴 유지 QA** | 모임 → 책장 상세 → 발제/한줄평 카드 `...` 메뉴 | 발제·한줄평 카드 메뉴는 바텀시트로 바뀌지 않고 기존 앵커 메뉴로 열리는지 확인. 작성자 기준 수정/삭제, 타인 글 신고 액션이 기존처럼 동작해야 함. 사용자 실기기 확인 통과. | 2026-06-15 | 2026-06-15 |
| ✅ | **공용 바텀시트 레이아웃 QA** | 책 검색 바텀시트 / 책이야기 메뉴 / 공지 메뉴 / 책장 메뉴 | 사용자 실기기 통과 확인. 공용 `BottomSheet` 기본 스타일 적용 후 하단 safe-area, 백드롭 어둡기, 상단 radius, 핸들 위치, 항목 간격 정상. 책 검색 키보드 상태에서도 입력창과 결과 리스트 가림 없음. | 2026-06-15 | 2026-06-26 |
| ✅ | **공지 태그 색상 통일** | 모임 → 공지사항 리스트 / 공지 상세 | 실기기 통과 확인. 리스트와 상세보기의 태그 색이 동일함(고정=핀, 일반=분홍, 투표=파랑, 모임=주황). | 2026-06-14 | 2026-06-14 |
| ✅ | **공지 작성/수정 입력·투표 QA** | 모임 → 관리 → 공지 작성/수정 | 실기기 통과 확인(2026-06-14). 투표 날짜 오프셋 없는 `LocalDateTime` 전송으로 투표 있는 공지 등록/수정 정상, 투표 기간 네이티브 datepicker, 투표 항목 최대 6개(6개면 "항목 추가" 숨김), "투표가 있는 공지사항은 수정이 불가합니다" 빨간 문구, 제목/내용 입력 진동 없음, 제목 40자/내용 1000자 제한·토스트, 투표 항목 3번부터 X 삭제 모두 정상. | 2026-06-14 | 2026-06-27 |
| ✅ | **공지 내용 글자수 카운터** | 모임 → 관리 → 공지 작성 | 실기기 통과 확인. 내용 카운터 위치/실시간 갱신, 1000자 제한/토스트, 내부 스크롤 및 커서 이탈 없음 정상. | 2026-06-14 | 2026-06-27 |
| ✅ | **공지 책장 첨부 플로우** | 모임 → 관리 → 공지 작성 → 책장 연결 | 실기기 통과 확인. "책장 선택" 인라인 오버레이, 배경 탭 닫힘/가로 스크롤, 미선택 등록 시 토스트 + 선택창 자동 오픈 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **공지 등록/수정/삭제 후 동작** | 모임 → 공지 작성·수정·삭제 | 실기기 통과 확인. 완료 후 공지 목록 탭 이동 + 상단 스크롤, 수정 데이터 복원, 삭제/등록 후 목록 새로고침 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **상단 고정 공지 말줄임** | 모임 홈 상단 고정 공지 | 실기기 통과 확인. 고정 공지 제목이 길 때 1줄 말줄임 처리 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **운영진 관리 바텀시트 제스처** | 모임 → 운영진 관리 메뉴 | 실기기 통과 확인. 메뉴 스크롤, 위로 끌어 확장, 아래로 당길 때 깜빡임 없이 닫힘 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **모임 생성 공개여부 안내 문구** | 모임 생성 → 2단계(공개여부) | 실기기 통과 확인. 공개/비공개 카드 아래 안내 문구와 간격 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **회원가입 기본 프로필 버튼 상태** | 회원가입 → 프로필 설정(5/6) | 실기기 통과 확인. 기본 프로필 버튼 초기/선택/사진 업로드 후 상태 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **책이야기 글 작성/수정 화면 꺼짐** | 책이야기 상세 → 내 글 메뉴 → 수정하기 / 글 작성·수정 저장 | 실기기 통과 확인(2026-06-14). 수정 화면 진입 시 앱 꺼짐 없고, 본문 입력과 수정 저장 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **책이야기 댓글/대댓글 2뎁스 제한** | 책이야기 상세 → 댓글 메뉴 | 실기기 통과 확인. 일반 댓글에는 대댓글 쓰기가 보이고, 대댓글에는 다시 대댓글 쓰기가 보이지 않음. 댓글/대댓글 수정·취소도 화면 꺼짐 없이 정상. | 2026-06-14 | 2026-06-14 |
| ✅ | **모임 정보 수정 사진/책장 버튼 상태** | 모임 → 운영진 관리 → 모임 수정 / 책장 생성·수정 | 실기기 통과 확인(2026-06-14). 모임 정보 수정 사진 UI 정상. 책장 `meetingTime` 오프셋 없는 `LocalDateTime` 포맷 수정 후, 모임 날짜를 넣고 책장 생성/수정 시 등록·저장 정상 동작. | 2026-06-14 | 2026-06-14 |
| ✅ | **책장 수정 진입 크래시** | 모임 → 책장 상세 → 책장 수정 | 실기기 통과 확인(2026-06-14). 책장 수정 진입 시 앱 꺼짐 없고, 첫 렌더 깜빡임 없이 수정 화면 정상, 저장/삭제 버튼 정상. | 2026-06-14 | 2026-06-14 |

---

## 7/2 QA 이후 수정한것들 육안 테스트

> 2026-07-02 QA 이후 RN에 반영했지만 아직 사용자가 직접 확인하지 않은 항목. 전부 실제 배포/실기기 기준으로 확인한다.

| 상태 | 항목 | 어디서 | 뭘 확인하나 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **언어 설정/영문 문구 전환** | 마이페이지 → 설정 → 언어 설정 | 사용자 요청으로 다른 언어 전환은 추후 업데이트로 보류. 언어 항목 클릭 시 `다른 언어 버전은 준비중입니다!` 토스트만 뜨고, 언어 선택 상세 메뉴로 진입하지 않음. | 2026-07-03 | 2026-07-06 |
| ⬜ | **모임 채팅 웹소켓 배포 앱 동작** | 모임 → 책장 → 정기모임 → 조 상세 → 채팅 FAB | 시뮬레이터가 아니라 배포 앱에서 조 채팅 접속, 최근 메시지 로드, 실시간 송수신, 재연결, 과거 메시지 더 불러오기가 정상이고 인증/권한 오류가 반복되지 않음. | 2026-07-03 | 2026-07-03 |
| ✅ | **모임 수정 이름 중복확인** | 모임 상세 → 운영진 관리 → 모임 정보 수정 | 사용자 실기기 통과 확인(2026-07-06). 기존 이름은 바로 저장 가능, 새 이름은 중복확인 전 저장 차단, 중복 이름은 안내 문구로 차단, 사용 가능한 이름은 저장 후 상세/목록에 즉시 반영됨. | 2026-07-03 | 2026-07-06 |
| ✅ | **모임 가입신청 폼 버튼/키보드** | 모임 탭 → 비공개 모임 카드 → 가입신청하기 | 사용자 실기기 통과 확인(2026-07-06). 폼 버튼이 `가입 신청하기`/`닫기`로 보이고, 닫기는 신청 없이 폼만 닫음. 신청 사유 입력 시 어떤 기기에서도 입력박스와 버튼이 키보드 위에 보임. | 2026-07-03 | 2026-07-06 |
| ✅ | **책이야기 탭 무한스크롤 중복 요청 방지** | 책이야기 탭 → 하단까지 빠르게 스크롤 | 사용자 실기기 통과 확인(2026-07-06). 같은 커서 요청이 연속으로 중복 발사되지 않고, 429/요청 과다 오류 토스트가 반복되지 않음. 실패 시 하단 재시도 상태가 과하게 튀지 않음. | 2026-07-03 | 2026-07-06 |
| ⬜ | **앱 로그인 세션 유지** | 로그인한 상태 → 앱 백그라운드/재실행/약 1시간 후 재접속 | 로그인 상태가 의도치 않게 풀리지 않고, 앱 로그인 경로에서 refresh/restore 후 홈·마이페이지·인증 필요 API가 정상 동작함. | 2026-07-03 | 2026-07-03 |
| ✅ | **알림 클릭 이동 경로** | 마이페이지/헤더 → 알림 전체보기 → 각 알림 클릭 | 사용자 실기기 통과 확인(2026-07-06). `LIKE`/`COMMENT`는 책이야기 상세, `FOLLOW`는 프로필, `JOIN_CLUB`은 모임 홈, `CLUB_MEETING_CREATED`는 정기모임/책장 상세, `CLUB_NOTICE_CREATED`는 공지 상세로 이동. 삭제/탈퇴 대상은 적절한 토스트로 처리됨. | 2026-07-03 | 2026-07-06 |
| ⬜ | **생성 시간 상대표기 갱신** | 알림 목록, 책이야기 목록/상세/댓글 등 `방금 전` 표시 화면 | 방금 생성한 책이야기/댓글/알림이 `9시간전`처럼 밀리거나 `방금 전`에 고정되지 않고, 실제 경과 시간으로 표시됨. 1분 이상 지난 항목은 `1분전` 이상으로 바뀌며, 페이지 재진입/새로고침/포커스 복귀 시 현재 시각 기준으로 다시 계산됨. | 2026-07-03 | 2026-07-06 |
| ⬜ | **마이페이지 신고 관리 매핑** | 마이페이지 → 설정 → 신고 관리 | 내가 신고한 대상 목록이 비어 있지 않게 표시되고, 신고 대상/사유/날짜가 올바르게 매핑됨. API 실패가 `신고한 내역이 없습니다.`로 숨겨지지 않고 오류 안내로 보이며, 신고 대상 프로필/콘텐츠 진입이 가능한 경우 정상 이동함. | 2026-07-03 | 2026-07-06 |
| ✅ | **타인 프로필 책이야기 진입/복귀** | 다른 사람 프로필 → 책이야기 탭 → 책이야기 카드 클릭 | 사용자 실기기 통과 확인(2026-07-06). 책이야기 상세가 정상 열리고, 뒤로가기/닫기 시 엉뚱하게 책이야기 메인 탭으로 튕기지 않고 원래 타인 프로필 흐름으로 복귀함. | 2026-07-03 | 2026-07-06 |
| ⬜ | **마이페이지 프로필 편집 키보드/개행** | 마이페이지 → 프로필 편집 | 키보드가 열린 상태에서도 닉네임 중복확인/저장 버튼이 터치되고, 소개글 입력에서 엔터 개행이 가능하며 텍스트/하단 카운터가 잘리지 않음. | 2026-07-03 | 2026-07-03 |
| ⬜ | **Android 공지 투표 옵션 터치/상단 여백** | Android → 모임 상세 → 운영진 관리 → 공지 작성 → 투표 | `실명`과 `중복 가능` 칩이 키보드 상태에서도 선택되고, 공지 작성 화면이 처음부터 아래로 밀려 보이지 않음. 투표 저장 payload가 의도한 옵션으로 반영됨. | 2026-07-03 | 2026-07-03 |
| ✅ | **모임 정보 수정 문의하기 링크** | 모임 상세 → 운영진 관리 → 모임 정보 수정 → 문의하기 링크 | 사용자 실기기 통과 확인(2026-07-06). 기존 문의 링크가 수정 화면에 보이고, 링크 추가/수정/삭제 후 저장하면 모임 상세의 `문의하기` 모달에도 그대로 반영됨. 최대 4개/label 20자/link 100자 제한과 빈 링크 제외가 정상 동작함. | 2026-07-03 | 2026-07-06 |
| ✅ | **소식 상세 제목/작성일/내용 배치** | 소식 탭 → 소식 상세 조회 | 사용자 실기기 통과 확인(2026-07-06). 히어로 이미지 위에 작성일이 겹치지 않고, 상세 본문 영역에서 `소식 제목` → `작성일` → `내용` 순서로 보임. 작성일 텍스트가 잘리지 않고 한국어/영어 전환 시 문구가 정상 표시됨. | 2026-07-03 | 2026-07-06 |
| ⬜ | **신고 작성 중 닫기 확인창** | 모임 상세/공지/댓글/발제/채팅 등 → 신고하기 → 내용 입력 후 `X`/바깥 영역/Android 뒤로가기 | 신고 내용을 입력한 상태에서 닫으려 하면 `현재 페이지는 저장되지 않습니다.` 확인창이 뜨고, `취소`는 신고 모달 유지, `닫기`는 모달 닫힘. 내용이 비어 있으면 기존처럼 바로 닫힘. | 2026-07-06 | 2026-07-06 |
| ⬜ | **신고하기 접수/신고 관리 반영** | 책이야기/댓글/모임/공지/발제/채팅 등 → 신고하기 → 마이페이지 → 신고 관리 | 신고 등록 성공 토스트가 뜨고, 마이페이지 신고 관리에 방금 신고한 대상/사유/날짜가 표시됨. 대상이 삭제됐거나 BE가 표시 정보를 만들지 못하는 경우 빈 목록으로 숨기지 않고 오류 안내가 보임. | 2026-07-06 | 2026-07-06 |
| ⬜ | **모임 가입 거절 후 재신청 버튼 활성화** | 모임 가입 신청 → 운영진이 거절 → 신청자 계정으로 모임 탭 복귀 | 거절된 모임 카드가 `신청완료` 비활성 상태로 남지 않고, 모임 탭 복귀/새로고침 직후 `가입 신청하기` 버튼이 다시 활성화됨. 앱을 강제 종료했다 켜지 않아도 재신청 폼을 바로 열 수 있음. | 2026-07-06 | 2026-07-06 |
| ✅ | **모임 방문하기 비로그인 취소 복귀** | 모임 탭 → 비로그인 상태 → 모임 카드 `방문하기` → 로그인 화면 → `나가기` | 사용자 실기기 통과 확인(2026-07-06). 로그인 화면을 닫으면 모임 상세/방문 페이지가 남지 않고 모임 검색 화면이 유지됨. 로그인 성공 시에만 선택했던 모임 홈으로 이동함. | 2026-07-06 | 2026-07-06 |
| ✅ | **책이야기 상세 본문 말미 잘림** | 책이야기 탭 → 긴 본문 책이야기 상세 | 사용자 실기기 통과 확인(2026-07-06). DB/웹 원문과 동일하게 본문 마지막 문구까지 표시되고, 하단 탭바/댓글 영역/스크롤 컨테이너에 가려져 마지막 단어가 잘리지 않음. | 2026-07-06 | 2026-07-06 |
| ⬜ | **책 검색 게스트 인증 모달 통일** | 비로그인 상태 → 책 검색 → 검색 결과/상세/추천 책의 하트 또는 글 작성 버튼 | 하트 클릭 시 토스트만 뜨지 않고 로그인 모달이 열림. 검색 2뎁스 결과/상세에서 로그인 `X`를 누르면 직전 검색 화면으로 돌아오고, 글 작성 버튼도 책이야기 탭으로 먼저 튕기지 않고 현재 책 검색 화면 위에서 로그인 모달이 열림. 로그인 성공 시 하트/글 작성 동작이 이어짐. | 2026-07-06 | 2026-07-06 |
| ✅ | **마이페이지 내 책이야기 상세 복귀** | 마이페이지 → 내 책 이야기 → 발행된 책이야기 카드 → 상세 → 뒤로가기/목록으로 | 사용자 실기기 통과 확인(2026-07-06). 상세에서 뒤로가면 책이야기 전체 목록 탭이 아니라 `마이페이지 > 내 책 이야기`로 돌아옴. 상세 로드 실패 시 잘못된 복귀 플래그가 남지 않음. | 2026-07-06 | 2026-07-06 |
| ⬜ | **마이페이지 메인 breadcrumb 제거** | 마이페이지 메인 진입 | 프로필 영역 위에 `전체 > 마이페이지` breadcrumb가 보이지 않고, 프로필 사진/닉네임 영역이 자연스럽게 상단에 배치됨. 팔로워/팔로잉 등 내부 화면의 뒤로가기성 breadcrumb는 기존처럼 유지됨. | 2026-07-06 | 2026-07-06 |
| ⬜ | **모임 카드 클릭 가입신청 폼 열기** | 모임 탭 → 가입 가능한 모임 카드 본문 터치 | 모임 카드의 제목/이미지/본문 영역을 눌러도 `가입 신청하기` 버튼을 누른 것과 동일하게 신청 사유 입력칸이 열림. `방문하기` 버튼은 방문 동작만 실행되고, 이미 신청/가입 완료된 카드는 카드 본문을 눌러도 폼이 열리지 않음. | 2026-07-06 | 2026-07-06 |
| ⬜ | **모임 조회 제목/긴 카드 텍스트 안정화** | 모임 탭 → 비로그인/로그인 기본 화면, 검색어 입력, 라디오/드롭다운 필터 변경, 긴 이름/지역 모임 카드 | 비로그인 기본 화면은 `전체 독서 모임`, 로그인 기본 화면은 `독서 모임 추천`, 검색/필터 상태는 `검색 결과` 제목이 항상 보임. 긴 모임명/대상/지역은 2줄 말줄임으로 카드와 버튼 영역을 밀거나 깨뜨리지 않음. | 2026-07-06 | 2026-07-06 |
| ⬜ | **Android 발제 선택 카드 색상** | Android → 모임 → 책장 → 정기모임/조 상세 → 발제 카드 선택 상태 | 웹소켓으로 선택 상태가 바뀐 발제 카드가 iOS와 같은 브라운 계열 선택 배경/테두리/체크 색으로 보임. 미선택 카드는 기존 비활성 스타일을 유지하고, 다른 기기에서 선택해도 Android 화면에 같은 색상으로 즉시 반영됨. | 2026-07-06 | 2026-07-06 |
| ✅ | **모임 관리하기 바텀시트 상단 터치** | 모임 상세 → `모임 관리하기` 클릭 → 관리 바텀시트 열린 상태 | 사용자 실기기 통과 확인(2026-07-06). 바텀시트가 화면 하단에서 열리고, 시트 위쪽 빈 영역/백드롭을 터치하면 지연 없이 즉시 바텀시트만 닫힘. 뒤 화면 버튼이 오동작하거나 바텀시트가 이상한 위치/상태로 바뀌지 않음. | 2026-07-06 | 2026-07-06 |

---

## 🐛 issue-fetch 미완료 항목

> 출처: [issue-fetch.md](./issue-fetch.md) — 완료 항목 제외, 미처리 항목만 정리

### BE 문서 수정 필요

| 상태 | 역할 | ID | 항목 | 내용 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| ⬜ | **BE 문서** | `BOOK-04` | 공개/인증 필요 여부 문서-실서버 불일치 | 보류. 일부 엔드포인트(`all/member/search`)는 익명 200인데 문서엔 401이 혼재. 실제 정책 기준으로 Swagger 정리 필요. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `BOOK-05` | 날짜 형식 표기 차이 | 보류. 스키마는 `date-time`인데 실제는 `YYYY-MM-DD HH:mm` 응답. RFC3339로 통일하거나 현재 포맷을 문서에 명시. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `BOOKS-03` | 다른 회원 좋아요 목록 권한 불일치 | 보류. Swagger엔 401이 명시되지만 실서버는 비로그인 200 응답. 공개/비공개 정책 확정 후 서버 또는 문서 정리 필요. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `BOOKS-04` | nullable 필드 문서 누락 | 보류. 실응답에서 `currentPage`, `nextCursor`가 null인데 스키마는 정수로만 정의됨. Swagger에 `nullable` 명시 필요. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `BOOKS-05` | 검색 "결과 없음" 상태코드 불일치 | 보류. Swagger는 404 정의, 실서버는 200 + 빈 배열 반환. 정책 고정 후 문서 또는 서버 통일 필요. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `NEWS-04` | 소식 조회 권한 문서-실서버 불일치 | 보류. `/news`, `/news/{id}`는 익명 조회 가능(실서버)인데 문서엔 401 케이스 혼재. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MEET-SEARCH-02` | 추천 API 권한 문서-실서버 불일치 | 보류. `/clubs/recommendations` 비로그인 401인데 Swagger는 200만 정의. | - | 2026-06-26 |
| ⬜ | **BE** | `MEET-SEARCH-05` | 키워드 길이 초과 시 500 응답 | 보류. 40자 초과 시 400 대신 500(`COMMON_500`) 반환. 서버 입력 검증 예외를 400으로 정규화 필요. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MYPAGE-01` | 내 모임 API 권한 응답 문서 누락 | 보류. `/me/clubs` 비로그인 401인데 Swagger는 200/400만 명시. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MEET-HOME-02` | 내 클럽 상태 조회 API 문서 누락 | 보류. `/clubs/{clubId}/me` 비로그인 401인데 Swagger는 200/404만 정의. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MEET-NOTICE-01` | 공지 조회 API 권한 응답 문서 누락 | 보류. `/clubs/{clubId}/notices*` 비로그인 401인데 Swagger는 200/403/404 중심. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MEET-BOOKSHELF-01` | 책장/정기모임 API 권한 응답 문서 누락 | 보류. `/bookshelves*`, `/meetings*` 비로그인 401인데 문서에 누락. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `AUTH-02` | 로그인 상태 조회 API 권한 응답 문서 누락 | 보류. `/members/me/login-status` 비로그인 401인데 Swagger는 200만 정의. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MEM-07` | 내 계정 API 권한 응답 문서 누락 | 보류. `/members/me/follow-count` 등 비로그인 401인데 Swagger 누락. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `MEET-MGMT-05` | 모임 운영/관리 API 권한 응답 문서 누락 | 보류. `/clubs`(POST), `/clubs/{clubId}`(PUT/DELETE), `/clubs/{clubId}/members*` 401 누락. | - | 2026-06-26 |
| ⬜ | **BE 문서** | `CHAT-03` | 채팅 히스토리 API 권한 응답 문서 누락 | 보류. RN 채팅 재도입으로 재개. `/clubs/{clubId}/meetings/{meetingId}/teams/{teamId}/chat/messages`의 인증 필수 정책과 401 응답을 Swagger에 명시해야 함. | - | 2026-06-26 |

### 공동 협의 필요 (RN 선반영 완료)

| 상태 | 역할 | ID | 항목 | 현황 / 남은 작업 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **공동** | `MEET-HOME-03` | 이번 모임 바로가기 권한/응답 불일치 | RN: `handleOpenNextMeeting`에 `requireAuth` 래핑 추가 — 비로그인 시 로그인 화면으로 이동. | - | 2026-06-04 |
| ✅ | **공동** | `MEET-MGMT-04` | 모임 수정 요청에서 링크 필드 미전송 | Swagger 확인: PUT 방식으로 미전송 시 초기화. RN 수정: updateClub 호출 시 `links: group.links` 포함하여 기존 링크 보존. | - | 2026-06-04 |
| ✅ | **공동** | `CHAT-02` | REST 채팅 전송 함수가 스펙/실사용과 불일치 | RN 재도입 후에도 REST POST 함수는 복원하지 않고 서버 계약대로 STOMP `/pub/.../chat/message`만 사용. | - | 2026-06-22 |
| ✅ | **공동** | `REPORT-01` | 신고 대상 엔티티 식별자 미전달 | BE: `POST /api/reports` (`targetType`/`targetId`/`reason`) 확장 완료. RN: `createReport` 함수 신설, 전체 신고 호출 교체, reason 옵션(일반/욕설/음란/도배) 업데이트 완료. | - | 2026-06-04 |
| ✅ | **공동** | `MEM-04` | find-email GET fallback | Swagger 확인 결과 `POST /api/members/find-email` 단일 경로 확정. RN 코드 일치. | - | 2026-06-04 |
| ✅ | **공동** | `MEM-09` | 사용자 차단 기능 | RN: 차단/해제/목록 API 연결 완료. UserProfileScreen 신고/차단 모달 구현. MyPageScreen 차단 관리 화면 구현. | - | 2026-05-21 |
| ✅ | **공동** | `AUTH-01` | 회원가입 완료 플로우 비원자성 | 3단계 분리(계정생성→로그인→프로필저장)는 의도된 설계. RN 보상 흐름(409 재시도) 포함 완료. | - | 2026-06-04 |
| ✅ | **공동** | `MYPAGE-02` | 기본 프로필 이미지 서버 저장 불가 | 기본 프로필 색상 선택 기능 자체를 제거하고 고정 1개 이미지로 정책 변경 (2026-06-04). N/A. | 2026-05-08 | 2026-06-04 |

## 🗒 2026-06-18 QA 수집 (상세 설명 대기)

> 사용자가 실기기 QA 중 메모한 항목 원문. 각 항목의 상세 의미/재현 조건은 추후 사용자가 설명 예정.

| 상태 | 항목 | 메모 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ |
| ✅ | **모임 생성 안됨** | 사용자 실기기 통과 확인(2026-06-28). | 2026-06-18 | 2026-06-28 |
| ✅ | **소식 날짜 이상하게 나옴** | 사용자 실기기 통과 확인(2026-06-28). 날짜 표시와 즉시 반영 동작 정상. | 2026-06-18 | 2026-06-28 |
| ✅ | **모임 사람들 보고 싶음** | 사용자 실기기 통과 확인. 모임 홈 참여자 목록에서 모임 회원을 확인할 수 있음. | 2026-06-18 | 2026-06-27 |
| ✅ | **알림 빨간색 유효 페이지 다름** | 사용자 실기기 통과 확인(2026-06-28). | 2026-06-18 | 2026-06-28 |
| ✅ | **댓글 최대 개수 막아놓기** | 사용자 실기기 통과 확인(2026-06-28). | 2026-06-18 | 2026-06-28 |
| ✅ | **신고하기 안됨** | 사용자 실기기 통과 확인. | 2026-06-18 | 2026-06-26 |
| ✅ | **공지사항 댓글 placeholder** | 공지사항 댓글 입력 placeholder에 최대 글자수 300자를 표시하고 `maxLength`도 300자로 연결. | 2026-06-18 | 2026-06-27 |
| ✅ | **알림 이동 안됨** | 사용자 실기기 통과 확인(2026-06-28). | 2026-06-18 | 2026-06-28 |
| ✅ | **임시저장 삭제 해줘** | 마이페이지 내 책이야기 임시저장 태그 옆에 삭제 버튼 추가. 확인 Alert 후 `DELETE /api/v1/book-stories/{bookStoryId}` 호출, 처리 중 중복 클릭 차단, 성공 시 목록 즉시 제거, 실패 시 오류 안내. DoD: 임시저장만 삭제 버튼이 보이고 취소/성공/실패 흐름이 정상 동작. | 2026-06-18 | 2026-06-22 |
| ✅ | **댓글 프로필 안됨** | 공지사항 댓글 기준 코드 연결 확인 완료. BE `authorInfo.profileImageUrl` → RN API 정규화 → `authorProfileImageUrl` 매핑 → 댓글 `Image` 렌더링으로 전달되며, 이미지가 없으면 `DefaultProfileAvatar`를 표시한다. 프로필 사진/닉네임 탭 시 `UserProfile` 이동도 연결됨. | 2026-06-18 | 2026-06-22 |

---

## 상태 범례

- ⬜ 미완료
- 🔄 진행 중
- ✅ 완료
