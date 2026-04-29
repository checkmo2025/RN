# Loading Screen 점검 정리

- 갱신 시각: `2026-04-29 KST`
- 스캔 범위: `App.tsx`, `src/**` (RN)
- 목적: 로딩 UI가 어디서 어떻게 보이는지(문구/효과/조건) 전수 파악

---

## 1) 전용 로딩 화면 컴포넌트

### `BookFlipLoadingScreen` 구현
- 파일: `src/components/common/BookFlipLoadingScreen.tsx`
- 기본 문구: `로딩중` (상태 라벨형 — 공백 없음)
- 시각 효과:
  - 로고 채움 애니메이션(0 -> 100 -> 0 반복)
  - 페이지 넘김 느낌의 edge 애니메이션
  - `로딩중` 텍스트 opacity 펄스
- 추가 문구:
  - `detailTitle`, `detailDescription` props로 보조 안내 문구 표시 가능

### 실제 사용 위치(렌더 기준 4곳)
| 위치 | 조건 | 문구 | 효과 |
|---|---|---|---|
| `App.tsx` (bootOverlay) | `!isReady` (AuthGate 초기화 완료 전) | `로딩중` | zIndex 2000 전체 화면 오버레이 |
| `App.tsx` (authTransitionOverlay) | `authTransitionLoading=true` | `로딩중` + 보조 안내 문구 | zIndex 1000 전체 화면 오버레이 |
| `src/screens/StoryScreen.tsx:1680` | `submittingStory=true` | `로딩중` | 화면 대체(full-screen) |
| `src/screens/MeetingScreen.tsx:1167` | `openingClubLoading=true` | `로딩중` | 그룹 홈 위 오버레이 (`absoluteFill`) |

> **부팅 로더 정책 변경 (2026-04-29):**  
> `App.tsx` 1500ms 고정 타이머 → `AuthGateContext.isReady` 이벤트 기반으로 전환.  
> `AuthGateContext` 전환 로더: 1200ms → `AUTH_TRANSITION_MS = 400ms` 상수로 단축.

---

## 2) 당겨서 새로고침 스피너 (`RefreshControl`)

- 공통 효과: 네이티브 스피너 표시 (시스템 기본 색상)
- 사용 위치(렌더 기준 10곳):
  - `src/screens/HomeScreen.tsx:559`
  - `src/screens/NewsScreen.tsx:547`
  - `src/screens/NewsScreen.tsx:672`
  - `src/screens/StoryScreen.tsx:1705`
  - `src/screens/StoryScreen.tsx:2314`
  - `src/screens/MeetingScreen.tsx:1183`
  - `src/screens/MeetingScreen.tsx:9396`
  - `src/screens/MyPageScreen.tsx:2573`
  - `src/screens/MyPageScreen.tsx:2670`
  - `src/screens/UserProfileScreen.tsx:908`

---

## 3) 인라인 텍스트 로딩 문구

### Home
- `src/screens/HomeScreen.tsx:542`  
  - 문구: `불러오는 중...`
  - 조건: `loadingMorePosts`
  - 효과: 리스트 하단 텍스트만 표시

### News
- `src/screens/NewsScreen.tsx:321`  
  - 문구: `소식 내용을 불러오는 중입니다.`
  - 조건: 상세 진입 직후 프리셋
  - 효과: 상세 본문 자리 placeholder
- `src/screens/NewsScreen.tsx:575`  
  - 문구: `불러오는 중...`
  - 조건: `loadingDetail`
  - 효과: 상세 본문 텍스트 대체

### Story
- `src/screens/StoryScreen.tsx` (ListFooterComponent)
  - 문구: `불러오는 중...`
  - 조건: `isLoadingMore`
  - 효과: 리스트 하단 인라인 텍스트 (2026-04-29 추가)

### UserProfile
- `src/screens/UserProfileScreen.tsx:694` `서재를 불러오는 중...` (`loadingBooks`)
- `src/screens/UserProfileScreen.tsx:721` `모임을 불러오는 중...` (`loadingGroups`)
- `src/screens/UserProfileScreen.tsx:794` `구독 목록을 불러오는 중...` (`loadingFollowUsers`)
- `src/screens/UserProfileScreen.tsx:1006` `불러오는 중...` (`profileLoading && !refreshing`)
- 효과: 모두 인라인 텍스트 방식(스피너 없음)

### MyPage
- `src/screens/MyPageScreen.tsx:1509` `내 책이야기를 불러오는 중...`
- `src/screens/MyPageScreen.tsx:1556` `내 서재를 불러오는 중...`
- `src/screens/MyPageScreen.tsx:1588` `내 모임을 불러오는 중...`
- `src/screens/MyPageScreen.tsx:1620` `알림을 불러오는 중...`
- `src/screens/MyPageScreen.tsx:1644` `내 소식을 불러오는 중...`
- `src/screens/MyPageScreen.tsx:1770` `구독 목록을 불러오는 중...`
- `src/screens/MyPageScreen.tsx:2350` `신고 목록을 불러오는 중...`
- `src/screens/MyPageScreen.tsx:2403` `알림 설정을 불러오는 중...`
- `src/screens/MyPageScreen.tsx:2723` `프로필을 불러오는 중...`
- 효과: 모두 인라인 텍스트 방식

### Meeting
- `src/screens/MeetingScreen.tsx:1213` `내 모임 목록을 불러오는 중...`
- `src/screens/MeetingScreen.tsx:1336` `모임 목록을 불러오는 중...`
- `src/screens/MeetingScreen.tsx:9849` `다음 댓글을 불러오는 중...`
- `src/screens/MeetingScreen.tsx:10216` `다음 발제를 불러오는 중...`
- `src/screens/MeetingScreen.tsx:10295` `정기모임 정보를 불러오는 중...`
- `src/screens/MeetingScreen.tsx:10562` `조 편성 정보를 불러오는 중입니다.`
- 효과: 인라인 텍스트 또는 빈 상태 카드 안 안내 텍스트

### AppHeader
- `src/components/common/AppHeader.tsx:836` `알림을 불러오는 중...`
- `src/components/common/AppHeader.tsx:991` `추천 책을 불러오는 중...`
- `src/components/common/AppHeader.tsx:1224` `도서 상세를 불러오는 중...`
- `src/components/common/AppHeader.tsx:1230` `책이야기 목록을 불러오는 중...`
- 효과: 드롭다운/검색 상세 영역 내부 텍스트

---

## 4) 버튼 상태형 로딩 문구/효과

> 진행 동작형 문구는 `동사 + 중...` (공백 + 말줄임표) 형태로 통일 완료. (2026-04-29, 1번 항목 기준)

### AuthFlow
- `src/screens/AuthFlowScreen.tsx:954` `발송 중...`
- `src/screens/AuthFlowScreen.tsx:990` `확인 중...`
- `src/screens/AuthFlowScreen.tsx:1282` `처리 중...`
- `src/screens/AuthFlowScreen.tsx:1406` `조회 중...`
- `src/screens/AuthFlowScreen.tsx:1472` `전송 중...`
- `src/screens/AuthFlowScreen.tsx:1535` `로그인 중...`
- `src/screens/AuthFlowScreen.tsx:1223` 업로드 중 아이콘 전환 `edit -> hourglass-top`
- 효과: 버튼 비활성화 + 문구 변경(일부는 아이콘 변경)

### UserProfile
- `src/screens/UserProfileScreen.tsx:833` `처리 중...` (구독 토글)
- `src/screens/UserProfileScreen.tsx:969` `처리 중...` (프로필 상단 구독 버튼)

### MyPage
- `src/screens/MyPageScreen.tsx:1806` `삭제 중...`
- `src/screens/MyPageScreen.tsx:2093` `업로드 중...`
- `src/screens/MyPageScreen.tsx:2147` `변경 중...`
- `src/screens/MyPageScreen.tsx:2288` `변경 중...`
- `src/screens/MyPageScreen.tsx:2325` `처리 중...`
- `src/screens/MyPageScreen.tsx:2485` `발송 중...`
- `src/screens/MyPageScreen.tsx:2534` `확인 중...`
- `src/screens/MyPageScreen.tsx:2550` `변경 중...`
- `src/screens/MyPageScreen.tsx:2648` `로그아웃 중...`

### Meeting
- `src/screens/MeetingScreen.tsx:9530` `불러오는 중...` (다음 모임 바로가기 버튼)
- `src/screens/MeetingScreen.tsx:10806` `저장 중...`
- `src/screens/MeetingScreen.tsx:10962` `수정 중...`
- `src/screens/MeetingScreen.tsx:10963` `등록 중...`
- `src/screens/MeetingScreen.tsx:11027` `검색 중...`
- `src/screens/MeetingScreen.tsx:11324` `업로드 중...`
- `src/screens/MeetingScreen.tsx:11625` `삭제 중...`
- `src/screens/MeetingScreen.tsx:11639` `저장 중...`
- `src/screens/MeetingScreen.tsx:11666` `등록 중...`
- `src/screens/MeetingScreen.tsx:11755` `처리 중...`
- `src/screens/MeetingScreen.tsx:12251` `업로드 중`
- `src/screens/MeetingScreen.tsx:13116` `확인 중...`
- `src/screens/MeetingScreen.tsx:13242` `업로드 중...`
- `src/screens/MeetingScreen.tsx:13465` `완료 중...`

### 공통 모달
- `src/components/common/ReportMemberModal.tsx:162` `등록 중...`

---

## 5) 현재 상태 요약

- `ActivityIndicator` 직접 사용: **0건**
- 전용 로더: `BookFlipLoadingScreen` 단일 컴포넌트 (L1/L2 용도)
- 부팅 로더: 실제 준비 이벤트(`AuthGate.isReady`) 기반 — 고정 타이머 제거 완료
- 전환 로더: `AUTH_TRANSITION_MS = 400ms` 상수 기반 (최소 표시 시간)
- 인라인 피드백: 텍스트 방식으로 통일 (스피너 없음 — 현 정책 유지)
- 페이지네이션 피드백: `StoryScreen` `isLoadingMore` 리스트 하단 피드백 추가 완료
