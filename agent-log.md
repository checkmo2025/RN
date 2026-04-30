# 2026-04-30 로그인 후 이전 화면 복귀

## 작업 개요
`requireAuth(callback)` + `pendingActionRef` 패턴을 활용해 로그인/회원가입 성공 후 직전에 시도했던 액션을 자동 재실행하도록 전면 점검 및 보완.

## 구현 내용

### 기존 동작 확인
- `AuthGateContext`: `requireAuth(callback)` → `pendingActionRef` 저장 → `completeLogin()` 시 실행 패턴 이미 구현돼 있음.
- `App.tsx`: Auth 오버레이 모델 — 로그인 중에도 하위 내비게이션 유지됨.
- `AuthFlowScreen`: `completeAuthFlow()` 가 로그인/회원가입 완료 단계(모임 선택 포함) 모두에서 호출됨 → 로그인·회원가입 양쪽 모두 동작.
- `StoryScreen.openCompose` (line 437): 이미 `requireAuth(() => setIsComposing(true))` 적용돼 있어 글 작성은 이미 정상 동작.

### 신규 적용 — 콜백 없이 호출하던 곳 수정
**`MyPageScreen`**
- `openFollowerList`: 로그인 후 팔로워 목록 자동 열기
- `openFollowingList`: 로그인 후 팔로잉 목록 자동 열기
- 설정 아이콘 onPress: 로그인 후 설정 패널 자동 열기

**`AppHeader`**
- `handleToggleBookLike`: `executeBookLikeToggle` 분리 후 `requireAuth(() => executeBookLikeToggle(book))` 적용
- 알림 벨 onPress: 로그인 후 알림 패널 자동 열기

### 그대로 둔 케이스
- `HomeScreen` line 310/353/397: `accessPolicy` 정책 게이트 → 인증 후 액션이 accessPolicy에 따라 달라지므로 콜백 불필요
- `MeetingScreen` line 959: 401 에러 복구용 강제 재로그인 → 콜백 불필요
- `MeetingScreen` line 5528: 세션 만료 후 재로그인 유도 → 콜백 불필요
- `MyPageScreen` line 1683 (`renderGuestPrompt`): 로그인 후 `isLoggedIn` 변경으로 컴포넌트 자동 재렌더링

## 파일
- `src/screens/MyPageScreen.tsx`
- `src/components/common/AppHeader.tsx`

---

# 2026-03-08 작업 요약

## 인증/로그인(Auth)
- 로그인/아이디찾기/비밀번호재발급 카드 레이아웃 정리
  - 아이디찾기/비밀번호재발급에서 상단 바깥 책모 아이콘 숨김
  - 아이디찾기/비밀번호재발급에 카드 좌상단 뒤로가기 아이콘 버튼 적용
  - 하단 뒤로가기 버튼 제거, 메인 액션 버튼 중심 레이아웃으로 통일
- 소셜 로그인 UI 개선
  - 카카오 아이콘 정렬 보정
  - 소셜 로그인 WebView 상단 제목/닫기 버튼 노출 영역(safe area) 보정
  - 로드 실패 화면(다시 시도 버튼/아이콘/간격/스타일) 개선
- 아이디 찾기 API 호출 방식 수정
  - `findEmailByNamePhone` 요청을 `GET /members/find-email` 쿼리 방식으로 변경

## 검색/내비게이션
- 책 검색 입력창 UX 개선
  - 검색 아이콘을 입력창 오른쪽 액션 버튼으로 통일
  - 드롭다운 검색창에서 왼쪽 아이콘 제거 후 오른쪽 아이콘으로 통일
- 검색 결과 상세 화면에서 `< 검색결과` 클릭 시 검색 화면으로 복귀 동작 수정
- 다른 사람 프로필/검색 결과/피드 카드에서 책이야기 카드 클릭 시 상세 페이지로 이동 연결
- 책이야기 카드의 `댓글` 클릭 시 상세 화면 댓글 섹션 포커스 이동 연결

## 홈/소식
- 소식 캐러셀 인디케이터를 홈과 동일 스타일로 통일
- 소식 캐러셀 자동 넘김(3초 간격), 마지막 이후 첫 슬라이드로 순환되도록 수정
- 토스트 위치(세로 오프셋) 하향 조정

## 구독/마이페이지
- 구독 버튼 상태 텍스트/스타일 정리
  - `구독 중` -> `구독중` 표기 통일
  - 상태(구독/구독중)에 따른 색상 분기(`subbrown_4` 포함) 반영
- 마이페이지 구독자 목록에 `삭제` 버튼 추가 및 API 연동
  - 삭제 전 확인 알림(Alert) 추가
  - 삭제 API 성공 시점에만 리스트 반영하도록 동작 수정
- 홈 사용자 추천 카드에 `구독중`, `구독자` 수가 표시되도록 프로필 보강 조회 반영

## 모임
- 모임 리스트 카드 이미지가 보이도록 렌더링 경로 수정
- 모임 이름 글자 크기 상향 조정
- 모임 검색 결과 상태 문구 `가입중` -> `가입 완료`로 변경

## 기타 API/데이터 매핑
- 백엔드 변경 스펙 반영을 위해 `memberApi`, `clubApi`, `bookStoryApi` 일부 매핑/호출 로직 보정

## 작업 파일
- `src/components/common/AppHeader.tsx`
- `src/components/common/ToastHost.tsx`
- `src/components/feature/bookstory/BookStoryCard.tsx`
- `src/components/feature/bookstory/BookStoryCardLarge.tsx`
- `src/components/feature/bookstory/BookStoryFeedCard.tsx`
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/components/feature/home/HomePostCard.tsx`
- `src/components/feature/member/SubscribeUserItem.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/NewsScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/UserProfileScreen.tsx`
- `src/services/api/authApi.ts`
- `src/services/api/bookStoryApi.ts`
- `src/services/api/clubApi.ts`
- `src/services/api/memberApi.ts`

---

## 추가 업데이트 (2026-03-08)

- 수정 시각: `2026-03-08 05:15:59 KST`

### UI 디테일/동작 수정
- 아이디찾기/비밀번호재발급 상단 뒤로가기 버튼 스타일 보정
  - 원형 배경 제거
- 전화번호 입력 자동 포맷 적용
  - 숫자 입력 시 `010-1234-1234` 형태로 자동 하이픈 처리
- 책 검색 상세 화면의 `검색결과` 뒤로가기 동작 수정
  - 검색 상태를 유지한 채 결과 리스트로 복귀
- 책 검색 2단계 입력창 검색 아이콘 스타일 통일
  - 1단계와 동일한 아이콘 계열로 통일
- 검색 결과 카드의 `책이야기 작성` 버튼 아이콘 통일
  - 책이야기 화면 플로팅 버튼 아이콘과 동일하게 교체

### API 연결/안정화
- 비밀번호 재발급 API 호출 안정화
  - 공개성 엔드포인트 특성을 반영해 쿠키 없이 요청하도록 보강
- 아이디 찾기 API 호출 보강
  - 백엔드 환경 차이 대응을 위해 `POST 우선`, `401 발생 시 GET fallback` 처리
  - 전화번호는 하이픈 포함 형식으로 API 전송

### 추천/프로필 영역 정리
- 사용자 추천 카드에서 `구독중/구독자` 숫자 표시 제거
- 해당 숫자 보강을 위해 추가 호출하던 추천 관련 API 보강 로직 제거
- 기본 프로필 이미지를 `image_profile1`로 통일
  - 사용자 추천
  - 책이야기 리스트
  - 책이야기 상세
  - 마이페이지 구독자/구독중 목록
  - 프로필(구독자·구독중 표기 영역 포함)

### 캐러셀 공통화
- 홈/소식에서 공통으로 쓰는 소식 캐러셀 컴포넌트 분리
  - `src/components/feature/news/NewsPromotionCarousel.tsxi`
- 기준 통일
  - 크기/레이아웃: 홈 화면 기준
  - 자동 이동 동작: 소식 화면 방식
- 자동 이동 주기 변경
  - 3초 -> 5초
- 소식 화면 캐러셀 배치/정렬 보정
  - 좌우 패딩 중복으로 어긋나던 레이아웃 수정
  - 스냅 오프셋 기반으로 슬라이드 정렬 안정화

---

## /md 업데이트 (2026-03-08)

- 수정 시각: `2026-03-08 05:24:08 KST`
- 책이야기 댓글 API 파서를 중첩 응답(`comments[].replies[]`) 대응으로 수정해 대댓글 부모 연결을 유지하도록 반영
- 대댓글의 `parentCommentId`를 평면 댓글 리스트로 펼쳐 매핑하도록 보정
- 상세 댓글 UI에 `replyTo` 기반 들여쓰기와 작성 직후 낙관적 대댓글 연결 표시를 추가

---

## 업데이트 (2026-03-08)

- 수정 시각: `2026-03-08 16:39:32 KST`
- feat : 백엔드 변경사항 반영
- 인증 플로우(이메일/닉네임 로그인) 반영 및 아이디 찾기 API fallback/응답 처리 보강
- 사용자 추천 구독 버튼 축소, 다른 사람 프로필 책이야기 -> 상세 이동 안정화

---

## 업데이트 (2026-03-30)

- 수정 시각: `2026-03-30 20:52:52 KST`
- 모임 화면 조 채팅 전송 버튼을 실제 API 호출로 연결
- 채팅방 진입/전송 후 최신 채팅 내역 재조회 로직 추가
- 전송 중 입력/전송 버튼 비활성화 처리 및 UI 상태 보강

---

## 업데이트 (2026-04-23)

- 수정 시각: `2026-04-23 23:06:16 KST`
- 기기 해상도 차이에 따른 UI 편차를 줄이기 위한 반응형/스케일링 보정 반영
- 모임 화면 정기모임 섹션에 조(그룹) 목록/선택/진입 흐름 및 관련 UI 구조 확장
- 모임/홈/소식/스토리/프로필/마이페이지 라우팅·상태 연동 로직 정리 및 안정화
- `clubApi` 중심으로 정기모임/조 관련 API 연동 스펙 확장

---

## 업데이트 (2026-04-26)

- 수정 시각: `2026-04-26 KST`

### 모임 화면 (MeetingScreen)
- 공지사항 새로고침 시 상세보기 유지
  - `setSelectedNoticeId` functional updater로 변경 → 재조회 후 해당 공지가 목록에 있으면 상세 유지
- 투표 기한 만료 처리
  - `NoticePoll` 타입에 `endsAtMillis` 필드 추가
  - 기한이 지난 투표의 버튼을 `투표종료`로 변경 및 비활성화
  - 투표 옵션 선택·제출 시 만료 여부 사전 체크
- 공지사항 사진 전체화면 뷰어
  - 사진 그리드 셀을 `Pressable`로 변경
  - `FlatList(horizontal, pagingEnabled)` 기반 포토 뷰어 모달 추가
  - 상단 `{현재}/{전체}` 카운터 및 X 닫기 버튼 포함
- 공지사항 댓글 프로필 클릭 → `UserProfile` 화면 이동
  - 아바타·닉네임 `View`/`Text` → `Pressable`로 교체
- 정기모임 2-Phase 렌더링으로 로딩 병목 개선
  - Phase 1: topics/reviews/detail/editDetail/fetchClubMeeting 전부 병렬 → 완료 즉시 제목/날짜/장소 표시 (groups: [])
  - Phase 2: 팀별 topics+chats 병렬 조회 후 최종 groups 업데이트
  - 데이터 로딩 중 "불러오는 중..." 인디케이터 표시
- ⋮ 메뉴 본인/타인 분기
  - 본인 작성: `수정하기` / `삭제하기`
  - 타인 작성: `신고하기` (ReportMemberModal 연동)
  - 이전에 본인 글에만 표시되던 메뉴 버튼을 전체 포스트에 표시
- 발제/한줄평 카드 간격 축소 (`spacing.sm` → `spacing.xs`)
- 책장 상세 더미 설명 텍스트 제거 (하드코딩된 문자열 삭제)

### 내비게이션
- `SimpleStackNavigator`에 좌→우 엣지 스와이프 뒤로가기 제스처 추가
  - 왼쪽 24px 영역에서 시작한 수평 스와이프만 인식 (`PanResponder` 기반)
- `navigateToHome` 리팩터링 및 `navigateToMyAlarms` 추가
  - `findTabsNavigator` 헬퍼로 navigator 탐색 로직 분리
  - `navigateToMyAlarms`: Tabs > My > ALARM 탭으로 직접 이동

### 알림 (AppHeader)
- 알림 아이콘에 읽지 않은 알림 빨간 점(unreadDot) 표시
  - 로그인 시 알림 미리보기로 읽지 않은 항목 여부 확인
- 알림 드롭다운 하단에 `알림 전체보기` 버튼 추가 → My 탭 알림 화면으로 이동

### 마이페이지 (MyPageScreen)
- 내 서재 그리드 3-column 레이아웃 수정
  - `bookshelfCardWidth` 계산에 `scaleSize` 적용하여 스케일링 일관성 확보

## 작업 파일
- `src/components/common/AppHeader.tsx`
- `src/navigation/SimpleStackNavigator.tsx`
- `src/navigation/navigateToHome.ts`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`

---

## 업데이트 (2026-04-25)

- 수정 시각: `2026-04-25 10:47:59 KST`
- 소식 화면 `오늘의 추천 책` 카드 탭 시 홈 탭의 책 검색 상세(`openSearchBook`)로 이동하도록 라우팅 연결
- 책 검색 상세에서 `GET /api/book-stories/search/{bookId}` 호출 시 ISBN(13자리 포함) 기반 식별자를 허용하도록 조회 키 해석 로직 수정
- 책이야기 조회 API 함수에서 `bookId`를 문자열/숫자 모두 처리하고 경로 인코딩하도록 보강
- 타입체크 및 Expo Doctor 점검 통과(`npm run check`)

---

## 업데이트 (2026-04-26)

수정 시각: `2026-04-26 16:54:11 KST`

- 신고 모달에서 신고 대상 사용자 클릭 시 프로필 화면 이동 동선 연결 (`src/components/common/ReportMemberModal.tsx`, `src/screens/StoryScreen.tsx`, `src/screens/MeetingScreen.tsx`)
- 소식 프로모션 캐러셀 로딩을 `carousel=PROMOTION` 기준으로 정리 (`src/screens/HomeScreen.tsx`, `src/screens/NewsScreen.tsx`, `src/services/api/newsApi.ts`)

---

## 업데이트 (2026-04-27)

- 수정 시각: `2026-04-27 01:00:48 KST`
- `hamburger.md` 파일 신규 작성: 햄버거/3점 메뉴를 팝오버, 폰 기본 Alert, 앱 커스텀 바텀시트로 분류
- `StoryScreen`, `MyPageScreen`, `MeetingScreen`, `UserProfileScreen` 기준으로 메뉴 동작 위치를 파일/라인 단위로 정리
- `다른사람 프로필` 3점 아이콘(`UserProfileScreen`) 미연결 상태(`onPress` 없음) 참고 항목으로 기록
- 모임 정기모임 상세 로딩 2-Phase 흐름 보정 및 관련 화면 배치 미세 조정 (`src/screens/MeetingScreen.tsx`, `src/screens/StoryScreen.tsx`)
- 문서 초안 추가 (`docs/functional-spec.md`, `docs/ia.md`, `docs/immediate-reflection-matrix.md`, `docs/push-notification-implementation.md`)

---

## 업데이트 (2026-04-26)

- 수정 시각: `2026-04-26 17:52:10 KST`
- 이메일 변경 화면에 회원가입과 유사한 이메일 인증(코드 전송/재전송/확인/타이머) 단계와 상태 흐름을 반영하고, 실제 변경 API 연동 전 검증 가드를 정리함
- 비밀번호 변경 화면에 각 입력 필드 비밀번호 표시/숨김(눈 아이콘) 토글을 추가하고 단일 라인 입력창의 descender 잘림 완화를 위한 패딩 오버라이드 적용 범위를 확장함
- 소식 이미지 노출을 웹/반응형에서 의도한 방향으로 맞추기 위해 프로모션/상세/목록 썸네일의 커버 크롭 기준(좌측 포커스)과 캐러셀 렌더링 스타일을 보정함
- 정기모임 상세의 조 정보 로딩 실패 케이스를 보완하도록 그룹/멤버 조회 fallback 및 관련 상태 동기화 로직을 보강함


---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 00:41:04 KST

- 정기모임 팀 채팅용 STOMP 연결 훅(`useMeetingChatStomp`)을 추가하고, `WS_BASE_URL` 공개 환경변수/`@stomp/stompjs` 의존성을 반영함
- 소식 캐러셀/상세/리스트 이미지에 좌측 포컬 크롭 렌더링을 적용하고, 소식 상세 상단 이미지의 제목 오버레이를 제거함
- 공통 `FeedbackPressable`을 도입해 주요 화면의 버튼/터치 요소에 통일된 눌림 피드백(opacity+ripple)을 적용함
- 모달 백드롭/이벤트 차단 컨테이너는 `disableFeedback`으로 분리해 의도적 무피드백 동작을 유지함

---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 10:21:07 KST

- 3점 메뉴 공통 컴포넌트 `ActionMenu`를 추가하고 앵커 기반 위치 계산/닫힘/파괴적 액션 스타일을 표준화함
- `StoryScreen`(글/댓글), `MyPageScreen`(내 모임), `MeetingScreen`(공지 댓글/발제·한줄평), `UserProfileScreen`(다른사람 프로필)을 공통 `ActionMenu`로 1차 통일함
- 삭제/차단 같은 파괴적 동작은 `Alert` 확인 단계를 유지하고, 메뉴 선택 UI만 공통화함
- 메뉴별 중복 팝오버 렌더/스타일/위치 계산 로직을 제거하고 타입체크(`npm run typecheck`) 통과를 확인함

---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 11:20:50 KST

- 정기모임 공지 3점 메뉴의 `신고하기`를 실제 신고 흐름으로 연결하고, 공지 작성자 정보를 목록/상세 응답에서 수집해 `ReportMemberModal`로 연동함
- Swagger + 실서버 응답 기준으로 회원/책이야기/소식 fetch 점검을 수행해 응답 불일치, 페이징 누락, 무음 에러처리 구간을 정리함
- 점검 결과를 문서화한 `docs/issue-fetch.md`를 신규 추가하고, 각 이슈별로 `RN/BE/BE 문서/공동` 판정과 변경 방향을 기록함

---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 11:40:26 KST

- Swagger(OpenAPI)와 실서버 응답 샘플을 기준으로 책 검색 API(`/books/*`)를 추가 점검함
- `docs/issue-fetch.md`에 `책 검색 영역` 섹션을 신설하고 페이징/좋아요 동기화/문서 불일치 이슈를 `RN/BE 문서`로 분류함
- `README.md`를 기존 팀원 실행 중심 구조(프로젝트 소개/스펙/실행/문서 링크)로 정리함

---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 KST

### 모임 관리 메뉴 핸들 드래그 닫기 애니메이션
- `MeetingScreen` 관리 메뉴 바텀시트 상단 핸들에 PanResponder + Animated 기반 드래그-투-디스미스 추가
- 핸들을 아래로 100px 이상 드래그하거나 빠르게 스와이프(`vy > 0.5`)하면 시트가 220ms 슬라이드 다운 후 모달 닫힘
- 짧게 건드리면 spring 애니메이션으로 원위치 복귀 (bounciness 6)
- 핸들 터치 영역 래퍼 뷰(`managementHandleArea`) 추가: 상하 10px 확장으로 잡기 편하게 보강
- 시트 컨테이너를 `Animated.View`로 교체, `onStartShouldSetResponder`로 배경 탭 이벤트와 분리

### 조 관리 드래그 중 자동 스크롤
- 조 편성 화면 ScrollView에 `ref` / `onScroll` / `onLayout→measureInWindow` 연결
- 드래그 중 손가락 위치가 스크롤 뷰 상단 또는 하단 80px 존에 진입하면 `requestAnimationFrame` 루프 기반 자동 스크롤 시작
- 존에서 벗어나거나 드래그 종료(release/terminate) 시 `cancelAnimationFrame`으로 즉시 중지
- 스크롤 속도는 존 내 깊이 비례(최대 10px/frame), `teamManageScrollOffsetRef`로 현재 오프셋 추적
- 모달 닫힘(`closeTeamManage`) 시 rAF 프레임 정리 및 bounds/offset ref 초기화

### issue-fetch.md 이슈 반영 (RN 항목 1차 처리)
- `MEET-HOME-01`: 비로그인 시 `fetchClubMyMembership` 호출 억제 (`isLoggedIn` 가드 추가)
- `MEET-NOTICE-02`: 공지 페이징 루프로 전체 수집 (최대 20페이지)
- `MEET-NOTICE-03/04`: 403 → 멤버 전용 토스트, 공지 상세/댓글 403 에러 처리 추가
- `MEET-MGMT-01`: 모임 수정/생성 폼 입력 필드에 `maxLength` 적용
- `MEET-MGMT-02`: 링크 최대 4개 제한 UI 추가
- `MEET-MGMT-03`: 카테고리 편집 시 최대 6개 초과 선택 방지
- `AUTH-03`: 이름 입력 10자 초과 시 토스트 경고
- `REPORT-03`: 신고 내용 최대 500자 (`maxLength` 및 placeholder 보정)

## 작업 파일
- `src/screens/MeetingScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `docs/issue-fetch.md`

---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 20:20:57 KST

- 정기모임 채팅 플로팅 버튼 아이콘 에셋 `assets/icons/Chat.svg`를 프로젝트에 추가하고 RN 화면에서 사용하도록 반영
- `svg-usage.md` 신규 생성: `checkmo_rn` 기준 전체 SVG 사용/미사용 및 다중 참조 파일 정리
- `icon-usage.md` 신규 생성: favicon/icon(assets, iOS AppIcon, Android launcher) 전체 사용 현황 정리

---

## 업데이트 (2026-04-27)

### 탭 재탭 시 화면 상단 스크롤 (`useScrollToTop`)
- `@react-navigation/native`의 `useScrollToTop` 훅을 5개 탭 화면에 적용
- 이미 활성화된 탭 아이콘을 다시 누르면 각 화면 메인 리스트/스크롤이 상단으로 이동
- 홈(FlatList) / 모임(ScrollView) / 책이야기(FlatList, 기존 listRef 재사용) / 소식(FlatList) / 마이페이지(ScrollView) 각각 ref 연결

### 모임 화면 UX 개선 및 버그 수정
- 모임 검색 필터 행(`전체 / 모임별 / 지역별`) 간격 축소: `gap` md(16) → 4px
- 임시 비밀번호 버튼 워딩 변경: `발송` → `전송`
- 모임 상세 메타 정보(`모임 대상` / `활동 지역` / `모임 취지`) 텍스트 크기 14 → 15px
- 비회원이 클럽 방문 시 `/clubs/{id}/me` 404를 `null`로 흡수 → "해당 클럽 회원을 찾을 수 없습니다" 오류 토스트 제거
- 비회원이 공지사항/책장 탭 진입 시 회원 전용 안내 메시지 표시
  - 공지사항: "공지사항은 독서 모임의 회원이 되신 후 조회 가능합니다."
  - 책장: "책장은 독서 모임의 회원이 되신 후 조회 가능합니다."
- `isMember` 파생 변수 추가: `managedGroup.applicationStatus === '가입 완료' || canManageClub`

### 기본 프로필 이미지 통일
- `ReportMemberModal`의 fallback 아바타를 `MaterialIcons person-outline`에서 `DefaultProfileAvatar`(image_profile1.svg)로 교체
- 앱 전체에서 사용자 아바타 기본 이미지를 `DefaultProfileAvatar`로 통일

## 작업 파일
- `src/screens/HomeScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/NewsScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/components/common/ReportMemberModal.tsx`

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 09:44:02 KST

- RN 미완료 이슈 6건 처리: `MEET-HOME-04`, `MEET-BOOKSHELF-04`, `CHAT-01`, `REPORT-02`, `MEM-04`, `AUTH-01`
- `MeetingScreen`에서 책장 ID/정기모임 ID를 분리(`regularMeetingId`)하고 meetings/STOMP/조관리 경로를 정기모임 ID 기준으로 정규화
- `ReportMemberModal`에 진입 문맥별 신고 타입 제한(`allowedTypes`)을 추가하고 Story/UserProfile/Meeting 진입점에 적용
- 회원가입 보상 흐름(409 재진입/단계별 실패 안내) 보강, `find-email` GET fallback 제거, 차단 메뉴를 준비중 안내 UX로 정리

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 10:27:34 KST

- 헤더 검색/알림, 마이페이지 탭(내 책 이야기/내 서재/내 모임/내 알림), 프로필/클럽 탭 전반에 `selection` 햅틱을 동일 강도로 일괄 적용
- `UserProfile`/`MyPage`의 구독자·구독중 탭 전환에도 동일 `triggerSelectionHaptic()` 패턴 추가
- 클럽 홈 상단 클럽명 타이포를 소폭 확대하고, 클럽 상세 진입 시 클럽명이 헤더 아래에 오도록 초기 포커스 스크롤 적용
- 클럽 홈 내부 탭 전환(모임 홈/공지사항/책장) 시에도 클럽명 앵커 기준 포커싱되도록 스크롤 동기화

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 10:56:27 KST

- 모임 클럽 상세에서 하단 `모임` 탭 더블탭(기본 450ms) 시 모임 검색/목록 화면으로 복귀하는 동작을 추가
- 모임 채팅에서 `채팅 조 선택`, `전송` 버튼에 `selection` 햅틱을 추가하고, 모임 내부 탭 활성 스타일을 메인 컬러 배경 + 흰색 텍스트/아이콘으로 정리
- 책이야기/소식 상세보기에서도 하단 탭 재탭 시 상세 스크롤이 최상단으로 이동하도록 동작 추가
- 헤더 검색 UX(결과 카드 간격 축소, 입력창 왼쪽 돋보기 제거, 알림 아이콘 햅틱 제거) 및 마이페이지 설정 뒤로가기 UI(chevron 아이콘 + 텍스트, 설정 타이포 확대) 반영

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 11:42:55 KST

- 모임 탭 더블탭 동작을 분기 고도화: 탭 외부→모임 탭 더블탭 시 검색 목록 최상단 이동, 모임 탭 포커스 상태 더블탭 시 검색↔마지막 방문 클럽 전환(401/403/404 예외 처리 포함)
- 모임 검색 UI 간격 미세 조정: 클럽 카드 간격을 `spacing.sm - 2`로 축소하고, 카드 액션 버튼(`가입신청하기`/`방문하기`) 간격을 `6`으로 확대
- `docs/component-spacing-audit.md` 신규 작성: Home/Story/News/Meeting/MyPage/UserProfile/AppHeader/Auth 기준 컴포넌트 간 간격 인벤토리 정리
- spacing 인벤토리는 내부 패딩/정렬용 gap을 제외하고, 리스트/섹션/카드/탭 간 외부 간격 중심으로 정리

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 KST

### 리스트 아이템 간격 통일 (`spacing.sm = 12`)

카드/아이템 리스트 간격 기준을 `spacing.sm(12)`으로 통일. 아래 3곳이 이탈해 있어 수정함.

- `MeetingScreen.tsx` `groupList.gap`: `spacing.sm - 2(10)` → `spacing.sm(12)`
  - 토큰에서 벗어난 하드코딩 오프셋 제거
- `MeetingScreen.tsx` `bookshelfPostList.gap`: `spacing.xs(8)` → `spacing.sm(12)`
  - 같은 책장 섹션 내 다른 리스트들(`bookshelfGroupPostList`, `bookshelfBookSearchList`)과 통일
- `MyPageScreen.tsx` `listContainer.gap + paddingVertical`: `spacing.xs(8)` → `spacing.sm(12)`
  - `UserProfileScreen`의 동일 역할 `listContainer`(sm 기준)와 통일

AppHeader 내 `resultList`, `detailStoryList`는 헤더 팝업 컨텍스트 특성상 `xs(8)` 유지.

## 작업 파일
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 KST

### 섹션 타이틀 ↔ 리스트 간격 통일 (`spacing.sm = 12`)

홈/소식/모임 각 화면에서 섹션 타이틀과 바로 아래 리스트/컴포넌트 사이 간격을 `sm(12)`으로 통일.

- `HomeScreen.tsx` `headerContainer.gap`: `md(16)` → `sm(12)`
- `HomeScreen.tsx` `headerToStorySpacer`: JSX에서 제거, 책이야기 View에 `marginTop: xxs(4)` 추가하여 소식 타이틀 위 간격(16px)과 동일하게 보정
- `MeetingScreen.tsx` `content.gap`: `md(16)` → `sm(12)`
- 소식(NewsScreen)은 이미 `sm(12)` 기준이라 변경 없음

### 모임 ↔ 모임 검색 전환 로딩 화면 양방향 추가

기존에는 모임 홈 → 검색 방향만 로딩 오버레이가 있었음. 검색 → 모임 홈 방향도 동일하게 추가.

- `MeetingScreen.tsx` `openGroupHome`: 동기 → async 변경
  - `setOpeningClubLoading(true)` + `setActiveGroup(group)` → `waitForMinimumLoading` → `setOpeningClubLoading(false)` 순서로 처리
  - group home 위에 `BookFlipLoadingScreen` 오버레이 노출 후 해제
- `pendingOpenClubId` useEffect: `openGroupHome` 호출부에 `void` 키워드 추가
- 알림/마이페이지 등 외부 진입(`openClubId` param) 경로도 `pendingOpenClubId` → `openGroupHome` async 경유로 동일하게 로딩 커버됨

### 책이야기 탭바 정렬 및 활성 탭 강조

- `StoryScreen.tsx` `filterRow`: `flexGrow: 1` + `justifyContent: 'center'` 추가 → 탭 3개일 때 중앙 정렬, 모임 탭 늘어나면 스크롤
- `StoryScreen.tsx` `filterTabTextActive.color`: `gray6(#434343)` → `primary1(#7B6154)` → 하단 언더라인 색과 통일, 비활성 탭과 명확히 구분

## 작업 파일
- `src/screens/HomeScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/StoryScreen.tsx`

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 KST

### 책이야기 탭바 활성 탭 볼드 + 색상 수정

- `StoryScreen.tsx` `filterTabTextActive`: `typography.body1_2(500)` → `typography.body1(600)` 볼드 적용
- 색상: `primary1(#7B6154)` → `gray7(#2C2C2C)` 검정 계열로 변경

### docs/todo.md 신규 생성

- 미완료 작업 추적용 TODO 문서 생성 (`docs/todo.md`)
- 첫 항목: 소식 기본 이미지 추가 (800×600, 목록 카드/상세 히어로/캐러셀 세 곳 fallback 적용 예정)

## 작업 파일
- `src/screens/StoryScreen.tsx`
- `docs/todo.md`

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 22:49 KST

### docs/todo.md — issue-fetch 미완료 항목 및 역할 분류 추가
- `docs/issue-fetch.md` 기준으로 미처리 이슈 전체를 `docs/todo.md`에 이관
- 각 항목에 `BE` / `BE 문서` / `RN` / `공동` 역할 명시
- 마지막 업데이트 표기에 KST 시각 포함하도록 포맷 변경

### 소식 기본 이미지 통일 (`assets/images/news-default.png`)
- 800×600 PNG 1장을 `assets/images/news-default.png`로 추가
- `NewsScreen`, `HomeScreen`의 fallback 이미지 3종 배열(`fallbackPromotionImages`, `defaultPromotionImages`)을 `NEWS_DEFAULT_IMAGE` 단일 상수로 교체
- 적용 범위: 목록 썸네일 / 상세 히어로 / 프로모션 캐러셀 세 곳 모두 동일 이미지

### 미사용 에셋 정리
- 소식 샘플 이미지/SVG 삭제: `assets/images/news_sample2.png`, `news_sample3.png`, `background.png`, `assets/icons/news_sample.svg`, `news_sample4.svg`
- 미참조 아이콘 삭제: `BookImgSample.svg`, `booksample.svg`, `ClubDefaultImg.svg`, `default_profile_1.svg`, `default_profile_2.svg`, `profile.svg`, `profile2~5.svg`, `profile10.svg`

### 현재 에셋 현황 (정리 후)
| 용도 | 실사용 파일 | 비고 |
|------|-------------|------|
| 사용자 기본 프로필 | `assets/mypage/image_profile1.svg` | `DefaultProfileAvatar` 컴포넌트 |
| 모임 기본 이미지 | `assets/images/club-default.png` | `CLUB_DEFAULT_IMAGE` 상수, 카드 썸네일/상세 프로필/생성 미리보기 공통 |
| 책 표지 없음 | `assets/images/book-default.png` | `BOOK_DEFAULT_IMAGE` 상수, 내 서재/프로필/책장/발제 공통 |
| 소식 기본 이미지 | `assets/images/news-default.png` | 목록/상세/캐러셀 공통 |

## 작업 파일
- `src/screens/NewsScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `assets/images/news-default.png` (신규)
- `docs/todo.md`

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 23:24 KST

### 스플래시 이미지 교체
- Expo 기본 템플릿 플레이스홀더(`격자+동그라미`)를 `icon-checkmo.png`와 동일한 책모 로고 이미지로 교체
- `assets/splash-icon.png` 덮어쓰기 (1024×1024)
- `app.json` splash 경로(`./assets/splash-icon.png`) 변경 없음

## 작업 파일
- `assets/splash-icon.png`

---

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 KST

### docs/access — 화면별 접근 권한 문서 신규 작성

각 화면의 역할별(사용자/멤버/관리자/모임 내부 역할) 기능 권한을 정리한 마크다운 파일을 `docs/access/` 폴더에 추가함.

| 파일 | 대상 화면 | 역할 구성 |
|------|-----------|-----------|
| `access-home.md` | HomeScreen | 사용자/멤버/관리자 |
| `access-meeting.md` | MeetingScreen (검색/목록) | 사용자/멤버/관리자 |
| `access-club.md` | GroupHomeView (모임 내부) | 사용자/멤버/회원/운영진/개설자/관리자 |
| `access-story.md` | StoryScreen | 사용자/멤버/관리자 |
| `access-news.md` | NewsScreen | 사용자/멤버/관리자 |
| `access-mypage.md` | MyPageScreen | 사용자/멤버/관리자 |
| `access-userprofile.md` | UserProfileScreen | 사용자/멤버/관리자 |
| `access-auth.md` | AuthFlowScreen | 사용자/멤버 |

각 문서에는 기능별 권한 표, BE API 경로(permitAll/authenticated/admin), 주의사항을 포함함.

### 파일명 변경

- `codex.md` → `agent-log.md` (에이전트 작업 로그 파일명 통일)

## 작업 파일
- `docs/access/access-home.md` (신규)
- `docs/access/access-meeting.md` (신규)
- `docs/access/access-club.md` (신규)
- `docs/access/access-story.md` (신규)
- `docs/access/access-news.md` (신규)
- `docs/access/access-mypage.md` (신규)
- `docs/access/access-userprofile.md` (신규)
- `docs/access/access-auth.md` (신규)

---

## 업데이트 (2026-04-29)

수정 시각: 2026-04-29 09:35:40 KST

### Typography 토큰 통일 및 재발 방지 적용

- `fontSize`/`lineHeight`/`letterSpacing` 하드코딩을 RN `src/**` 기준 0건으로 정리
- `typography`에 역할형 토큰을 확장(`subhead5`, `body1_4`, `caption1_3*`, `body1_3_relaxed` 등)해 15/16 및 커스텀 line-height/tracking을 토큰으로 승격
- 재발 방지 스크립트 `scripts/check-typography-hardcode.sh` 추가 및 `package.json` 스크립트(`check:typography`, `check:typography:staged`) 연결
- `docs/todo.md`, `font.md` 업데이트 및 `npm run check`(typography + typecheck + doctor) 전체 통과 확인

## 작업 파일
- `src/theme/typography.ts`
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/components/common/BookFlipLoadingScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/UserProfileScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/NewsScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `scripts/check-typography-hardcode.sh` (신규)
- `package.json`
- `tsconfig.json`
- `font.md`
- `docs/todo.md`

---

## 업데이트 (2026-04-29)

수정 시각: 2026-04-29 KST

### UI 통일 1번 — 문구/카피 규칙 통일 완료

- `~중` 표기 기준 확정: 상태 라벨형(`구독중`, `로딩중` 등)은 공백 없이, 진행 동작형(`업로드 중...` 등)은 공백 + 말줄임표
- `MeetingScreen`, `MyPageScreen`, `AuthFlowScreen` 등 전체 화면 치환 완료 (1차 정리 대상 전부 처리)
- 오류 메시지 기술 용어 → 사용자 친화 문구로 교체 (`이미지 업로드 URL 발급에 실패` → `이미지 업로드 준비에 실패` 등)
- `docs/todo.md` 1번 항목 ✅ 완료 처리

### UI 통일 2번 — 로딩 피드백 규칙 통일 완료

- `App.tsx` 부팅 로더: 1500ms 고정 타이머 제거 → `AuthGateContext.isReady` 이벤트 기반으로 전환
  - `AuthGateContext`에 `isReady` 상태 추가 (로그인 상태 조회 완료 시 true)
  - 부팅 로더를 `bootOverlay`(zIndex 2000)로 재구성, NavigationContainer는 항상 마운트
- `AuthGateContext` 전환 로더: 1200ms → `AUTH_TRANSITION_MS = 400ms` 상수로 단축
- `StoryScreen`: `isLoadingMore` 리스트 하단 인라인 피드백(`불러오는 중...`) 추가
- `docs/loading-screen.md` 변경 내용 반영 및 최신화
- `docs/todo.md` 2번 항목 ✅ 완료 처리 + 직접 테스트 필요 섹션 추가

### UI 통일 3번 — 버튼 규격 통일 완료

- `PrimaryButton.tsx` → `AppButton` 통합 컴포넌트로 강화
  - `variant`: `primary` / `secondary` / `outline` / `danger`
  - `size`: `lg(52px)` / `md(paddingVertical 14)`
  - `loading` + `loadingLabel` prop (버튼 비활성화 + 문구 자동 전환)
  - `fullWidth` prop (`flex: 1`)
  - 기존 `PrimaryButton` / `SecondaryButton` export는 호환성 alias로 유지
- `AuthFlowScreen` 전체 주요 CTA 버튼 AppButton으로 교체
  - 기존 `primaryButton` / `secondaryButton` / `buttonFlex` / `termsModalActionButton` 스타일 정의 제거
  - 로그인·아이디찾기·비밀번호재발급·회원가입 각 스텝의 loading 상태를 `loadingLabel` prop으로 통합
- `docs/todo.md` 3번 항목 ✅ 완료 처리

## 작업 파일
- `App.tsx`
- `src/contexts/AuthGateContext.tsx`
- `src/components/common/PrimaryButton.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/UserProfileScreen.tsx`
- `docs/loading-screen.md`
- `docs/todo.md`

---

## 업데이트 (2026-04-29)

수정 시각: 2026-04-29 KST

### UI 통일 4번 — 입력 폼 규격 통일 완료

- `src/constants/inputLimits.ts` 신규: `INPUT_LIMITS` 상수 (BE 스펙 기준 전 필드 길이 제한 중앙화)
  - `NICKNAME(20)`, `USER_NAME(10)`, `USER_DESCRIPTION(40)`, `CLUB_NAME(40)`, `CLUB_DESCRIPTION(500)`, `CLUB_REGION(40)`, `CLUB_LINK_LABEL(20)`, `CLUB_LINK_URL(100)`, `APPLY_REASON(300)`, `BOOKSHELF_COMPOSER(300)`, `REPORT_CONTENT(500)`
- `src/theme/inputStyles.ts` 신규: 입력 스타일 토큰
  - `base` (단일 행, height 56, borderColor gray2, paddingHorizontal md)
  - `multiline` (여러 줄, minHeight 88, textAlignVertical top)
  - `placeholderColor: colors.gray3`
- `src/theme/index.ts`: `inputStyles` export 추가
- `AuthFlowScreen`: 모든 `maxLength` 하드코딩 → INPUT_LIMITS 교체, 이름 필드에 누락된 `maxLength` 추가
- `MyPageScreen`: 소개 20자 → 40자 버그 수정 (BE 스펙은 40자였음), INPUT_LIMITS 적용
- `MeetingScreen`: `MEETING_SEARCH_KEYWORD_MAX_LENGTH` + 9개 하드코딩 maxLength → INPUT_LIMITS 교체, bookshelfComposer 카운터 표시 동기화
- `ReportMemberModal`: `maxLength={500}` → `INPUT_LIMITS.REPORT_CONTENT`
- `MeetingListCard`: `maxLength={300}` → `INPUT_LIMITS.APPLY_REASON`
- `AppHeader`: 드롭다운 검색창 `placeholderTextColor` gray2 → gray3 통일
- `docs/todo.md` 4번 항목 ✅ 완료 처리

## 작업 파일
- `src/constants/inputLimits.ts` (신규)
- `src/theme/inputStyles.ts` (신규)
- `src/theme/index.ts`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/components/common/AppHeader.tsx`
- `docs/todo.md`

---

## 업데이트 (2026-04-29) — 입력 한도 토스트

수정 시각: 2026-04-29 KST

### 입력 한도 도달 시 토스트 피드백 추가

- `src/utils/input.ts` 신규: `withLimitToast(onChange, maxLength)` 헬퍼
  - `onChange`를 감싸고, `text.length >= maxLength`이면 `최대 N자까지 입력할 수 있습니다.` 토스트 노출
- 적용 필드 (총 12개):
  - **AuthFlowScreen**: 닉네임(20), 소개(40), 이름(10)
  - **MyPageScreen**: 소개(40)
  - **MeetingScreen**: 발제/한줄평(300), 모임이름 수정(40), 소개 수정(500), 지역 수정(40), 모임이름 생성(40), 소개 생성(500), 지역 생성(40), 링크 텍스트(20), 링크 URL(100)
  - **ReportMemberModal**: 신고 내용(500)
  - **MeetingListCard**: 신청 사유(300)
- `docs/todo.md`: 카운터 추가 여부 검토 항목 추가, 테스트 항목 추가

## 작업 파일
- `src/utils/input.ts` (신규)
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `src/components/feature/groups/MeetingListCard.tsx`
- `docs/todo.md`

---

## 업데이트 (2026-04-29)

수정 시각: 2026-04-29 KST

### UI 통일 5번 — spacing 토큰 통일 완료

- spacing 관련 속성 하드코딩 54건 → 0건(정책 예외 제외)
- 예외 정책 확정 후 `src/theme/spacing.ts`에 주석으로 명시
  - 허용: `0`, 음수 보정값, `2·3·6`(미세 조정), `10·13·14·18` 등 컴포넌트 전용 디자인값
  - 금지: spacing 토큰값(`4/8/12/16/20/24/32`)을 직접 숫자로 입력하는 경우
- 교체 적용 파일 및 내용:
  - `MeetingListCard`: `gap:4→xxs`, `paddingHorizontal:8→xs`, `gap:8→xs`(2곳)
  - `BottomTabs`: `paddingTop/Bottom:8→xs`, `spacing` import 추가
  - `BookFlipLoadingScreen`: `marginTop:14→sm`
  - `MeetingScreen`: `gap:4→xxs`(filterRow), `paddingVertical:4→xxs`(inputDescenderSafe)
  - `MyPageScreen`: `paddingVertical:4→xxs`(inputFieldDescenderSafe/inputFieldEmail)
  - `AuthFlowScreen`: `paddingVertical:4→xxs`(inputDescenderSafe)
  - `StoryScreen`: `marginTop:4→xxs`(replyPrefix)
- `scripts/check-spacing-hardcode.sh` 신규 추가 — 토큰값 하드코딩 재발 방지
- `package.json`: `check:spacing`, `check:spacing:staged` 스크립트 추가, `npm run check`에 통합
- `docs/todo.md` 5번 항목 ✅ 완료 처리

## 작업 파일
- `src/theme/spacing.ts`
- `src/navigation/BottomTabs.tsx`
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/components/common/BookFlipLoadingScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `scripts/check-spacing-hardcode.sh` (신규)
- `package.json`
- `docs/todo.md`

---

## 업데이트 (2026-04-29)

수정 시각: 2026-04-29 KST

### UI 통일 6번 — radius/border/shadow 통일 완료

- `borderRadius` 하드코딩 58건 → 0건(정책 예외 제외)
  - `4 → radius.xs`: dot/tag/checkbox/thumb 등 (AppHeader, NewsScreen, NewsPromotionCarousel, MeetingListCard, MeetingScreen, MyPageScreen)
  - `8 → radius.sm`: 인디케이터 활성 pill (NewsScreen, NewsPromotionCarousel)
  - `12 → radius.md`: 드롭다운 썸네일, 토글 트랙 (AppHeader, MyPageScreen)
  - `16 → radius.lg`: 카드/알림 패널 (AppHeader × 2)
  - `999 → radius.pill`: 핸들바, 색상 선택 원형 (MeetingScreen, AuthFlowScreen, MyPageScreen)
  - `spacing.xs/md` borderRadius 오용 → `radius.sm/lg` 교정 (AppHeader × 5)
  - `spacing.xs` → `radius.sm`: 책 표지 이미지 shadow 컨테이너 (BookStoryCard, BookStoryFeedCard)
  - 예외 유지: 원형 아바타 width/2 값(9·16·20·21·44·46·48 등), 컴포넌트 전용 shape(10·11·13·14·18·19·23·32 등)
- `shadowColor: '#000'` / `'#000000'` 11건 → `colors.black` 교체
  - ActionMenu, ToastHost, HomeColumns, BottomTabs, HomeScreen, StoryScreen(×2), MeetingScreen(×2), BookStoryCard, BookStoryFeedCard
- `src/theme/radius.ts` 예외 정책 주석 추가
- `docs/todo.md` 6번 항목 ✅ 완료 처리

## 작업 파일
- `src/theme/radius.ts`
- `src/components/common/AppHeader.tsx`
- `src/components/common/ActionMenu.tsx`
- `src/components/common/ToastHost.tsx`
- `src/components/feature/bookstory/BookStoryCard.tsx`
- `src/components/feature/bookstory/BookStoryFeedCard.tsx`
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/components/feature/news/NewsPromotionCarousel.tsx`
- `src/components/feature/home/HomeColumns.tsx`
- `src/navigation/BottomTabs.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/NewsScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `docs/todo.md`

## 업데이트 (2026-04-28)

수정 시각: 2026-04-28 KST

### UI 통일 7번 — 모달/바텀시트 패턴 통일 완료

- `DialogOverlay` 공용 컴포넌트 신규 생성 (`src/components/common/DialogOverlay.tsx`)
  - `Modal transparent animationType="fade"` + 백드롭 Pressable(close) + 카드 Pressable(stopPropagation) 패턴 캡슐화
  - `overlayStyle`, `cardStyle` prop으로 각 화면 스타일 그대로 사용
  - `withKeyboard` prop으로 KeyboardAvoidingView 선택 추가
- `BottomSheet` 공용 컴포넌트 신규 생성 (`src/components/common/BottomSheet.tsx`)
  - `Modal transparent animationType="slide"` + KeyboardAvoidingView + 백드롭/시트 Pressable 패턴 캡슐화
  - `backdropStyle`, `sheetStyle`, `keyboardBehavior` prop 지원
- 인라인 Modal 9건 → 공용 컴포넌트 교체
  - MeetingScreen 5건: bookshelfComposer(+keyboard), noticeBookSelector, contactModal, regularChatPicker, voteVotersModal
  - MyPageScreen 1건: defaultAvatarPicker
  - AuthFlowScreen 2건: termsModal, profileColorModal
  - StoryScreen 1건: bookPicker (BottomSheet)
- 미사용 `Modal` import 3개 제거 (AuthFlowScreen, StoryScreen, MyPageScreen)
- `docs/todo.md` 7번 항목 ✅ 완료 처리

## 작업 파일
- `src/components/common/DialogOverlay.tsx` (신규)
- `src/components/common/BottomSheet.tsx` (신규)
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `docs/todo.md`

## 업데이트 (2026-04-29)

수정 시각: 2026-04-29 KST

### UI 통일 8번 — 모션/햅틱 규칙 통일 완료

- `BottomTabs`: `Haptics.selectionAsync()` 직접 호출 → `triggerSelectionHaptic()` 경유, `expo-haptics` import 제거
- `BookFlipLoadingScreen`: `useNativeDriver: false` 2건 이유 주석 추가 (width 애니메이션)
- `MyPageScreen`: `useNativeDriver: false` 이유 주석 추가 (backgroundColor 애니메이션)
- `MeetingScreen`: 시트 드래그(`MGMT_SHEET_*`) · 채팅 스와이프백(`CHAT_SWIPE_*`) PanResponder 임계값 상수화 (값 동일 유지)
- `docs/todo.md` 8번 ✅ 완료 처리

## 작업 파일
- `src/navigation/BottomTabs.tsx`
- `src/components/common/BookFlipLoadingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `docs/todo.md`

---

### UI 통일 9번 — 피드백 문구 통일 완료

- Alert 메시지 본문 요→니다체 3건 수정
  - `'${group.name}' 모임에서 탈퇴할까요?` → `탈퇴하시겠습니까?`
  - `이 글을 삭제할까요?` → `삭제하시겠습니까?`
  - `신고하기를 이용해주세요.` → `이용해 주십시오.`
- Alert 버튼 레이블: 이미 취소/동사 형태로 일관 확인 (변경 없음)
- 토스트 71건 어투 통일은 별도 todo(`⬜ 토스트 문구 어투 통일`)로 분리
- `docs/todo.md` 9번 ✅ 완료 처리

## 작업 파일
- `src/screens/MyPageScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/UserProfileScreen.tsx`
- `docs/todo.md`

---

### UI 통일 10번 — 접근성 기준 보강 완료

- `IconButton`: `accessibilityLabel?: string` prop 추가, `accessibilityRole="button"` 기본 탑재
- `FloatingActionButton`: 동일하게 prop 추가 + role 기본 탑재
- `AppHeader`: `HeaderAction` type에 `label` 필드 추가, 검색·알림·뒤로가기·검색어지우기 라벨 연결
- `StoryScreen`: 책피커 닫기·검색어지우기·글작성 FAB 라벨
- `MeetingScreen`: 채팅조선택 FAB 라벨
- `NewsScreen`: 문의하기 FAB 라벨
- **UI 통일 10개 항목 전체 ✅ 완료**
- `docs/todo.md` 10번 + 총괄 항목 ✅ 완료 처리

## 작업 파일
- `src/components/common/IconButton.tsx`
- `src/components/common/FloatingActionButton.tsx`
- `src/components/common/AppHeader.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/NewsScreen.tsx`
- `docs/todo.md`

---

## 업데이트 (2026-04-30)

수정 시각: 2026-04-30 KST

### 로그아웃 후 홈 탭 이동 버그 수정

- `MyPageScreen` 로그아웃 성공 시 `navigation.navigate('Home')` → `navigateToHome(navigation)` 교체
- `navigate('Home')`은 스택 내에서만 동작해 중첩 탭 구조(`Tabs > Home`)를 제대로 찾지 못했음
- `navigateToHome` 유틸이 부모 navigator를 순회해 Tabs navigator를 찾아 올바르게 이동

## 작업 파일
- `src/screens/MyPageScreen.tsx`
- `docs/todo.md`

---

## 업데이트 (2026-04-30)

수정 시각: 2026-04-30 KST

### README — `npx expo start` 실행 방법 추가

- 스크립트 목록에 `npm run *` / `npx expo start --*` 대응 명령 병기
- 빠른 실행 섹션(3번 항목)을 `npx expo start` 중심으로 재구성
  - 실행 후 `i` / `a` / `w` 키 입력으로 기기 선택하는 방법 안내
  - `--ios`, `--android`, `--web`, `--tunnel`, `--clear` 플래그 정리

## 작업 파일
- `README.md`

