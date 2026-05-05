# TODO

> 마지막 업데이트: 2026-05-06 KST (CLAUDE.md 항목 추가)

## 📌 에이전트 프롬프트 블록 (여기는 프롬프트)

> TODO/문서 정리 요청 시, 에이전트가 우선 확인하는 전용 영역입니다.
> 아래 블록에 운영 지침을 자유롭게 작성/수정하세요.

```prompt
이 블록은 TODO 정리 작업 시 반드시 따르는 운영 규칙이다.

1) TODO를 새로 추가할 때는 사용자가 바로 이해할 수 있게 쓴다.
- 기술용어만 쓰지 말고, "어디서 / 무엇을 / 왜"를 한 줄 설명에 포함한다.
- 항목명은 짧고 명확하게 작성한다.

2) 날짜를 항상 관리한다.
- 신규 항목 추가 시 `생성일자`를 `YYYY-MM-DD`로 입력한다.
- 항목 내용/상태를 수정하면 `최종 편집일자`를 같은 형식으로 갱신한다.
- 문서 상단 `마지막 업데이트`도 함께 갱신한다.

3) 섹션별 정렬 규칙을 지킨다.
- 정렬 기준은 아래 순서를 고정한다.
  - `⬜ 미완료`
  - `🔄 진행 중`
  - `✅ 완료`
- 작업 완료로 상태가 바뀌면 즉시 해당 순서에 맞게 재정렬한다.

4) 각 항목에 완료 기준(DoD)을 한 줄로 적는다.
- "어떤 상태면 ✅인지"를 설명에 명시한다.
- 검증 기준(예: 화면 확인, API 응답 확인, 문서 반영 완료) 중 최소 1개를 포함한다.

5) 테스트 항목은 반드시 분리한다.
- 코드 작업 TODO와 실기기 QA TODO를 섞지 않는다.
- 테스트/검증성 항목은 `🧪 직접 테스트 필요 항목` 섹션에만 작성한다.

6) 완료 항목은 삭제하지 않는다.
- 완료 이력은 남기고, 상태만 `✅`로 바꾼다.
- 장기 보관이 필요하면 별도 done 문서로 이동하고 TODO에는 링크를 남긴다.

7) 설명 품질을 유지한다.
- 설명은 1~3문장으로 간결하게 유지한다.
- 관련 문서/파일이 있으면 경로를 함께 남긴다.

8) 상태 기준을 일관되게 적용한다.
- `⬜`: 아직 시작 안 함
- `🔄`: 진행 중(확인/협의 포함)
- `✅`: 코드/문서 반영 또는 확인 완료
```

---

## 🖼 에셋 / 디자인

| 상태 | 역할 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ✅ | **RN** | **소식 기본 이미지 추가** | `assets/images/news-default.png` (800×600) 적용 완료. 목록 썸네일 / 상세 히어로 / 프로모션 캐러셀 세 곳 모두 `NEWS_DEFAULT_IMAGE` 단일 상수로 통일. | - | - |
| ✅ | **RN** | **앱 아이콘 / 스플래시 교체** | `icon-checkmo.png` (1024×1024) 앱 아이콘 유지. `splash-icon.png` Expo 플레이스홀더 → 책모 로고 이미지로 교체 완료. | - | - |
| ✅ | **RN** | **책 표지 기본 이미지 추가** | `assets/images/book-default.png` (200×280) 적용 완료. `MyPageScreen`, `UserProfileScreen`, `MeetingScreen`(책장/발제) 세 곳에 `BOOK_DEFAULT_IMAGE` 상수로 통일. | - | - |
| ✅ | **디자인** | **모임 기본 이미지 전용 에셋** | `assets/images/club-default.png` (512×512) 적용 완료. 모임 카드 썸네일(`MeetingListCard`), 모임 상세 프로필, 모임 생성/수정 미리보기에 `CLUB_DEFAULT_IMAGE` 상수로 통일. | - | - |
| ✅ | **RN** | **글씨 크기 통일 확인** | `fontSize`/`lineHeight`/`letterSpacing` 하드코딩 제거 완료(0건). `typography` 토큰 승격(15/16 포함), 재발 방지 스크립트(`npm run check:typography`) 적용 완료. | - | - |
| ✅ | **RN** | **로딩 화면 전수 점검 문서화** | `../documents/(done)loading-screen.md` 작성 완료. `BookFlipLoadingScreen` 사용처, 인라인 로딩 문구, 버튼 상태형 로딩, `RefreshControl` 위치를 전수 정리. | - | - |
| ✅ | **RN** | **로딩 UX 통일/안정화** | (1) 문구 표기: `동사 + 중...` 공백+말줄임표 통일 완료. (2) 부팅 로더: 1500ms 고정 타이머 → `AuthGate.isReady` 이벤트 기반 전환 완료. (3) 인라인 피드백: 텍스트 방식으로 통일, 스피너 없음 정책 확정. (4) `RefreshControl`: 시스템 기본 색상 사용으로 확정. `../documents/(done)loading-screen.md` 최신화 완료. | - | - |

---

## 🧭 UI 통일 10개 항목

| 상태 | 역할 | 항목 | 설명 | 생성일자 | 최종 편집일자 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| ⬜ | **RN** | **화면 움직임 신경쓰기(애니메이션 적용)** | 현재 화면 전환/요소 등장 모션이 부족해 딱딱한 느낌. 주요 화면(홈/모임/스토리/모달)에 공통 `duration/easing` 적용 후 체감 QA 진행. | - | - |
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
| ⬜ | **CLAUDE.md 생성 및 AGENTS.md 내용 이전** | 현재 Codex 전용인 `AGENTS.md`의 규칙(`/md`, `/cpa`, agent-log 순서 등)을 Claude Code가 자동으로 읽는 `CLAUDE.md`로 옮긴다. 완료 기준(DoD): 프로젝트 루트에 `CLAUDE.md`가 생성되고, Claude Code 대화 시작 시 규칙이 자동 적용되는 것을 확인. | 2026-05-06 | 2026-05-06 |
| ⬜ | **[MEET-SPLIT-01] MeetingScreen 분해 설계/경계 정의** | `src/screens/MeetingScreen.tsx`의 상태/이펙트/핸들러를 도메인(검색·가입·홈·공지·책장·정기모임·채팅·관리) 단위로 분해 계획 표로 정리한다. 완료 기준(DoD): 분해 대상 함수/상태 목록 + 우선순위 + 목표 파일 경로가 문서로 확정된다. | 2026-05-06 | 2026-05-06 |
| ⬜ | **[MEET-SPLIT-02] mapper/formatter 순수 함수 분리** | `MeetingScreen` 내부의 순수 변환 로직을 `meeting/utils` 계층으로 분리해 화면 의존도를 낮춘다. 완료 기준(DoD): mapper/formatter가 화면 파일 밖으로 이동하고, 기존 동작 동일성(타입체크 + 주요 표시값 확인)이 검증된다. | 2026-05-06 | 2026-05-06 |
| ⬜ | **[MEET-SPLIT-03] 공지/책장/채팅/관리 도메인 hook 분리** | 공지, 책장(발제 포함), 채팅, 관리 영역의 API 호출·페이징·로딩·에러 상태를 도메인별 hook으로 분리한다. 완료 기준(DoD): 각 도메인이 독립 hook 파일을 갖고 `MeetingScreen`에서는 조립만 수행한다. | 2026-05-06 | 2026-05-06 |
| ⬜ | **[MEET-SPLIT-04] 하위 View 컴포넌트 분리** | 도메인별 UI 블록(공지 리스트/책장 본문/채팅 본문/관리 모달 등)을 프레젠테이션 컴포넌트로 분리한다. 완료 기준(DoD): `MeetingScreen`에서 JSX 대형 블록이 제거되고, 하위 컴포넌트 props 계약이 타입으로 고정된다. | 2026-05-06 | 2026-05-06 |
| ⬜ | **[MEET-SPLIT-05] MeetingScreen 컨테이너 축소(조립 전용화)** | 최종 단계에서 `MeetingScreen`의 역할을 라우팅/탭/상태 조립 중심으로 축소하고 도메인 로직 직접 보유를 최소화한다. 완료 기준(DoD): 파일 길이와 내부 state/effect 수가 초기 대비 의미 있게 감소하고, 회귀 체크리스트를 통과한다. | 2026-05-06 | 2026-05-06 |
| ✅ | **로그인/회원가입 성공 후 이전 화면 복귀** | `requireAuth(callback)` + `pendingActionRef` 패턴 전면 적용 완료. MyPageScreen(팔로워/팔로잉 목록, 설정)·AppHeader(책 좋아요 토글, 알림 열기) 4곳에 콜백 추가. StoryScreen 글 작성은 이미 적용돼 있었음. 로그인·회원가입 모두 `completeAuthFlow` 경로로 통일 확인. | - | - |

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
| ⬜ | **로그인 안 된 상태에서 로그인 필요 기능 누를 때** | 비로그인 상태로 구독, 좋아요 등 버튼 클릭 | 책모 로딩 화면이 잠깐 뜨면서(약 1.0초) "로그인이 필요합니다" 안내가 보이고, 그 뒤 로그인 화면으로 넘어가는지. (`AUTH_TRANSITION_MS=1000ms` 기준) | - | - |
| ⬜ | **간격 통일 이후 컴포넌트 확인 QA** | 전체 화면 직접 탐색 | `spacing.xs / 2` → `spacing.xxs` 교체(78건) 이후 실기기에서 카드·입력폼·모달·리스트 등 주요 컴포넌트의 내부 간격이 시각적으로 이상하지 않은지 확인. | - | - |
| ⬜ | **신고 유형 칩 모양 QA** | 책이야기 상세 → 신고 / 내 페이지 → 신고 | StoryScreen `reportTypeButton`(radius.sm)과 MyPageScreen `reportTypeChip`(radius.sm으로 변경)이 동일하게 직각에 가까운 칩 모양으로 보이는지 확인. | - | - |
| ⬜ | **책이야기 구독 버튼 모양 QA** | 책이야기 카드(BookStoryCard) 탭 탐색 | `subscribeChip` radius.lg→sm 변경으로 FeedCard의 subButton과 동일한 덜 둥근 모양인지 확인. | - | - |
| ⬜ | **내 페이지 카테고리 칩 모양 QA** | 내 페이지 → 프로필 편집 → 독서 취향 | `categoryChip` radius.sm→lg 변경으로 AuthFlowScreen 회원가입 장르 선택칩과 동일하게 둥근 chip 모양인지 확인. | - | - |
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

---

## 🔧 아이콘 교체 작업

### 절대 삭제 금지 (현재 실제 참조 중)
- `assets/icon-checkmo.png` — 앱 아이콘 + Android adaptive foreground
- `assets/splash-icon.png` — 스플래시
- `assets/favicon.png` — 웹 favicon
- `ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` — iOS AppIcon 원본
- `android/app/src/main/res/mipmap-*/ic_launcher*.webp` 및 `mipmap-anydpi-v26/ic_launcher*.xml` — Android 런처 아이콘

### 바로 삭제 가능한 템플릿 후보
- `assets/icon.png`
- `assets/adaptive-icon.png`

### 교체할 파일 (내 에셋으로 덮어쓰기)
- `assets/icon-checkmo.png`
- `assets/splash-icon.png`
- `assets/favicon.png`
- `ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`

### 권장 에셋 스펙
- 앱 아이콘 원본: 1024×1024 PNG, 배경 포함, 모서리 라운드 없음
- 스플래시 이미지: PNG (투명 가능), 중앙 배치 기준
- favicon: 512×512 PNG (웹용)
- Android adaptive foreground: 투명 여백 포함 PNG 권장

### 작업 순서
1. 위 4개 교체 대상 파일을 새 에셋으로 덮어쓰기
2. 템플릿 후보 2개 (`assets/icon.png`, `assets/adaptive-icon.png`) 삭제
3. 네이티브 리소스 재생성
4. iOS / Android / Web 실행 확인

### 재생성 커맨드
```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
# 웹 확인
npx expo start --web
```

### 확인 체크리스트
- [ ] 홈 화면 / 앱 목록 아이콘이 새 아이콘으로 보이는지
- [ ] 스플래시가 새 이미지로 뜨는지
- [ ] iOS 빌드 경고 없이 실행되는지
- [ ] Android 빌드에서 launcher icon 관련 에러 없는지
- [ ] 웹 탭 favicon이 새 아이콘인지

---

## 상태 범례

- ⬜ 미완료
- 🔄 진행 중
- ✅ 완료
