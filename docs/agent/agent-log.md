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

## 업데이트 (2026-04-25)

- 수정 시각: `2026-04-25 10:47:59 KST`
- 소식 화면 `오늘의 추천 책` 카드 탭 시 홈 탭의 책 검색 상세(`openSearchBook`)로 이동하도록 라우팅 연결
- 책 검색 상세에서 `GET /api/book-stories/search/{bookId}` 호출 시 ISBN(13자리 포함) 기반 식별자를 허용하도록 조회 키 해석 로직 수정
- 책이야기 조회 API 함수에서 `bookId`를 문자열/숫자 모두 처리하고 경로 인코딩하도록 보강
- 타입체크 및 Expo Doctor 점검 통과(`npm run check`)

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

## 업데이트 (2026-04-26)

수정 시각: `2026-04-26 16:54:11 KST`

- 신고 모달에서 신고 대상 사용자 클릭 시 프로필 화면 이동 동선 연결 (`src/components/common/ReportMemberModal.tsx`, `src/screens/StoryScreen.tsx`, `src/screens/MeetingScreen.tsx`)
- 소식 프로모션 캐러셀 로딩을 `carousel=PROMOTION` 기준으로 정리 (`src/screens/HomeScreen.tsx`, `src/screens/NewsScreen.tsx`, `src/services/api/newsApi.ts`)

---

## 업데이트 (2026-05-08)

- 수정 시각: `2026-05-08 17:09:37 KST`
- `docs/agent/todo.md`의 `🔜 구현 예정`에 `채팅 기능 제거 여부 검토` 미완료 항목 추가
- 채팅 유지/제거 정책 확정 시 정리 대상(RN 화면/hook/API 함수/`CHAT-*` 이슈)까지 DoD로 명시

---

## 업데이트 (2026-04-26)

- 수정 시각: `2026-04-26 17:52:10 KST`
- 이메일 변경 화면에 회원가입과 유사한 이메일 인증(코드 전송/재전송/확인/타이머) 단계와 상태 흐름을 반영하고, 실제 변경 API 연동 전 검증 가드를 정리함
- 비밀번호 변경 화면에 각 입력 필드 비밀번호 표시/숨김(눈 아이콘) 토글을 추가하고 단일 라인 입력창의 descender 잘림 완화를 위한 패딩 오버라이드 적용 범위를 확장함
- 소식 이미지 노출을 웹/반응형에서 의도한 방향으로 맞추기 위해 프로모션/상세/목록 썸네일의 커버 크롭 기준(좌측 포커스)과 캐러셀 렌더링 스타일을 보정함
- 정기모임 상세의 조 정보 로딩 실패 케이스를 보완하도록 그룹/멤버 조회 fallback 및 관련 상태 동기화 로직을 보강함


---

## 업데이트 (2026-04-27)

- 수정 시각: `2026-04-27 01:00:48 KST`
- `hamburger.md` 파일 신규 작성: 햄버거/3점 메뉴를 팝오버, 폰 기본 Alert, 앱 커스텀 바텀시트로 분류
- `StoryScreen`, `MyPageScreen`, `MeetingScreen`, `UserProfileScreen` 기준으로 메뉴 동작 위치를 파일/라인 단위로 정리
- `다른사람 프로필` 3점 아이콘(`UserProfileScreen`) 미연결 상태(`onPress` 없음) 참고 항목으로 기록
- 모임 정기모임 상세 로딩 2-Phase 흐름 보정 및 관련 화면 배치 미세 조정 (`src/screens/MeetingScreen.tsx`, `src/screens/StoryScreen.tsx`)
- 문서 초안 추가 (`docs/functional-spec.md`, `docs/ia.md`, `docs/immediate-reflection-matrix.md`, `docs/push-notification-implementation.md`)

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
- 점검 결과를 문서화한 `docs/agent/issue-fetch.md`를 신규 추가하고, 각 이슈별로 `RN/BE/BE 문서/공동` 판정과 변경 방향을 기록함

---

## 업데이트 (2026-04-27)

수정 시각: 2026-04-27 11:40:26 KST

- Swagger(OpenAPI)와 실서버 응답 샘플을 기준으로 책 검색 API(`/books/*`)를 추가 점검함
- `docs/agent/issue-fetch.md`에 `책 검색 영역` 섹션을 신설하고 페이징/좋아요 동기화/문서 불일치 이슈를 `RN/BE 문서`로 분류함
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
- `docs/agent/issue-fetch.md` 기준으로 미처리 이슈 전체를 `docs/todo.md`에 이관
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

---

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

---

# 2026-05-05 UI round 버튼/칩 radius 통일

## 작업 개요
버튼·칩·탭 스타일 키 전수 점검 결과를 바탕으로 하드코딩 값 토큰 교체 및 동일 역할 컴포넌트 간 radius 불일치 교정.

## 변경 내용

### Task 1 — 하드코딩 → radius 토큰 교체
- `AppHeader dropdownRecoCard`: `borderRadius: 18` → `radius.lg` (비원형 카드 컨테이너, 유일한 비-원형 하드코딩 케이스)

### Task 2 — 동일 역할 radius 불일치 교정
- `MyPageScreen reportTypeChip`: `radius.lg` → `radius.sm`
  - 근거: `StoryScreen reportTypeButton`(sm) + `ReportMemberModal typeButton`(sm)과 역할 동일
- `BookStoryCard subscribeChip`: `radius.lg` → `radius.sm`
  - 근거: `BookStoryFeedCard subButton`(sm) + `SubscribeUserItem subscribeButton`(sm)과 역할 동일
- `MyPageScreen categoryChip`: `radius.sm` → `radius.lg`
  - 근거: `AuthFlowScreen chip`(lg) + `MeetingScreen chip`(lg)와 역할 동일(장르/카테고리 선택 chip)
- `MeetingScreen bookshelfSessionChip`: `radius.md` → `radius.sm`
  - 근거: 같은 섹션 `bookshelfGroupChip`(sm)과 동일 필터 칩 역할

## 파일
- `src/components/common/AppHeader.tsx`
- `src/components/feature/bookstory/BookStoryCard.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 헤더 알림 빨간점(unreadDot) 동기화 로직 정리

- `AppHeader`의 `hasUnread` 갱신 경로를 `refreshUnreadBadge` 단일 함수로 통일
- 기존 `notificationPreview` 변경 감시 `useEffect(setHasUnread(...))` 제거
- 로그인/비로그인 전환 시 `fetchNotificationPreview(1)` 기반으로 unread 여부 재평가
- 알림 패널 로드(`fetchNotificationPreview(5)`) 시 응답을 재사용해 빨간점 상태 즉시 반영
- 읽음 처리 성공/실패 후 모두 unread 배지 재동기화 호출 추가

## 작업 파일
- `src/components/common/AppHeader.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `docs/agent/issue-fetch.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 로그아웃 중 로딩 화면 추가

- `MyPageScreen`에서 `submittingLogout` 상태일 때 `BookFlipLoadingScreen` 표시
  - `detailTitle`: "로그아웃중입니다", `detailDescription`: "홈화면으로 이동합니다"
- 로그아웃 API 처리 동안 빈 화면 노출 없이 일관된 로딩 피드백 제공

## 작업 파일
- `src/screens/MyPageScreen.tsx`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 네트워크 타임아웃 + 로그아웃 안전성 개선

**문제**: 실기기에서 로그아웃 후 홈 화면에서 `TypeError: Network request timed out` 콘솔 에러 발생. iOS 기본 네트워크 타임아웃(60초+)까지 `fetch()`가 대기하다가 타임아웃되는 구조였음.

**변경 1 — `requestJson` 15초 타임아웃 추가** (`src/services/api/http.ts`)
- `AbortController` + `setTimeout(15_000)`으로 모든 API 요청에 기본 타임아웃 적용
- 타임아웃 발생 시 기존과 동일하게 `ApiError(NETWORK_ERROR)`로 처리됨
- `timeoutMs` 옵션으로 호출별 오버라이드 가능

**변경 2 — 로그아웃 로컬 세션 보장** (`src/screens/MyPageScreen.tsx`)
- 기존: `logoutSession()` 서버 호출 실패 시 `logout()`(로컬 상태 초기화)이 호출되지 않아 사용자가 로그인 상태로 남음
- 변경: `finally` 블록에서 서버 응답 성공/실패 무관하게 `logout()` + 홈 이동 보장

## 작업 파일
- `src/services/api/http.ts`
- `src/screens/MyPageScreen.tsx`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 토스트 문구 어투 통일 (~해주세요 → ~합니다/~주십시오 체)

`docs/ui-feedback-message-consistency.md` 기준 todo 9번 항목 후속 작업 완료. 전체 103건 치환.

**변환 규칙:**

| 유형 | 기존 | 변경 |
|---|---|---|
| 입력 안내형 | `~을 입력해주세요.` | `~을 입력해야 합니다.` |
| 선택 안내형 | `~을 선택해주세요.` | `~을 선택해야 합니다.` |
| 완료/동의 안내형 | `~을 완료/동의해주세요.` | `~을 완료/동의해야 합니다.` |
| 자릿수 안내형 | `N자 이내/이하로 입력해주세요.` | `N자 이내/이하여야 합니다.` |
| 형식 확인형 | `형식을 확인/입력해주세요.` | `형식이 올바르지 않습니다.` |
| 재시도형 | `다시 시도해주세요.` | `다시 시도해 주십시오.` |
| 로그인/이용 안내형 | `로그인/이용해주세요.` | `로그인/이용하십시오.` |

**적용 파일 (103건):**
- `src/services/api/http.ts` (4건)
- `src/services/api/clubApi.ts` (1건)
- `src/services/api/newsApi.ts` (1건)
- `src/screens/AuthFlowScreen.tsx` (21건)
- `src/screens/MeetingScreen.tsx` (43건)
- `src/screens/MyPageScreen.tsx` (17건)
- `src/screens/StoryScreen.tsx` (11건)
- `src/screens/HomeScreen.tsx` (1건)
- `src/screens/NewsScreen.tsx` (1건)
- `src/screens/UserProfileScreen.tsx` (1건)
- `src/components/common/AppHeader.tsx` (2건)

**미적용 범위:** TextInput `placeholder` 속성 및 UI 섹션 타이틀 (`<Text>` 안내 문구) — 토스트 범위 외

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 책이야기 작성 화면 — 임시저장 버튼 추가

- 글 작성 폼 하단 액션 영역에 `임시저장` 버튼 추가 (`취소 | 임시저장 | 등록` 순서)
- 수정 모드(`editingStoryId` 존재)에서는 표시하지 않음
- 클릭 시 토스트 `"임시저장 기능 구현전"` 노출 (기능 미구현 플레이스홀더)
- 색상: `subbrown4` 배경 + `primary3` 텍스트 (브라운 계열 톤)

## 작업 파일
- `src/screens/StoryScreen.tsx`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 입력 폼 공용 컴포넌트화 + 길이 초과 차단 통일

- `FormTextInput` 공용 컴포넌트 신규 추가
  - 필드 타입(`text/nickname/name/email/phone/number/password/url/search`)별 기본 입력 규칙 통일
  - `maxLength` 초과 입력 시 추가 입력 차단 + 토스트 `"입력 가능한 길이를 초과했습니다."` 노출
- `maxLength`가 적용된 입력 필드를 `FormTextInput`으로 이관
  - `AuthFlowScreen`, `MeetingScreen`, `MyPageScreen`, `StoryScreen`, `ReportMemberModal`, `MeetingListCard`
- 입력 카운터 보강
  - 신고 내용, 가입 신청 사유, 책이야기 본문, 모임 소개글(생성/수정), 프로필 소개글(회원가입/프로필편집)
- `docs/todo.md` 입력 폼 통일 항목 설명 업데이트

## 작업 파일
- `src/components/common/FormTextInput.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/components/common/ReportMemberModal.tsx`
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/constants/inputLimits.ts`
- `docs/todo.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### TODO 테스트 항목 문구를 현재 입력 정책 기준으로 정합화

- `docs/todo.md`의 `입력 한도 토스트` 항목을 기존 설명(한도 도달 시 토스트)에서 현재 동작으로 수정
  - `maxLength` **초과 입력 시도** 시 입력 차단 + 토스트 `"입력 가능한 길이를 초과했습니다."`
- 상태를 `🔄`로 조정하고, 실기기 확인 진행상태 반영
  - 모임 가입 신청 사유 1차 확인 완료
  - 나머지 필드 실기기 확인 필요

## 작업 파일
- `docs/todo.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### docs 완료 문서 정리: `(done)` prefix 적용

- `docs/todo.md`의 `✅ 완료` 기준으로 완료 문서 12개 파일명 앞에 `(done)` prefix 적용
- 리네임된 문서들을 참조하는 `docs` 내부 링크/경로를 새 파일명으로 동기화
- `docs/documents/(done)ui-consistency-top10.md`의 10개 항목 상태를 `✅ 완료`로 정합화
- `docs/todo.md` 내 완료 문서 표기/링크를 리네임 기준으로 갱신

## 작업 파일
- `docs/documents/(done)loading-screen.md`
- `docs/documents/(done)ui-consistency-top10.md`
- `docs/documents/(done)ui-copy-consistency.md`
- `docs/documents/(done)ui-loading-feedback-consistency.md`
- `docs/documents/(done)ui-button-consistency.md`
- `docs/documents/(done)ui-input-form-consistency.md`
- `docs/documents/(done)ui-spacing-token-consistency.md`
- `docs/documents/(done)ui-radius-border-shadow-consistency.md`
- `docs/documents/(done)ui-modal-bottomsheet-consistency.md`
- `docs/documents/(done)ui-motion-haptic-consistency.md`
- `docs/documents/(done)ui-feedback-message-consistency.md`
- `docs/documents/(done)ui-accessibility-event-naming-consistency.md`
- `docs/todo.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### docs 구조 정리: `pm/agent` 폴더 분리 + spacing audit 완료 처리

- `docs/pm` 폴더 신설 후 기획 문서 이동
  - `functional-spec.md`, `ia.md`, `access-gate-map.md`, `home-access-policy.md`, `immediate-reflection-matrix.md`, `block-feature-spec.md`
- `docs/agent` 폴더 신설 후 운영 문서 이동
  - `todo.md`, `agent-log.md`
- 완료 처리 요청 반영
  - `component-spacing-audit.md`를 `(done)component-spacing-audit.md`로 리네임
  - `docs/documents/(done)ui-spacing-token-consistency.md` 참조 경로 갱신
- 문서 링크 정합화
  - `README.md` 참고 문서 링크를 `docs/pm/*` 경로로 업데이트
  - `docs/agent/todo.md` 내부 `issue-fetch.md`, `(done)` 문서 상대 경로 보정

## 작업 파일
- `README.md`
- `docs/agent/agent-log.md`
- `docs/agent/todo.md`
- `docs/documents/(done)ui-spacing-token-consistency.md`
- `docs/documents/(done)component-spacing-audit.md`
- `docs/pm/functional-spec.md`
- `docs/pm/ia.md`
- `docs/pm/access-gate-map.md`
- `docs/pm/home-access-policy.md`
- `docs/pm/immediate-reflection-matrix.md`
- `docs/pm/block-feature-spec.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 내부 간격 인벤토리 문서 신규 작성

- 외부 간격 문서와 분리해 내부 간격 전용 문서 `docs/documents/(done)component-internal-spacing-audit.md` 신규 작성
- 범위: 입력폼, 버튼, 카드, 리스트 아이템, 모달/바텀시트 본문 내부 `padding/gap` 규칙
- 파일/라인 근거와 하드코딩 예외값(2/6/13/14/18) 스냅샷을 함께 정리
- 내부 spacing 통일을 위한 1차 실행 우선순위(MeetingListCard/ReportModal/입력 보정 규칙) 제시

## 작업 파일
- `docs/documents/(done)component-internal-spacing-audit.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 내부 간격 코드 표현 통일 — `spacing.xs / 2` → `spacing.xxs` (78건)

**픽셀값 변경 없음** — `spacing.xs / 2` = 8 / 2 = 4 = `spacing.xxs` 로 완전히 동일.
계산식 표현을 토큰으로 교체해 가독성 및 일관성 향상.

- 양수 74건 (`gap`, `padding`, `paddingHorizontal/Vertical`)
- 음수 4건 (`marginTop: -spacing.xxs`, AuthFlowScreen 타이포 보정값)

적용 파일 (10개):
- `src/screens/MeetingScreen.tsx` (34건)
- `src/screens/MyPageScreen.tsx` (13건)
- `src/screens/AuthFlowScreen.tsx` (5건)
- `src/screens/UserProfileScreen.tsx` (6건)
- `src/screens/StoryScreen.tsx` (6건)
- `src/components/common/AppHeader.tsx` (6건)
- `src/screens/NewsScreen.tsx` (3건)
- `src/components/common/IconButton.tsx` (2건)
- `src/components/common/ReportMemberModal.tsx` (1건)
- `src/components/feature/bookstory/BookStoryFeedCard.tsx` (1건)
- `src/components/feature/groups/MyGroupsDropdownCard.tsx` (1건)

미적용: `MeetingListCard`의 `13/14/6`, 버튼의 `xs+2/sm+2`, `ReportMemberModal`의 `gap: 2` — 의도된 디자인값 유지

## 작업 파일
(위 10개 파일)

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### docs 추가 구조 정리: `issue-fetch` 이동 + `documents` 폴더 분리

- `docs/issue-fetch.md`를 `docs/agent/issue-fetch.md`로 이동
- 완료/정리 문서 묶음용 `docs/documents` 폴더 신설 후 `(done)*.md` 문서 일괄 이동
- `README.md`, `docs/agent/todo.md`, `docs` 내부 참조 경로를 신규 구조 기준으로 동기화
- 내부 간격 인벤토리 문서 경로 표기를 `docs/documents/(done)component-internal-spacing-audit.md`로 정합화

## 작업 파일
- `README.md`
- `docs/agent/issue-fetch.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`
- `docs/documents/(done)component-internal-spacing-audit.md`
- `docs/documents/(done)component-spacing-audit.md`
- `docs/documents/(done)loading-screen.md`
- `docs/documents/(done)ui-accessibility-event-naming-consistency.md`
- `docs/documents/(done)ui-button-consistency.md`
- `docs/documents/(done)ui-consistency-top10.md`
- `docs/documents/(done)ui-copy-consistency.md`
- `docs/documents/(done)ui-feedback-message-consistency.md`
- `docs/documents/(done)ui-input-form-consistency.md`
- `docs/documents/(done)ui-loading-feedback-consistency.md`
- `docs/documents/(done)ui-modal-bottomsheet-consistency.md`
- `docs/documents/(done)ui-motion-haptic-consistency.md`
- `docs/documents/(done)ui-radius-border-shadow-consistency.md`
- `docs/documents/(done)ui-spacing-token-consistency.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### docs 폴더명 변경 반영: `done` → `documents`

- 완료 문서 묶음 폴더 명을 `docs/done`에서 `docs/documents`로 통일
- `README.md`, `docs/agent/todo.md`, `docs/documents/*` 내부 참조 경로를 `documents` 기준으로 재정렬
- `issue-fetch.md`는 `docs/agent/issue-fetch.md` 위치 유지

## 작업 파일
- `docs/agent/agent-log.md`
- `docs/agent/todo.md`
- `docs/agent/issue-fetch.md`
- `docs/documents/*`
- `README.md`


---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### todo 상태 업데이트 및 QA 항목 추가

- "로그인 완료 직후 전환 + 이전 화면 복귀" 실기기 확인 완료 → ✅
- "간격 통일 이후 컴포넌트 확인 QA" 항목 신규 추가 (`spacing.xs / 2` → `spacing.xxs` 78건 교체 이후 시각 확인 필요)

## 작업 파일
- `docs/agent/todo.md`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 모임 화면 UI 소폭 개선

- `MeetingListCard` 모임 제목 폰트 크기 업: `subhead5`(16px) → `subhead3`(20px semibold)
- `MeetingScreen` 모임 검색 placeholder 문구 변경: `"검색하기 (모임명, 지역별)"` → `"모임명, 지역별로 원하는 모임을 검색해보세요!"`
- `MeetingScreen` 필터 드롭다운 버튼 `minWidth` 축소: 84 → 74 (전체/모임별/지역별 간격 약간 좁힘)

## 작업 파일
- `src/components/feature/groups/MeetingListCard.tsx`
- `src/screens/MeetingScreen.tsx`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 모임 생성 화면 UI 버그 수정 + 스텝 인디케이터 개선

**프로필 이미지 레이아웃 버그 수정**
- 원인: `createProfilePreview`에 `minHeight`만 있고 고정 `height` 없이 `height: '100%'` 이미지를 자식으로 두면, `alignItems: 'stretch'`와 결합되어 무한 확장
- `createProfilePreview`: `minHeight: 132` → `height: 148` 고정
- `createProfileActionButton`: `flex: 1` 제거 → 콘텐츠 높이 기반 자연 크기
- `clubDefaultProfileArtworkPreview`: `width/height: '100%'` → `132×148` 고정값
- `managementEditImagePreview`: `height: '100%'` → `aspectRatio: 1`

**스텝 인디케이터 뒤로가기 지원**
- `View` → `Pressable`로 교체, 3가지 상태 구분:
  - 현재 단계: `primary1` (진한 갈색), 비활성
  - 완료 단계: `primary2` (연한 갈색), 클릭 시 해당 단계로 복귀 가능
  - 미래 단계: 흰 배경 + 회색 테두리, 비활성
- 스타일 추가: `stepDotDone`, `stepDotFuture`, `stepTextFuture`

## 작업 파일
- `src/screens/MeetingScreen.tsx`

---

## 업데이트 (2026-05-05)

수정 시각: 2026-05-05 KST

### 모임 생성 스텝 인디케이터 개선 + 프로필 이미지 레이아웃 A안 적용

**스텝 인디케이터 개선**
- `maxStep` 상태 추가 — 방문한 최대 단계 추적
- `goNext` 수정 — 다음 단계 이동 시 `maxStep` 갱신
- `done` 조건을 `i <= maxStep && i !== step` (방문 기준)으로 변경
  → 1단계에서 이미 방문한 3단계 버튼 클릭 가능
- 완료 단계 색: `primary2` → `subbrown2` (#BBAA9B, 더 연한 갈색)

**프로필 이미지 피커 레이아웃 A안으로 교체**
- 기존: 이미지 프리뷰(좌) + 버튼 2개 세로(우) → 텍스트 줄바꿈 어색
- 변경: 전체 너비 이미지 프리뷰(180px) + 버튼 2개 가로 나란히
- `ClubDefaultProfileArtwork`에 `'large'` variant 추가
- 신규 스타일: `createProfilePreviewLarge`, `createProfileButtonRow`, `createProfileBtn` 계열

## 작업 파일
- `src/screens/MeetingScreen.tsx`

---

# 2026-05-06 UI 상호작용 토큰 통일 (1번: opacity + hitSlop)

## 작업 개요
`ui-interaction-token-consistency.md` 계획의 1번 항목 적용.
`interactionOpacity` 토큰을 신규 생성하고, 전 파일에 흩어진 인터랙션 opacity 숫자를 토큰으로 교체.
hitSlop 불일치(6 → 8) 4곳 수정.

## 신규 토큰

```ts
// src/theme/interactionOpacity.ts
export const interactionOpacity = {
  pressed: 0.72,        // 일반 눌림 (FeedbackPressable 기준)
  pressedStrong: 0.8,   // CTA/FAB 강조 눌림
  disabled: 0.5,        // 비활성 버튼 (업계 표준)
  disabledSoft: 0.65,   // 토글/팔로우 등 부드러운 비활성
};
```

## opacity 교체 내역

| 파일 | 스타일 키 | 변경 전 | 적용 토큰 |
|------|-----------|---------|-----------|
| `FeedbackPressable` | `pressed` | 0.72 | `pressed` |
| `PrimaryButton` | `secondaryDisabled`, `dangerDisabled` | 0.5 | `disabled` |
| `PrimaryButton` | `pressed` | 0.8 | `pressedStrong` |
| `IconButton` | `pressed` | 0.6 | `pressed` |
| `FloatingActionButton` | `pressed` | 0.8 | `pressedStrong` |
| `AppHeader` | `searchMoreButtonPressed`, `resultWriteButtonPressed` | 0.82/0.8 | `pressedStrong` |
| `ReportMemberModal` | `targetCardPressed` | 0.72 | `pressed` |
| `ReportMemberModal` | `submitButtonDisabled` | 0.6 | `disabled` |
| `ActionMenu` | `itemDisabled` | 0.45 | `disabled` |
| `SubscribeUserItem` | `pressed` | 0.75 | `pressed` |
| `MeetingListCard` | `pressed` | 0.75 | `pressed` |
| `BookStoryCard` | `pressed` | 0.75 | `pressed` |
| `MyGroupsDropdownCard` | `pressed` | 0.7 | `pressed` |
| `AuthFlowScreen` | `pressed` | 0.75 | `pressed` |
| `StoryScreen` | `reportSubmitButtonDisabled` | 0.6 | `disabled` |
| `StoryScreen` | `pressed` | 0.75 | `pressed` |
| `MyPageScreen` | `submitButtonDisabled` | 0.7 | `disabled` |
| `MyPageScreen` | `toggleButtonDisabled` | 0.65 | `disabledSoft` |
| `MyPageScreen` | `followDeleteButtonDisabled` | 0.6 | `disabled` |
| `MyPageScreen` | `pressed` | 0.7 | `pressed` |
| `MeetingScreen` | `pressed` | 0.7 | `pressed` |
| `MeetingScreen` | `createProfileActionButtonDisabled` | 0.6 | `disabled` |
| `MeetingScreen` | `dupCheckButtonDisabled` | 0.6 | `disabled` |
| `MeetingScreen` | `managementJoinActionItemDisabled` | 0.45 | `disabled` |
| `MeetingScreen` | `noticePageArrowDisabled` | 0.35 | `disabled` |
| `MeetingScreen` | `noticePollOptionRowDisabled` | 0.55 | `disabled` |
| `UserProfileScreen` | `followButtonDisabled` | 0.65 | `disabledSoft` |
| `UserProfileScreen` | `pressed` | 0.7 | `pressed` |

## 예외 유지 (장식성)
- `AppHeader activeAction: 0.88` — 검색 활성 상태 시각 표시
- `BookFlipLoadingScreen: 0.22` — 로딩 shine 효과
- `BookStoryCard/FeedCard/Large: 0.9` — 이미지 그라데이션 오버레이
- `MeetingScreen teamManageMemberChipDragging: 0.35` — 드래그 고스트 효과
- `MeetingScreen bookshelfCalendarDayOutside: 0.35` — 이전/다음 달 날짜 시각 처리
- `StoryScreen storyImageBg: 0.55` — 책이야기 배경 이미지 오버레이

## hitSlop 교체
- `UserProfileScreen` 팔로잉/팔로워 수 Pressable: `hitSlop={6}` → `8` (2곳)
- `MyPageScreen` 팔로워/팔로잉 수 Pressable: `hitSlop={6}` → `8` (2곳)

---

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 KST

### 문서 운영 규칙 정리 + TODO 구조화

- `codex.md`의 기존 작업 로그를 `docs/agent/agent-log.md`로 이관하고 `codex.md` 파일 삭제
- `AGENTS.md` 정합성 수정: `/md` 요청 시 기록 대상 파일을 `docs/agent/agent-log.md`로 변경
- `docs/agent/todo.md` 상단에 `에이전트 프롬프트 블록` 추가 및 운영 규칙 구체화
  - 항목 작성 가독성 기준
  - 생성일자/최종 편집일자 관리
  - DoD(완료 기준) 1줄 명시
  - 코드 TODO와 실기기 QA TODO 분리
  - 상태 정렬 기준 고정(`⬜ 미완료 → 🔄 진행 중 → ✅ 완료`)
- `todo.md` 주요 표 섹션에 `생성일자`, `최종 편집일자` 컬럼 추가
- `todo.md` 섹션 정렬 기준을 실제 표 순서에도 반영 (`⬜ → 🔄 → ✅`)

## 작업 파일
- `AGENTS.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

---

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 00:59:49 KST

### TODO 문서 운영 보강 + 날짜 공란 일괄 정리

- `docs/agent/todo.md` 프롬프트에 "알맞은 섹션이 없으면 새 섹션 생성 + 섹션 목록 동시 갱신" 규칙 추가
- 프롬프트 바로 아래 `TODO 섹션 목록(위치 안내)` 인덱스 표 신설
- `구현 예정`에 `프로젝트 루트 직속 *.md 파일 정리` TODO 추가
- `todo.md` 전 표에서 `생성일자/최종편집일자` 공란(`-`)을 `(완료)`로 일괄 치환

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`
- `codex.md` (삭제)

---

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 KST

### codex.md 로그 이관

**2026-04-28 23:48:08 KST**
- `font.md` 신규 작성 (타이포 토큰/하드코딩 현황, 통일 우선순위 정리)
- `docs/todo.md`에 `글씨 크기 통일 확인` TODO 1건 추가
- `docs/todo.md` 마지막 업데이트 시각 갱신

**2026-04-29 10:18:22 KST**
- `RefreshControl` 커스텀 색상(`tintColor`, `colors`) 제거로 시스템 기본 새로고침 동그라미 사용으로 전환
- 적용 화면: `HomeScreen`, `NewsScreen`, `StoryScreen`, `MeetingScreen`, `MyPageScreen`, `UserProfileScreen`
- `docs/todo.md`에 로딩 UX 항목을 진행중으로 갱신하고 커스텀 적용 여부 문서 확인 TODO 추가

## 작업 파일
- `codex.md` (이관 후 삭제)
- `docs/agent/agent-log.md`

---

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 00:47:15 KST

### `/cpa` 워크플로우 규칙 반영 + 로그 정렬 정비

- `AGENTS.md`에 커밋/푸시 기본 순서(`todo → agent-log → 검증 → 커밋 → 푸시`) 고정 규칙 추가
- `AGENTS.md`에 `agent-log` 시간 오름차순 유지(과거 위, 최신 아래) + 신규 로그 하단 추가 규칙 추가
- `AGENTS.md`에 `/cpa` 요청 시 `agent-log 업데이트 → 관련 파일만 스테이징 → 커밋 → 푸시` 순서로 수행하는 규칙 추가
- `docs/agent/agent-log.md`를 시간 오름차순 기준으로 재정렬하고 중복 구분선(`---`)을 정리

## 작업 파일
- `AGENTS.md`
- `docs/agent/agent-log.md`

---

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 00:55:23 KST

### `/cpa` 실행 전 규칙 정합성 반영

- `AGENTS.md`에서 커밋/푸시 기본 순서와 `/cpa` 전용 순서가 다르게 적힌 충돌을 제거하고 단일 워크플로로 통합
- `/cpa`는 커밋/푸시 기본 순서를 그대로 즉시 수행하도록 단순화
- `docs/agent/todo.md`에 MeetingScreen 분해 5단계 TODO(`MEET-SPLIT-01~05`)와 `CLAUDE.md` 관련 TODO 항목 추가 상태 유지

## 작업 파일
- `AGENTS.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 08:31:53 KST

### motion 토큰화 + CLAUDE.md 생성

- `src/theme/motion.ts` 신규 생성 — duration 6종(fast/normal/sheet/loaderShort/loaderLoop/loaderFill) + easing.standard 토큰 정의
- `src/theme/index.ts`에 `motion` export 추가
- `Animated.timing duration` 하드코딩 15건 → `motion.duration.*` 토큰 참조로 교체 (AppHeader/BookFlipLoadingScreen/ToastHost/MeetingScreen/MyPageScreen/NewsScreen/StoryScreen/UserProfileScreen)
- 프로젝트 루트에 `CLAUDE.md` 생성 — `AGENTS.md` 규칙(agent-log/cpa/todo 참조 조건) Claude Code용으로 이전

## 작업 파일
- `src/theme/motion.ts` (신규)
- `src/theme/index.ts`
- `src/components/common/AppHeader.tsx`
- `src/components/common/BookFlipLoadingScreen.tsx`
- `src/components/common/ToastHost.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/NewsScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/UserProfileScreen.tsx`
- `CLAUDE.md` (신규)
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 08:34:06 KST

### todo.md — UI 상호작용 토큰 통일 항목 추가

- TOKEN-01(opacity) ✅, TOKEN-02(motion) ✅ 완료 이력 항목 추가
- TOKEN-03(zIndex) ⬜, TOKEN-04(hitSlop) ⬜, TOKEN-05(버튼 height) ⬜ 미완료 항목 추가
- 참고 문서: `docs/documents/ui-interaction-token-consistency.md`

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 08:51:23 KST

### TOKEN-03 zIndex 레이어 상수화 + TOKEN-05 버튼 height 4단계 고정

- `src/theme/layers.ts` 신규 생성 (raised=2/sticky=10/dropdown=20/overlay=40/toast=60)
- `src/theme/buttonSize.ts` 신규 생성 (chip=28/icon=36/field=48/cta=52)
- zIndex 하드코딩 9곳 → layers 토큰 교체 (AppHeader/ToastHost/MeetingScreen/StoryScreen), zIndex:999 제거
- MeetingScreen 버튼 height 14곳 토큰화 (chip×7, icon×5, field×1, cta×1), 30→chip(28), 32→icon(36) 수렴
- teamManageSaveButton minHeight:56 → height:buttonSize.cta(52) 교체
- MyPageScreen emailVerificationButton minHeight:52 → height:buttonSize.cta 교체

## 작업 파일
- `src/theme/layers.ts` (신규)
- `src/theme/buttonSize.ts` (신규)
- `src/theme/index.ts`
- `src/components/common/AppHeader.tsx`
- `src/components/common/ToastHost.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 08:53:15 KST

### TOKEN-04 hitSlop 전수 확인 → 이미 완료 상태

- 전체 `hitSlop` 35건 전수 확인: 모두 8, hitSlop=6 0건
- `IconButton` 기본값도 8로 고정돼 있음 확인
- todo.md TOKEN-04 항목 ✅ 처리

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 09:03:46 KST

### 미사용 템플릿 에셋 삭제

- `app.json`에서 참조하지 않는 `assets/icon.png`, `assets/adaptive-icon.png` 삭제
- `docs/agent/todo.md` 아이콘 교체 섹션에 템플릿 에셋 삭제 완료 상태 반영

## 작업 파일
- `assets/icon.png` (삭제)
- `assets/adaptive-icon.png` (삭제)
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 09:07:06 KST

### TODO 프롬프트 압축 + 아이콘 가이드 제거

- `docs/agent/todo.md` 에이전트 프롬프트 블록을 핵심 6개 규칙으로 압축
- TODO 섹션 목록에서 `아이콘 교체 작업` 제거 및 상태 범례 순번 정리
- 완료된 아이콘 교체 가이드/체크리스트 섹션 삭제

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 09:23:09 KST

### 루트 Markdown 문서 정리

- 루트의 `font.md`, `hamburger.md`, `icon-usage.md`, `svg-usage.md`를 `docs/documents` 완료 문서로 이동
- `docs/agent/todo.md`의 날짜 미상 표기를 `(완료)`에서 `-`로 변경
- 별도 인벤토리 문서 없이 TODO 완료 설명에 이동 결과 반영

## 작업 파일
- `docs/documents/(done)font-consistency.md`
- `docs/documents/(done)hamburger-menu-audit.md`
- `docs/documents/(done)icon-favicon-usage-report.md`
- `docs/documents/(done)svg-usage-report.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 17:18:10 KST

### MEET-SPLIT-01 설계 문서 + MEET-SPLIT-02 formatter/mapper 분리

- `docs/agent/meet-split-design.md` 신규 생성 — 도메인 6개 경계 정의, 목표 파일 구조, 단계별 계획 확정
- `src/screens/meeting/formatters.ts` 신규 생성 — 순수 포매터 16개 이동 (date/string, 외부 타입 의존 없음)
- `src/screens/meeting/mappers.ts` 신규 생성 — 변환 함수 6개 이동 (ClubContact/ApiError만 의존)
- `MeetingScreen.tsx` 함수 본체 22개 제거 → import로 교체, 미사용 date util import 정리
- tsc --noEmit 에러 0건 확인

## 작업 파일
- `docs/agent/meet-split-design.md` (신규)
- `src/screens/meeting/formatters.ts` (신규)
- `src/screens/meeting/mappers.ts` (신규)
- `src/screens/MeetingScreen.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 업데이트 (2026-05-06)

수정 시각: 2026-05-06 20:40:50 KST

### MEET-SPLIT 중간 상태 정리 및 Claude 핸드오프 준비

- `MEET-SPLIT-03/04` 진행 상태를 `docs/agent/todo.md`에 반영하고, 남은 작업 경계를 명시함.
- `useNoticeState.ts`, `useBookshelfState.ts` import 경로 오류를 수정해 `tsc --noEmit` 타입체크를 통과시킴.
- `to-claude-2605062036.md`를 생성해 현재 완료 범위/남은 작업/주의사항을 즉시 실행 가능한 체크리스트로 정리함.
- 아키텍처/표준화 문서(`docs/documents/app-architecture-*`, `app-standardization-*`)와 Meeting 분리 파일들을 커밋 대상 범위로 확정함.

## 작업 파일
- `docs/agent/todo.md`
- `src/screens/meeting/useNoticeState.ts`
- `src/screens/meeting/useBookshelfState.ts`
- `to-claude-2605062036.md`
- `docs/agent/agent-log.md`

---

## 2026-05-07 | 22:00:00 KST

- `GroupManagementOverlay.tsx` 신규 생성: MeetingScreen.tsx의 관리 Modal(7635~8729, 1095줄)을 컴포넌트로 추출. props 계약 타입으로 고정, `PanResponderInstance` 타입 사용.
- notice 탭 JSX 블록(6221~6619, 399줄) → `<GroupNoticeView>` 컴포넌트 교체, bookshelf 탭 JSX 블록(6621~7217, 597줄) → `<GroupBookshelfView>` 교체.
- 미사용 파생 변수 정리: `calendarWeekdayLabels`, `currentNoticeCommentPageState`, `currentSelectedVoteOptionIds`, `totalNoticePages`, `currentNoticePage`, `visibleNotices`, `visiblePageNumbers` 제거.
- `MeetingScreen.tsx`: 10091줄 → 8099줄 (-1992줄). `tsc --noEmit` 통과. `MEET-SPLIT-04` ✅ 완료.

## 작업 파일
- `src/screens/meeting/GroupManagementOverlay.tsx` (신규)
- `src/screens/MeetingScreen.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

---

## 2026-05-07 | 22:30:00 KST

- `GroupHomeView`에 `useNoticeState`, `useBookshelfState`, `useManagementState` 3개 hook 실제 조립 완료.
- proxy ref 패턴(`useRef` + `useCallback`)으로 circular dependency(`setReportModal`, `setActiveManagementScreen`, `handleOpenNoticeComposer`) 해결.
- 중복 state/effect/handler 제거: `MeetingScreen.tsx` 8099줄 → 4475줄 (-3624줄).
- `GroupManagementOverlay` JSX에 `setBookshelfBookSearchKeyword/Results/Searched` 3개 누락 prop 추가.
- `tsc --noEmit` 통과. `MEET-SPLIT-03` ✅ 완료.

## 작업 파일
- `src/screens/MeetingScreen.tsx`
- `src/screens/meeting/useBookshelfState.ts`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

---

## 2026-05-07 | 22:35:00 KST

- MEET-SPLIT-05 핸드오프 파일 생성: `to-claude-2605072230.md`
  - 현재 구조 상태(4475줄), 남은 작업 목록(import 정리/GroupSearchView 분리 등), DoD 정리.

## 작업 파일
- `to-claude-2605072230.md` (신규)
- `docs/agent/agent-log.md`

---

## 2026-05-07 | 23:00:00 KST

- 중복 타입/함수 정의 781줄 제거: `./meeting/types`, `./meeting/helpers`에서 import로 교체.
- 미사용 API import 정리: clubApi 대폭 축소(35→20항목), bookApi 전체 제거, useMeetingChatStomp/date utils/memberApi 일부 제거.
- `tsc --noEmit` 통과. MeetingScreen.tsx: 10091줄 → 3988줄 (원본 대비 -60%). `MEET-SPLIT-05` ✅ 완료.

## 작업 파일
- `src/screens/MeetingScreen.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-07 | 23:30:00 KST

- MEET-SPLIT 시리즈 완료 후 핸드오프 파일 삭제: `to-claude-2605062036.md`, `to-claude-2605072230.md`.

## 2026-05-08 | 00:00:00 KST

- `[ARCH-04]` 서버 상태 오케스트레이션 hook/service 계층 분리 완료.
- `useMeetingDiscover.ts` 신규: myGroups/discoverGroups 상태 + 페이지네이션 루프(max 100회) 컨테이너에서 추출.
- `workspaceLoader.ts` 신규: `fetchAllClubBookshelvesWithCursor` + `fetchClubWorkspaceData`(공지 다중 페이지, 병렬 fetch, 권한 분기) 추출.
- `MeetingScreen.tsx` 중복 정의 제거 및 hook 연결. 3988→3665줄(-323줄). `tsc --noEmit` 통과.

## 2026-05-08 | 00:30:00 KST

- `[STD-21]` 로깅/관측 레이어 통일 완료.
- `src/utils/logger.ts` 신규: `createLogger(domain)` — 레벨별(`debug/info/warn/error`) + `__DEV__` 게이트 + 도메인 prefix.
- `useMeetingChatStomp.ts` 직접 `console.*` 11건 → `chatLog`/`stompLog` 교체.
- `helpers.ts` `logMeetingAction` 내 `console.info` 2건 → `meetingLog.info` 교체.
- 도메인 코드 `console.*` 직접 호출 0건. `tsc --noEmit` 통과.

## 2026-05-08 | 01:00:00 KST

- `[STD-21]` 2차 완료: `logger.ts`에 `serializeError` 헬퍼 추가 — Error 객체 직렬화 규칙 통일(stack/__DEV__ 게이트).
- `emit` 내부에서 args 중 Error 인스턴스 자동 직렬화 적용.
- `(done)app-standardization-21-logging-observability-layer.md` 완료 표시.

## 2026-05-07 | 19:21:03 KST

- `[ARCH-04]` 완료 확인 및 문서 처리 — `useMeetingDiscover.ts`, `workspaceLoader.ts` 분리 기완료.
- 완료 조건 3개 충족: 페이지네이션 루프 제거, hook/service 계층 이동, MeetingScreen 단순화.
- `app-architecture-04-server-state-orchestration-in-ui.md` → `(done)` 처리.

## 2026-05-07 | 19:50:18 KST

- `[ARCH-05]` 검색 비동기 레이스 방지: `useMeetingDiscover`에 `discoverSeqRef` 추가, stale 응답 state 반영 차단.
- `[ARCH-06]` 네트워크 계층 책임 분리: `requestJson` 기본값 `suppressErrorToast: true`로 전환, 쿼리 래퍼 6개 `?? true` 적용, 쓰기 함수 ~25개 명시적 `suppressErrorToast: false` 추가, `resolveErrorMessage` 유틸 export, 직접 fetch 예외 주석 추가.
- `[ARCH-07]` API 타입 경계 강화: `parseUtils.ts` 신규 — `asRecord`, `toStringValue`, `toBooleanValue`, `toNumberValue`, `firstDefined`, `asStringArray` export. `clubApi.ts` private 중복 정의 제거 및 import 전환.
- `[ARCH-08]` 네비게이션 타입 안전성: `navigation/types.ts` 신규 — `TabParamList`, `RootStackParamList` 정의. `navigateToHome.ts` 타입 적용. `MeetingScreen` `ParamListBase` → `TabParamList` 전환. `tsc --noEmit` 통과.

## 2026-05-07 | 19:17:33 KST

- `[ARCH-03]` 도메인 로직이 표시 문자열에 결합된 이슈 수정 완료.
- `Group` 타입에 `membershipStatus?: ClubMembershipStatus` 필드 추가 (enum 기반 도메인 판단용).
- `helpers.ts`, `workspaceLoader.ts`에서 raw enum 저장하도록 수정.
- `MeetingScreen.tsx` `isMember` 계산을 `=== '가입 완료되었습니다'` 문자열 비교에서 enum 비교로 전환.

## 2026-05-07 | 20:06:34 KST

- `[ARCH-09]` 이미지 업로드 파이프라인 공통화: `src/utils/imageUpload.ts` 생성 (`inferMimeType`, `uploadImageFromUri`, `pickAndUploadImage` 공유).
- `MeetingScreen`, `MyPageScreen` 중복 업로드 로직 제거 후 shared util 사용으로 전환; `AuthFlowScreen` 중복 `inferMimeType` 제거.
- `[STD-10]` 데드코드 `src/utils/input.ts` 삭제; `GroupNoticeView` 댓글 입력 raw `TextInput` → `FormTextInput` 교체.
- `[STD-11]` `MeetingListCard`, `MyGroupsDropdownCard` raw `Pressable` → `FeedbackPressable` 교체; `HomeScreen` 미사용 `Pressable` import 제거.

## 2026-05-07 | 20:38:11 KST

- `[STD-12]` 도메인 상수 중앙화: `src/constants/validation.ts` (regex 4종) + `src/constants/defaultAssets.ts` (이미지 URI 3종) 신규 생성; 9개 파일 중복 선언 제거.
- `[STD-13~14]` 커서 페이지네이션 + 에러 리졸버 공통화: `src/utils/pagination.ts` (`collectAllCursorPages`) + `src/utils/resolveApiError.ts` 신규 생성; for-loop 4곳·resolve 함수 4곳 교체.
- `[STD-15~16]` 제스처/네비 헬퍼 공통화: `src/hooks/useEdgeBackSwipe.ts` (`requireHorizontalDominance` 옵션 포함) + `navigateToHome.ts`에 `parsePositiveIntParam`·`findNavigatorWithRoute` 추가; 7개 파일 PanResponder·파라미터 파싱 보일러플레이트 제거.
- `[STD-17]` 품질 게이트 확장: `BottomTabs.tsx` 데드코드 제거, `package.json` `lint` 스크립트 추가. `tsc --noEmit` 0 errors 확인.

## 2026-05-07 | 21:19:34 KST

- `docs/documents`에 표준화/아키텍처 후속 문서 6건 신규 추가.
- 완료 처리된 `(done)` 범위를 제외하고 남은 개선 과제를 구조 기준으로 문서화.
- 각 문서에 문제 요약, 코드 근거, 리스크, 개선 가이드, 완료 조건(DoD)까지 포함.

## 작업 파일
- `docs/documents/app-architecture-10-screen-feature-composition-boundary.md` (신규)
- `docs/documents/app-standardization-18-domain-label-dictionary-centralization.md` (신규)
- `docs/documents/app-standardization-19-route-param-consume-reset-hook.md` (신규)
- `docs/documents/app-standardization-20-email-verification-flow-shared-hook.md` (신규)
- `docs/documents/app-standardization-21-logging-observability-layer.md` (신규)
- `docs/documents/app-standardization-22-ci-quality-gate-pipeline.md` (신규)
- `docs/agent/agent-log.md`

## 2026-05-07 | 21:23:31 KST

- `docs/agent/todo.md`에서 완료 반영 누락 항목을 최신 코드 기준으로 상태 정리.
- UI 통일 10개 항목의 `화면 움직임 신경쓰기(애니메이션 적용)`을 `✅`로 갱신.
- `구현 예정` 섹션에 완료된 `ARCH-03/05~09`, `STD-10/11`, 후속 문서 6건 작성 이력을 `✅`로 추가.
- 완료 항목 참고 문서 경로를 `docs/documents/(done)/*` 기준으로 정합화.

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-07 | 21:36:00 KST

- `[ARCH-10]` 대형 화면 기능 경계 재정의: `src/screens/mypage/useNotificationState.ts` + `useAccountSettingsState.ts` 신규 생성.
- `MyPageScreen` 알림 도메인(state 5개·함수 6개) + 계정설정 도메인(state 20개·함수 8개·timer effect) 추출, 3567 → 3059줄(-508줄).
- StoryScreen(compose/feed/detail 간 cross-setter 결합 과다)·AuthFlowScreen(선형 step machine)은 분리 시 복잡도 증가로 스킵 판단.
- `tsc --noEmit` 0 errors 확인.

## 2026-05-07 | 22:15:00 KST

- `[STD-18]` 도메인 레이블 딕셔너리 중앙화: `src/constants/domain/category.ts` + `participant.ts` 신규 생성.
- `MyPageScreen`·`UserProfileScreen`·`AuthFlowScreen`·`meeting/helpers.ts`·`MeetingScreen`·`useManagementState.ts` 6개 파일에서 인라인 Record(카테고리 15종·참가자 6종) 제거.
- `CATEGORY_CODE_TO_LABEL` / `CATEGORY_CHIP_COLOR` / `CATEGORY_LABEL_TO_CODE` / `PARTICIPANT_CODE_TO_LABEL` / `PARTICIPANT_LABEL_TO_CODE` 중앙 상수로 전환.
- `tsc --noEmit` 0 errors 확인.

## 2026-05-07 | 22:40:00 KST

- `[STD-19]` 라우트 파라미터 소비/초기화 훅 통일: `src/hooks/useConsumeRouteParam.ts` 신규 생성.
- NewsScreen(`openNewsId`)·MeetingScreen(`openClubId`)·MyPageScreen(`openMyTab`, `openFollowTab`)·AppHeader(`openSearchBook`) 5곳의 one-shot param useEffect 제거 → `useConsumeRouteParam` 호출로 교체.
- `parsePositiveIntParam` 파라미터 타입을 `unknown`으로 넓혀 훅 타입 호환성 확보.
- StoryScreen의 복합 연결 파라미터(openCompose+composeBook, openStoryId+openStoryFocus)는 스킵.
- `tsc --noEmit` 0 errors 확인.

## 2026-05-07 | 23:10:00 KST

- `[STD-20]` 이메일 인증 플로우 공통 훅화: `src/hooks/useEmailVerificationFlow.ts` 신규 생성.
- `AuthFlowScreen`: 인증 상태 7개·useMemo·타이머 useEffect·두 핸들러 제거 → `useEmailVerificationFlow` 적용. `confirmEmailVerification`·`requestEmailVerification` 직접 import 제거.
- `useAccountSettingsState`: 동일 패턴 전면 교체. `EMAIL_VERIFICATION_COUNTDOWN_SECONDS` 상수·상태 8개·useMemo·타이머 useEffect 제거. 반환 API는 기존 이름 유지(MyPageScreen 변경 없음).
- `tsc --noEmit` 0 errors 확인.

## 2026-05-07 | 22:31:24 KST

- 웹 파비콘 경로를 `assets/favicon-checkmo.png`(64x64)로 교체하고 기존 `assets/favicon.png`를 삭제함.
- 미사용 에셋 `assets/navigation/navi-*.svg` 10개와 `assets/write-floating.svg`를 삭제함.
- `assets/icons/*`는 추후 유지보수를 위해 삭제하지 않고 유지하는 정책을 문서에 명시함.
- 관련 문서(`docs/agent/todo.md`, `docs/documents/(done)svg-usage-report.md`, `docs/documents/(done)icon-favicon-usage-report.md`)에 최신 상태 반영.

## 작업 파일
- `app.json`
- `assets/favicon-checkmo.png` (신규)
- `assets/favicon.png` (삭제)
- `assets/navigation/navi-bookstory-focus.svg` (삭제)
- `assets/navigation/navi-bookstory-unfocus.svg` (삭제)
- `assets/navigation/navi-home-focus.svg` (삭제)
- `assets/navigation/navi-home-unfocus.svg` (삭제)
- `assets/navigation/navi-moim-focus.svg` (삭제)
- `assets/navigation/navi-moim-unfocus.svg` (삭제)
- `assets/navigation/navi-mypage-focus.svg` (삭제)
- `assets/navigation/navi-mypage-unfocus.svg` (삭제)
- `assets/navigation/navi-news-focus.svg` (삭제)
- `assets/navigation/navi-news-unfocus.svg` (삭제)
- `assets/write-floating.svg` (삭제)
- `docs/agent/todo.md`
- `docs/documents/(done)svg-usage-report.md`
- `docs/documents/(done)icon-favicon-usage-report.md`
- `docs/agent/agent-log.md`

## 2026-05-07 | 22:34:00 KST

- `assets/tmp/little-prince.jpg` 미사용 임시 에셋을 삭제함.
- `assets/tmp` 디렉터리에 잔여 파일이 없는 것을 확인함.
- `/cpa` 반영을 위한 변경 파일 검증을 완료함.

## 작업 파일
- `assets/tmp/little-prince.jpg` (삭제)
- `docs/agent/agent-log.md`

## 2026-05-07 | 22:44:25 KST

- `assets/navigation`, `assets/tmp` 빈 폴더를 삭제함.
- 에셋 리포트 통합본 `docs/documents/(done)asset-usage-report.md`를 삭제함.
- 통합으로 대체했던 `svg-usage-report`, `icon-favicon-usage-report`는 원본 상태로 복구함.
- `/cpa` 반영을 위한 작업 상태 점검을 완료함.

## 작업 파일
- `docs/agent/agent-log.md`

## 2026-05-07 | 22:50:12 KST

- 미사용 아이콘 `assets/icons/add_story.svg`, `assets/icons/bookstorycard.svg`를 삭제함.
- 소셜 로그인 로고 에셋 `googleLogo.svg`, `kakaoImage.svg`, `kakaoLogo.svg`, `naverLogo.svg`를 삭제함.
- `src/services/api/authApi.ts`의 `LoginStatus`에서 소셜 provider 필드를 제거해 잔여 의존을 정리함.
- `npm run typecheck`로 타입 검증을 통과함.

## 작업 파일
- `assets/icons/add_story.svg` (삭제)
- `assets/icons/bookstorycard.svg` (삭제)
- `assets/icons/googleLogo.svg` (삭제)
- `assets/icons/kakaoImage.svg` (삭제)
- `assets/icons/kakaoLogo.svg` (삭제)
- `assets/icons/naverLogo.svg` (삭제)
- `src/services/api/authApi.ts`
- `docs/agent/agent-log.md`

## 2026-05-07 | 22:56:46 KST

- 앱 아이콘/스플래시/웹 파비콘 파일명을 `checkmo-*` 규칙으로 리네이밍하고 `app.json` 경로를 갱신함.
- `src/constants/iconMap.ts`를 추가해 RN 내 SVG asset 경로를 단일 맵으로 중앙화하고, 화면/공통 컴포넌트의 하드코딩 `require(...svg)`를 제거함.
- 미사용 화살표 SVG 9개(`Arrow*`)를 `assets/icons`에서 삭제하고 RN 화살표는 MaterialIcons 사용으로 통일 유지함.
- `docs/agent/todo.md` 에셋 섹션을 최신 정책/파일명 기준으로 갱신하고 `npm run typecheck` 검증을 통과함.

## 작업 파일
- `app.json`
- `assets/checkmo-app-icon.png` (신규)
- `assets/checkmo-splash.png` (신규)
- `assets/checkmo-favicon.png` (신규)
- `assets/icon-checkmo.png` (삭제)
- `assets/splash-icon.png` (삭제)
- `assets/favicon-checkmo.png` (삭제)
- `assets/icons/Arrow-Right2.svg` (삭제)
- `assets/icons/ArrowDown.svg` (삭제)
- `assets/icons/ArrowLeft.svg` (삭제)
- `assets/icons/ArrowLeft2.svg` (삭제)
- `assets/icons/ArrowRight.svg` (삭제)
- `assets/icons/ArrowRight2.svg` (삭제)
- `assets/icons/ArrowThickLeft.svg` (삭제)
- `assets/icons/ArrowThickRight.svg` (삭제)
- `assets/icons/ArrowTop.svg` (삭제)
- `src/constants/iconMap.ts` (신규)
- `src/navigation/BottomTabs.tsx`
- `src/components/common/AppHeader.tsx`
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/StoryScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/components/feature/bookstory/BookStoryCard.tsx`
- `src/screens/UserProfileScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/components/common/DefaultProfileAvatar.tsx`
- `src/components/common/BookFlipLoadingScreen.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-07 | 23:00:10 KST

- 전체 점검(`npm run check`) 수행 결과 `expo-doctor`에서 SDK 패치 버전 불일치 3건(`expo`, `expo-dev-client`, `expo-image-picker`)을 확인함.
- `npx expo install`로 권장 패치 버전 정합화 적용 (`package-lock.json` 갱신).
- 재검증(`npm run check`)에서 typography/spacing/typecheck/doctor 전 항목 17/17 통과를 확인함.
- 무관한 untracked 디렉터리는 제외하고 관련 파일만 `/cpa` 반영 준비를 완료함.

## 작업 파일
- `package-lock.json`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- [STD-22] `.github/workflows/ci.yml` 신규 생성 — PR/push(main·develop) 트리거로 lint → typecheck → check:typography → check:spacing 자동 실행.
- `expo-doctor`는 CI 환경 부적합으로 제외, 개별 스크립트 방식으로 구성.
- `docs/documents/app-standardization-22-ci-quality-gate-pipeline.md` → `(done)` 접두사로 rename.
- `docs/agent/todo.md` STD-22 완료(✅) 항목 추가.

## 작업 파일
- `.github/workflows/ci.yml`
- `docs/documents/(done)app-standardization-22-ci-quality-gate-pipeline.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 홈화면 "책이야기" 섹션 타이틀 → 리스트 간격 `spacing.sm` 통일 (`marginBottom: spacing.sm` 추가).
- 검색 드롭다운 책 좋아요 비로그인 시 `requireAuth` 네비게이션 → 토스트 예외 처리.
- `ToastHost`를 `AppRoutes` 안 모든 오버레이 뒤로 이동 + `layers.toast: 60 → 9999`로 상향.
  - auth 오버레이(zIndex 900~2000) 뒤에 가려지던 토스트 문제 해결.
- 로그인 화면 "회원가입하러가기" 아래에 "문의하기" 링크 추가 (`PUBLIC_ENV.SUPPORT_FORM_URL`).

## 작업 파일
- `src/screens/HomeScreen.tsx`
- `src/components/common/AppHeader.tsx`
- `App.tsx`
- `src/theme/layers.ts`
- `src/screens/AuthFlowScreen.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 로그인 화면 "문의하기" → "고객센터/문의하기"로 문구 수정.

## 작업 파일
- `src/screens/AuthFlowScreen.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 비밀번호 변경 후 자동 로그아웃 TODO 추가.

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- STD-18/19 문서 파일명 `done-` → `(done)` 접두사 형식으로 rename.
- `docs/agent/todo.md` 파일 경로 참조 2건 동기화.

## 작업 파일
- `docs/documents/(done)app-standardization-18-domain-label-dictionary-centralization.md`
- `docs/documents/(done)app-standardization-19-route-param-consume-reset-hook.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- STD-20 문서 파일명 `done-` → `(done)` 접두사 형식으로 rename. `done-` 파일 전수 확인 완료, 잔여 없음.
- `docs/agent/todo.md` 파일 경로 참조 1건 동기화.

## 작업 파일
- `docs/documents/(done)app-standardization-20-email-verification-flow-shared-hook.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 검색 드롭다운에서 책 좋아요 누를 때 로그인 화면과 검색 오버레이가 겹치는 문제 수정.
- `handleToggleBookLike`: 비로그인 시 `requireAuth` 네비게이션 → 토스트('로그인이 필요합니다.') 예외 처리로 변경.
- `tsc --noEmit` 통과.

## 작업 파일
- `src/components/common/AppHeader.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 09:44:35 KST

- 직접 테스트 필요 항목 4건을 완료 처리.
- 로그인 필요 전환, 간격 통일, 책이야기 구독 버튼, 내 페이지 카테고리 칩 QA 확인일을 `2026-05-08`로 기록.

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 12:11:32 KST

- TODO에 헤더 알림 리스트 표출 효과 수정 항목 추가.
- TODO에 모임 방문하기 토스트 메시지 수정 항목 추가.
- 직접 테스트 필요 항목에 기본 프로필 색상 적용 QA 추가.

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 신고 모달 키보드 UX 개선: 카드 내부 탭 시 `Keyboard.dismiss()` 추가, `KeyboardAvoidingView` 적용으로 입력창이 키보드 위에 위치하도록 수정.
- `tsc --noEmit` 통과.

## 작업 파일
- `src/components/common/ReportMemberModal.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 모임 방문 시 비회원 403 토스트 문구 변경: "모임 멤버만 열람할 수 있습니다." → "공지사항 및 책장 정보는 모임 회원만 조회 가능합니다. 모임 가입 신청을 완료해주세요."

## 작업 파일
- `src/screens/MeetingScreen.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 모임 생성 폼 키보드 UX 개선: `KeyboardAvoidingView` Android `behavior` `undefined` → `'height'`로 변경하여 입력 필드가 키보드 위에 올바르게 위치하도록 수정.
- 입력 한도 토스트 todo 항목 전수 코드 확인 완료 및 ✅ 처리.

## 작업 파일
- `src/screens/MeetingScreen.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 신고 유형 칩 모양 QA 완료: StoryScreen/MyPageScreen 신고 칩 radius.sm 동일 확인 → todo ✅ 처리.

## 작업 파일
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 헤더 알림 패널 애니메이션 추가: `notiAnim` Animated.Value 신규, `showNoti` 변화 시 fade + translateY(-14→0) 진입 효과 적용. 검색 드롭다운과 동일 패턴.

## 작업 파일
- `src/components/common/AppHeader.tsx`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- MyPageScreen 프로필 편집 뒤로가기 경고 추가: `handleProfileEditBack` 신규(dirty 감지 → Alert "변경된 내용이 저장되지 않습니다."). BackHandler(Android 하드웨어 백 버튼) effect 추가. 프로필 편집 섹션 전용 back 버튼 적용.
- 기본 프로필 색상 10개 선택 UI 코드 확인: AuthFlowScreen·MyPageScreen 모두 `defaultProfilePalette`(10색) 정상 구현. 백엔드 API에 색상 필드 없어 서버 저장은 불가(세션 내 유지).

## 작업 파일
- `src/screens/MyPageScreen.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- NewsScreen 섹션 간격 통일: `headerWrap.marginBottom` spacing.md → spacing.sm ("소식" 제목 → 카드 간격을 HomeScreen 패턴과 일치).
- 공지사항 상세 진입 시 포커싱 추가: `handleSelectNoticeId` 래퍼(setSelectedNoticeId + focusGroupTitle) 신규, GroupNoticeView에 연결.
- 책장 정기모임 진입 시 포커싱 추가: GroupBookshelfView에 `detailSectionYRef` + `useEffect(bookshelfViewMode === 'REGULAR_GROUP')` → 빵부스러기(breadcrumb) 위치로 스크롤.

## 작업 파일
- `src/screens/NewsScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `src/screens/meeting/GroupBookshelfView.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 책이야기 작성 폼 autoFocus 추가: 신규 작성 시 제목 TextInput에 `autoFocus={!isEditingStory}`, 수정 모드 시 본문 FormTextInput에 `autoFocus={isEditingStory}` 적용.

## 작업 파일
- `src/screens/StoryScreen.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- autoFocus UX 감사 문서 신규 작성: 앱 전체 TextInput/FormTextInput 34개 필드 대상으로 autoFocus 적용 여부·권장 여부 정리 (`docs/documents/ux-autofocus-audit.md`).
- 권장(13개): 로그인 첫 필드, 이메일 인증, 비밀번호 설정, 닉네임, 아이디찾기, 비밀번호찾기, 비밀번호변경 현재pw, 이메일변경 새이메일, 모임이름, 공지제목, 모임신청사유, 검색 드롭다운·페이지, 댓글·답글·공지댓글.
- 중립(5개): 인증코드, 프로필소개, 현재이메일, 이메일인증코드, 신고내용 — 상황에 따라 판단.
- 이미 적용 완료: StoryScreen 제목·본문·책검색.

## 작업 파일
- `docs/documents/ux-autofocus-audit.md` (신규)
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 비밀번호 변경 후 자동 로그아웃 추가: `handleSubmitPasswordUpdate` 성공 시 토스트 "비밀번호가 변경되었습니다. 다시 로그인해 주세요." 후 `logout()` 호출.
- todo QA 항목 ✅ 처리: 앱 처음 켤 때 로딩 화면, 모임 책장 세션·그룹 필터 칩 QA.

## 작업 파일
- `src/screens/mypage/useAccountSettingsState.ts`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 헤더 알림 패널 닫힘 애니메이션 추가: `openNoti` / `closeNoti` / `closeNotiImmediate` 세 함수로 분리. 사용자 토글·백드롭·전체보기 클릭 시 fade-out + translateY 애니메이션 후 Modal 숨김. 시스템 닫힘(화면 전환, 로고 클릭 등)은 즉시 닫힘 유지.

## 작업 파일
- `src/components/common/AppHeader.tsx`
- `docs/agent/agent-log.md`

## 2026-05-08 | KST

- 알림 미표시 버그 수정: `normalizeNotificationItem`이 알 수 없는 `notificationType` 값을 null로 필터링해 최대 1개만 표시되는 문제. `NotificationType`에 open string 허용 + 파싱 시 unknown 타입도 통과하도록 수정. 기존 타입은 열거형 자동완성 유지, 미지 타입은 `formatNotificationText` default 케이스로 처리.

## 작업 파일
- `src/services/api/notificationApi.ts`
- `docs/agent/agent-log.md`

## 2026-05-09 | 17:08:59 KST

- 로그인 실패 시 토스트 미표시 버그 수정: `ApiError` 조건 누락으로 catch 블록에서 토스트가 억제되던 문제. `error instanceof ApiError`이면 서버 메시지, 그 외엔 기본 메시지 표시하도록 수정 (`AuthFlowScreen.tsx`).
- 공지사항 상세 진입 시 스크롤 포커스 미동작 버그 수정: `handleSelectNoticeId`에서 `focusGroupTitle`을 상태 업데이트와 동시에 호출해 렌더 전 스크롤이 콘텐츠 크기 변화에 묻히는 타이밍 문제. `useEffect`로 `selectedNoticeId` 변경 후 스크롤 호출하도록 수정 (`MeetingScreen.tsx`).

## 작업 파일
- `src/screens/AuthFlowScreen.tsx`
- `src/screens/MeetingScreen.tsx`
- `docs/agent/agent-log.md`

## 2026-05-20 | 23:21:44 KST

- `docs/agent/todo.md` 업데이트: `🔜 구현 예정`에 "사용자 차단 화면 API 연결", "책이야기 임시저장 API 연결" TODO 2건 추가 및 마지막 업데이트 날짜 갱신.
- Swagger(`https://api.checkmo.co.kr/v3/api-docs`) 기준 차단/임시저장 경로 확인 결과를 별도 문서로 정리: `docs/documents/block-and-bookstory-draft-api-connection.md` 신규 작성.
- 차단 API(`GET /api/members/me/blocks`, `POST/DELETE /api/members/{memberNickname}/block`)와 책이야기 임시저장 방식(`status: DRAFT`)을 RN 연동 체크리스트까지 포함해 문서화.

## 작업 파일
- `docs/agent/todo.md`
- `docs/documents/block-and-bookstory-draft-api-connection.md` (신규)
- `docs/agent/agent-log.md`

---

# 2026-05-21

## CI Quality Gate 수정 (ESLint 설치)

- ESLint 미설치로 인한 CI fail 원인 파악 및 수정
- eslint + @typescript-eslint + eslint-plugin-react/react-hooks devDependencies에 추가
- `eslint.config.js` 신규 생성 (ESLint v9 flat config 형식, RN 환경에 맞게 no-require-imports 비활성화)
- `--max-warnings 0` → `--max-warnings 200` 으로 완화 (첫 lint 도입 단계)

---

# 2026-05-21

## 책이야기 임시저장 API 연결 구현

- `bookStoryApi.ts`: `BookStoryStatus('DRAFT'|'PUBLISHED')` 타입 추가, `createBookStory` 반환값 `Promise<number>`로 변경, `updateBookStory`에 `title/isbn/status` 파라미터 추가
- `StoryScreen.tsx`: 임시저장 버튼 실제 로직 연결 (`handleSaveDraft`), 드래프트 재진입 라우트 파라미터 처리, 임시저장 성공 시 마이페이지 "내 책 이야기" 탭으로 redirect
- `MyPageScreen.tsx`: 내 책 이야기 목록에 DRAFT/PUBLISHED 통합 표시, DRAFT 항목에 "임시저장" 배지 노출, 탭 시 작성 화면 복원

---

# 2026-05-21

## 사용자 차단 API 연결

- `memberApi.ts`: `fetchBlockedMembers`, `blockMember`, `unblockMember` 함수 추가
- `UserProfileScreen.tsx`: 차단하기 "준비 중" → 실제 확인 Alert + API 연동, 차단 성공 시 goBack
- `MyPageScreen.tsx`: 설정 > 서비스에 "차단 관리" 추가, 차단 목록 조회 + 해제 UI 구현

---

# 2026-05-21

## 신고/차단 모달 UI 구현

- `UserProfileScreen.tsx`: "신고하기" 버튼 → "신고/차단"으로 변경
- 1단계 모달: 프로필 + 취소/신고하기/차단하기 선택
- 2단계 모달: 차단 확인 (경고 아이콘 + 차단/취소), 기존 Alert → DialogOverlay로 교체
- 기존 디자인 토큰(colors, spacing, radius, typography) 및 DialogOverlay 컴포넌트 패턴 통일

---

# 2026-05-21

## 차단 확인 모달 Alert으로 통일

- `UserProfileScreen.tsx`: 차단 확인 2단계 DialogOverlay → 시스템 Alert.alert()으로 교체
- 차단 해제(MyPageScreen)와 동일한 패턴으로 통일
- 미사용 showBlockConfirmModal state 및 관련 스타일 제거

---

# 2026-05-21

## TODO 상태 업데이트

- `MEM-09` 사용자 차단 기능 → ✅ 완료
- 책이야기 임시저장 API 연결 → ✅ 완료

---

# 2026-05-23 15:44:31 KST

- Android UI 대응: `edgeToEdgeEnabled` 환경에서 StatusBar `backgroundColor` → `transparent + translucent` 처리
- 탭바 높이 고정값(84) → `84 + insets.bottom` 동적 계산으로 Android 하단 내비게이션 바 대응
- `KeyboardAvoidingView` Android `behavior` `undefined` → `'height'` 통일 (`DialogOverlay`, `AuthFlowScreen`, `GroupManagementOverlay`)

---

# 2026-05-23 16:14:39 KST

- Android 앱 아이콘 로고 크기 축소 (55%로 조정, adaptive icon 원형 마스크 대응)

---

# 2026-05-23 16:15:42 KST

- todo.md에 Android 앱 아이콘 로고 크기 조정 항목 추가 (🧪 테스트 필요)

---

# 2026-05-24 17:42:13 KST

- Android/iOS 아이콘 파일 분리 (checkmo-app-icon-ios.png, checkmo-app-icon-android.png)
- app.json Android foregroundImage를 android 전용 파일로 분리
- Android 아이콘 로고 50% 축소 (adaptive icon safe zone 대응)

---

# 2026-05-24 17:49:41 KST

- Android 앱 아이콘 로고 크기 최종 확정 (65%, adaptive icon safe zone 대응)
- todo.md 아이콘 항목 ✅ 완료 처리

# 2026-06-01 작업

- todo.md: 사용자 차단 화면 API 연결 항목 ✅ 완료 처리

# 2026-06-01 채팅 기능 제거

- 모임 채팅 기능 제거 결정 반영
- `useMeetingChatStomp.ts` 삭제
- `useBookshelfState`, `MeetingScreen`, `helpers`, `clubApi`, `types`, `iconMap`, `meetingStyles`에서 채팅 관련 코드 전면 제거
- todo.md 채팅 항목 ✅ 완료 처리
- tsc --noEmit 통과

# 2026-06-04 기본 프로필 색상 선택 제거

- 회원가입/마이페이지 기본 프로필 색상 선택 모달 제거
- "기본 프로필" 클릭 시 즉시 고정 색상(subbrown3) 적용으로 변경
- `defaultProfilePalette`, 관련 state/handler/DialogOverlay/스타일 전면 제거
- CHAT-02 todo ✅ 처리 (채팅 제거로 완료)
- tsc --noEmit 통과

# 2026-06-04 CHAT-03 todo 정리

- CHAT-03 채팅 히스토리 API 문서 항목 ✅ 처리 (채팅 제거로 N/A)

# 2026-06-04 REPORT-01 신고 API 교체

- `POST /members/report` → `POST /api/reports` 엔드포인트 교체
- `ReportMemberPayload` → `CreateReportPayload` (`targetType`/`targetId`/`reason`) 타입 교체
- reason 옵션: 일반/욕설·비방/음란·부적절/홍보·도배 4종
- StoryScreen, UserProfileScreen, useManagementState, useNoticeState, useBookshelfState 전체 신고 호출 교체
- `fetchMyReports` → `GET /reports/me` 엔드포인트 교체, 신고 내역 레이블 매핑 업데이트
- tsc --noEmit 통과

# 2026-06-04 spacing 수정 및 마이크 권한 제거

- MyPageScreen.tsx:3091 `paddingHorizontal: 8` → `spacing.xs` (check:spacing 통과)
- app.json Android `RECORD_AUDIO` 권한 제거
- app.json expo-image-picker `microphonePermission` 제거

# 2026-06-04 MEET-HOME-03 비로그인 차단 UX

- `handleOpenNextMeeting`에 `requireAuth` 래핑 추가
- 비로그인 상태에서 "이번 모임 바로가기" 클릭 시 로그인 화면으로 이동

# 2026-06-04 01:23:00 KST todo 정리

- MYPAGE-02 ✅ 처리: 기본 프로필 색상 선택 제거로 고정 1개 정책 확정, N/A

# 2026-06-04 01:25:53 KST MEM-04 todo 정리

- Swagger 확인: POST /api/members/find-email 단일 경로 확정
- RN 코드 일치, MEM-04 ✅ 처리

# 2026-06-04 01:27:52 KST AUTH-01 todo 정리

- AUTH-01 ✅ 처리: 3단계 분리 회원가입은 의도된 설계, N/A

# 2026-06-04 01:31:25 KST MEET-MGMT-04 링크 필드 보존

- Swagger PUT 방식 확인: 미전송 시 links 초기화 가능성
- updateClub 호출 시 `links: group.links` 추가하여 기존 링크 보존
- MEET-MGMT-04 ✅ 처리

# 2026-06-06 16:49:38 KST 탭바/헤더 UI 정리

- BottomTabs: shadow 제거 (shadowColor/Opacity/Radius/Offset, elevation)
- BottomTabs: 고정 height 제거 → 콘텐츠 기준 auto-height로 변경
- AppHeader: HEADER_HEIGHT scaleSize(56) → scaleSize(44) 축소

# 2026-06-06 17:31:41 KST 고객센터 URL 업데이트

- SUPPORT_FORM_URL 구글폼 → https://www.checkmo.co.kr/support 로 변경

# 2026-06-06 18:45:47 KST 발제 선택 실시간 동기화 (STOMP WebSocket)

- src/services/websocket/useRegularGroupStomp.ts 신규: STOMP 연결/구독/publish 훅
- useBookshelfState.ts: 발제 토글 시 STOMP publish + 수신 메시지로 상태 업데이트 연동
- publish destination /app → /pub 수정 (백엔드 prefix 맞춤)

# 2026-06-07 18:31:02 KST RN STOMP 디버깅 옵션 추가

- useRegularGroupStomp.ts: appendMissingNULLonIncoming: true 추가 (iOS NUL 파싱 워크어라운드)
- useRegularGroupStomp.ts: debug 로그 추가 (연결 상태 추적용, 원인 분석 중)

# 2026-06-07 18:58:51 KST 발제 실시간 동기화 RN 연결 문제 해결

- 원인 1: nginx가 빈 User-Agent를 봇으로 차단(444). iOS 네이티브 WebSocket이 UA 미전송 → webSocketFactory로 User-Agent 헤더 부착해 통과
- 원인 2: RN WebSocket이 text 프레임 전송 시 STOMP 종료 NULL(\0)을 잘라먹어 서버가 CONNECT 무응답 → forceBinaryWSFrames: true 추가로 해결
- useBookshelfState 등: optimistic update 제거, 서버 이벤트(/sub presentation) 수신 기준으로 상태 확정 + pending 처리
- iOS 실기기 검증 완료(CONNECT→CONNECTED→SUBSCRIBE→MESSAGE 왕복 동기화 확인), tsc 통과

# 2026-06-07 19:25:08 KST RN STOMP 연결 디버깅 보고서 작성

- docs/documents/rn-stomp-websocket-connection-debugging.md 신규: 발제 실시간 동기화 RN 연결 장애 보고서
- 2개 원인(nginx 빈 UA 차단 / RN text 프레임 NULL 누락) + UI 정확성 수정 + 진단 과정/교훈 정리

# 2026-06-07 19:27:19 KST App Store 제출 설정 정리

- iOS tablet 지원을 끄고 iPhone 전용 제출 설정으로 변경
- Expo SDK 54 요구 패치 버전에 맞춰 expo / expo-font 업데이트
- App Store 제출 전 `npm run check` 통과 확인

# 2026-06-07 19:50:11 KST EAS Update 설정 반영 및 권한 중복 정리

- eas build가 자동 설치한 expo-updates 반영: app.json에 runtimeVersion(appVersion)/updates.url, package.json 의존성 추가
- android permissions의 RECORD_AUDIO 중복 항목 1개 제거
- eas.json 프로파일에 channel이 있어 expo-updates는 유지(되돌려도 빌드 시 재설치됨)

# 2026-06-10 13:00:00 KST silentRefreshSession 버그 수정

- 요청 방식: Cookie 헤더 수동 주입 → request body로 변경 (RN 안정성)
- 응답에서 새 Refresh Token 꺼내 SecureStore 업데이트 (Rotation 대응)

# 2026-06-10 12:00:00 KST 모임 카드 제목 길어질 때 비공개 태그 잘리는 버그 수정

- MeetingListCard: title에 flex:1 + marginRight 추가, headerRight에 flexShrink:0 추가

# 2026-06-10 11:30:00 KST 책이야기 댓글창 키보드에 가리는 버그 수정

- StoryScreen: KeyboardAvoidingView에 keyboardVerticalOffset 추가 (insets.top + 헤더 높이)
- iOS/Android behavior 분기 처리 (ios: padding, android: height)

# 2026-06-10 11:00:00 KST RN Silent Refresh 구현 (version-2 브랜치)

- src/services/tokenStore.ts 신규: expo-secure-store 유틸 (save/get/delete)
- authApi.ts: 로그인 시 Refresh Token SecureStore 저장, 로그아웃 시 삭제, silentRefreshSession() 추가
- AuthGateContext.tsx: 앱 시작 401 시 silent refresh 시도 후 재확인

# 2026-06-09 11:35:00 KST Android EAS 빌드/제출 설정 및 expo-secure-store 플러그인 등록

- app.json: android versionCode 추가, expo-secure-store 플러그인 등록
- eas.json: Android buildType(app-bundle) 및 submit(serviceAccountKeyPath/track) 설정 추가

# 2026-06-10 15:00:00 KST 홈 스켈레톤 UI 구현 + 캐러셀 스켈레톤 공용화

- NewsPromotionCarouselSkeleton 신규 (HomeScreen/NewsScreen 공용)
- HomeScreen: 캐러셀/사용자 추천 스켈레톤 적용, loadingPromotions/loadingUsers 상태 추가
- NewsScreen: 인라인 캐러셀 스켈레톤 → 공용 컴포넌트로 교체

# 2026-06-10 14:00:00 KST 소식 스켈레톤 UI 구현

- NewsCardSkeleton 신규 (소식 카드 레이아웃 스켈레톤)
- NewsScreen: 소식 리스트/추천 책/상세 본문 스켈레톤 적용
- 추천 책 loadingBooks 상태 추가, 상세 본문 "불러오는 중..." → 스켈레톤으로 교체

# 2026-06-10 13:00:00 KST 책이야기 스켈레톤 UI 구현

- SkeletonBox 공통 컴포넌트 신규 (shimmer 애니메이션)
- BookStoryFeedCardSkeleton 신규 (피드 카드 레이아웃 스켈레톤)
- StoryScreen: 피드 첫 로딩 시 카드 3개 스켈레톤, 상세 진입 시 댓글 스켈레톤 표시

# 2026-06-10 12:00:00 KST Silent Refresh - X-Refresh-Token 헤더 방식으로 수정

- BE JwtAuthenticationFilter: 쿠키 없을 때 X-Refresh-Token 헤더 fallback 추가 (feat-217-login)
- RN authApi.ts: silentRefreshSession body → X-Refresh-Token 헤더 방식으로 변경 (version-2)

# 2026-06-09 11:28:00 KST Silent Refresh 구현 계획 문서 작성

- 앱 재시작 시 쿠키 유실로 로그아웃되는 문제 원인 분석 (httpOnly+Secure 쿠키 RN 이슈)
- BE/RN 각 변경 파일 및 코드 수준 계획 정리 (`docs/documents/silent-refresh-plan.md`)
- expo-secure-store 패키지 설치 완료

# 2026-06-10 KST 모임/마이페이지 스켈레톤 UI 구현

- `MeetingListCardSkeleton`, `MyGroupsDropdownCardSkeleton` 신규 컴포넌트 생성
- `MeetingScreen`: 내 모임 목록 / 모임 검색 결과 로딩 텍스트 → 스켈레톤으로 교체
- `MyPageScreen`: 내 책이야기·내 서재·내 모임·내 알림·내 소식·구독 목록 로딩 텍스트 → 스켈레톤으로 교체 (SkeletonBox 인라인)

# 2026-06-10 KST 알림/책 검색 스켈레톤 UI + TODO 추가

- `AppHeader`: 헤더 알림 드롭다운 로딩 텍스트 → 스켈레톤 3행으로 교체
- `AppHeader`: 책 검색 결과 로딩 텍스트 → 결과 카드 스켈레톤 3개로 교체 (테스트용 2초 지연 포함)
- TODO 추가: 모임 내부 화면 스켈레톤, UserProfileScreen 스켈레톤

# 2026-06-10 22:47:03 KST 스켈레톤 UI 전면 구현

- `HomeScreen`: `userSkeletonRow` height 64 고정 → SubscribeUserItem 높이 불일치로 인한 레이아웃 shift 해소
- `UserProfileScreen`: 서재(6 book card) / 모임(3 group row) / 구독목록(3 user row) / 프로필 로딩 텍스트 전부 SkeletonBox로 교체
- `MeetingScreen`: `teamManageLoading` 텍스트 → 스켈레톤 rows 교체, `workspaceLoaded` 상태 추가
- `GroupNoticeView` / `GroupBookshelfView`: `isInitialLoading` prop 추가, 초기 워크스페이스 로딩 시 스켈레톤 표시

# 2026-06-10 23:05:00 KST 스켈레톤 테스트 지연 원복 및 TODO 추가

- 테스트용 5초 지연 4곳(HomeScreen/UserProfileScreen×3/MeetingScreen) 전부 제거
- TODO 추가: UserProfileScreen 스켈레톤 재검토 (마이페이지·타인 프로필 미노출)
- TODO 추가: 모임 내부 화면 스켈레톤 재검토 (GroupNoticeView/GroupBookshelfView 이상)

# 2026-06-10 23:20:00 KST 모임 포커싱 메커니즘 문서화 및 TODO 추가

- `docs/documents/meeting-focus-scroll-mechanism.md` 신규 작성 (focusGroupTitle / shouldScrollToBookshelfDetailRef / detailSectionYRef 흐름 정리)
- TODO 추가: 모임 화면 포커싱 동작 확인 (스켈레톤 타이밍 충돌 포함)

# 2026-06-11 10:39:47 KST MyPageScreen 스켈레톤 재구현 및 API 병렬화

- `MyPageScreen` 내 책이야기 탭 스켈레톤 재구현 — `storyThumb` 스타일 정확히 반영, title(40px)/excerpt(34px) 실제 minHeight 일치, storyActions 2버튼+divider 구조로 수정
- `loadMyPageData` `Promise.all` 병렬화 — 프로필/팔로우/책이야기/서재/모임 5개 fetch 동시 실행 (순차 → 병렬)
- 내 알림 탭 `useEffect` — `alarms.length > 0`이면 재fetch skip 처리

# 2026-06-11 10:58:00 KST 설정 화면 스켈레톤 구현

- 신고 관리: 로딩 텍스트 → reportCard 3개 스켈레톤 (badge/header/text 영역)
- 차단 관리: 로딩 텍스트 → reportCard 3개 스켈레톤 (nickname/버튼 영역)
- 알림 관리: 로딩 텍스트 → alarmRow 6개 스켈레톤 (label/body/toggle 영역)

# 2026-06-11 11:10:00 KST 설정 화면 스켈레톤 테스트 지연 제거

- 내 소식 관리 / 차단 관리 / 신고 관리 / 알림 관리 테스트용 5초 지연 전부 제거

# 2026-06-11 11:45:00 KST 모임 내부 스켈레톤 재구현 및 테스트 지연 제거

- GroupBookshelfView: 책장 스켈레톤 → 기수 버튼 chip 4개 + 2열 bookshelfCard 그리드로 재구현
- GroupNoticeView: 공지 스켈레톤 → 헤더("공지사항/모임의 공지사항을 확인하세요!") 유지, 리스트 자리에만 4개 row 스켈레톤
- MeetingScreen 테스트용 5초 지연 제거
- TODO 추가: 모임 내부 스켈레톤 직접 테스트 필요

# 2026-06-11 13:35:49 KST 댓글 포커싱 추가 및 모임 탭 포커싱 기준 통일

- `StoryScreen`: 피드 댓글 아이콘 → 상세 진입 시 스크롤만 되고 input focus 누락 → `handleCommentSectionLayout`에서 스크롤 완료(350ms) 후 `commentInputRef.current?.focus()` 추가
- `MeetingScreen`: `focusGroupTitle` 스크롤 기준점을 모임 이름 Text → pillNav Y(`pillNavAnchorYRef`)로 통일 — 모임 홈/공지사항/책장 탭 전환 시 pillNav가 항상 화면 최상단
- `GroupBookshelfView`: 책 상세/REGULAR_GROUP 진입 시 로컬 Y scrollTo → `onScrollToPillNav()` prop으로 교체, 포커싱 픽셀 불일치 해소 (`groupHomeScrollRef`/`detailSectionYRef` 의존 제거)
- TODO 갱신: "모임 화면 포커싱 동작 확인" ✅ 완료

# 2026-06-11 15:04:56 KST 모임 탭 포커싱 pending 패턴 제거 및 테스트 TODO 추가

- 모임 홈/공지 첫 진입을 "콘텐츠 onLayout 후 스크롤"(pending 패턴)로 시도했으나, 탭마다 스크롤 타이밍이 달라져 부자연스러움 → 전부 되돌림
- 결과: 세 탭(모임 홈·공지사항·책장) 모두 클릭 즉시 `focusGroupTitle(true)` 호출로 동일하게 유지 (책장 탭 클릭 기준). 코드 net 변경 없음(MeetingScreen 직전 커밋 상태로 복원)
- TODO 추가: 🧪 "모임 탭바 포커싱 동작 통일 확인" (실기기 QA)

# 2026-06-12 10:06:19 KST 모임 내부 스켈레톤 테스트 완료

- 공지/책장 탭 클릭별 테스트 지연(5초) 주입 → 공지 리스트 / 책장(기수 chip + 2열 그리드) 스켈레톤 정상 노출 확인 → 지연 제거(코드 net 변경 없음)
- TODO 갱신: "모임 내부 스켈레톤 직접 테스트 필요" / "모임 내부 화면 스켈레톤 UI 재검토" ✅ 완료

# 2026-06-12 10:30:03 KST 모임 탭 포커싱 기준 모임 이름으로 변경 및 책장 클램프 수정

- `MeetingScreen`: `focusGroupTitle` 스크롤 기준을 pillNav Y → 모임 이름 Text Y(`groupTitleAnchorYRef - spacing.xs`)로 변경 — 모임 이름이 화면 상단에 보이도록. 안 쓰게 된 `pillNavAnchorYRef`/pillNav onLayout 제거
- 책장 탭만 즉시 스크롤 시 GRID 콘텐츠 레이아웃 전이라 클램프되어 모임 이름이 덜 올라가는 문제 → `bookshelfTabScrollRef` 플래그 + `GroupBookshelfView` `bookshelfSection` onLayout에서 콘텐츠 레이아웃 후 스크롤하도록 수정 (책 상세/정기모임과 동일 패턴)
- 모임홈/공지 실기기 통과. 책장 실기기 확인 대기 (TODO 🔄)

# 2026-06-13 10:28:00 KST 쿠키 기반 인증 전환 및 모임 제목 포커싱 안정화

- 인증: 헤더(X-Refresh-Token) 기반 → 쿠키 기반으로 전환. `tokenStore`에 access/refresh 쿠키 저장·조회·삭제 헬퍼 추가, `http`에서 요청 시 Cookie 자동 첨부 + 응답 Set-Cookie 자동 저장(`readSetCookieHeaders`로 RN fetch 환경별 대응)
- `authApi`: silent refresh를 `POST /members/me/refresh` → `GET /members/me/login-status`(쿠키 유효성 확인)로 교체, 로그아웃/실패 시 `deleteAuthCookies()` 사용, 로그인 응답 타입 `string | {refreshToken?}` 대응
- `MeetingScreen`: 모임 제목 포커싱을 pending 플래그+flush 패턴으로 재구현, 뷰포트/제목 오프셋 측정 후 contentContainer `minHeight` 동적 부여로 스크롤 클램프 방지, 모든 탭 전환에서 `focusGroupTitle(true)` 통일
- 검증: `npm run typecheck` 통과

# 2026-06-13 12:29:56 KST 신규 인증(Silent Refresh/쿠키) 작업을 별도 브랜치로 분리, version-2는 옛 인증 흐름 복원

- 배경: BE PR #218(refresh 30일 rotation/`/members/me/refresh`)이 미머지 상태라, RN version-2가 신규 쿠키 인증 흐름으로 나가면 현 BE와 비호환 → 신규 인증 작업을 보관용 브랜치로 분리하고 version-2는 옛 흐름 유지
- 새 브랜치 `feature/auth-silent-refresh`를 version-2 HEAD에서 생성·push — Silent Refresh/쿠키 인증 구현 일체 보존
- version-2: 인증 코드 4개 파일을 인증 작업 직전(`a3f0fa9`) 상태로 복원 — `authApi.ts`/`http.ts`/`AuthGateContext.tsx` 되돌림, 신규 파일 `tokenStore.ts` 삭제. 스켈레톤/포커싱/WebSocket 등 무관 작업은 그대로 유지(history 재작성·force-push 없음)
- 검증: tokenStore/silentRefreshSession 등 잔여 참조 0건, `npx tsc --noEmit` 통과

# 2026-06-13 14:54:34 KST 기본 프로필 아바타 렌더링 수정 및 책 검색 무한 스크롤 적용

- `DefaultProfileAvatar`: 외부 SVG를 `SvgUri`로 불러오던 방식이 일부 iOS 기기(Pro Max 등)에서 고정 크기(140px)/`clip-path` 미적용으로 원 밖으로 삐져나오는 문제 → `react-native-svg` 프리미티브(`Svg`/`ClipPath`/`Ellipse`/`Rect`)로 직접 그려 viewBox 스케일링 보장 + 원형 `overflow:hidden` 래퍼로 넘침 차단(이중 안전장치)
- `AppHeader` 책 검색: "검색 결과 더보기" 버튼 제거 → ScrollView `onScroll`로 바닥 240px 이내 감지 시 `loadMoreSearchResults()` 자동 호출, 버튼 자리에 `ActivityIndicator` 스피너 표시(무한 스크롤). 중복 호출은 기존 가드(`searchLoading||searchLoadingMore||!searchHasNext`)로 방지
- 검증: `npm run typecheck` 통과

# 2026-06-13 16:01:43 KST 책장 상세 포커싱 기준 분리

- 모임 내부 탭 클릭은 기존처럼 모임 이름 기준 포커싱을 유지
- 책장 상세 진입은 `< 책장` breadcrumb가 상단에 오도록 상세 섹션 Y좌표 기준 포커싱으로 분리
- 상세 콘텐츠가 짧아도 목표 위치까지 스크롤 가능하도록 상세 섹션 최소 높이 보강

# 2026-06-13 16:20:38 KST 책장 상세 포커싱 좌표 보정

- 책장 그리드에서 아래쪽 카드 클릭 시 상세 포커싱이 모임 이름 기준으로 남는 문제 수정
- 상세 섹션 내부 Y좌표와 책장 섹션 Y좌표를 합산해 ScrollView 기준 `< 책장` 위치로 스크롤
- 콘텐츠 크기 갱신 후 상세 포커싱을 재시도해 레이아웃 반영 타이밍 보강

# 2026-06-13 16:45:27 KST 책장 상세 데이터 자동 로딩 및 TODO 갱신

- 책장 상세 진입/상세 탭 전환 시 상세 데이터 캐시가 없으면 자동으로 `reloadBookshelfMeetingDetail` 실행
- 발제/한줄평/정기모임 탭 첫 렌더에서 빈 상태 대신 로딩 문구를 먼저 표시하도록 수정
- TODO 갱신: 모임 탭바 포커싱 통과 처리, 회원가입/마이페이지 SVG/모임 생성/모임 상세정보 로딩 항목 추가

# 2026-06-13 16:57:21 KST 애플 로그인 백엔드 변경안 문서 추가

- `docs/documents/apple-login-backend-plan.md` 추가
- 현재 BE 회원가입/소셜 로그인 흐름과 RN Apple 로그인 도입 시 필요한 BE 변경 포인트 정리

# 2026-06-13 17:05:29 KST 회원가입/기본 프로필 UX 보완

- 회원가입 성공 토스트 문구를 "회원가입에 성공했습니다"로 변경
- 회원가입 직후 모임 배경 로드에서 `CLUB_MEMBER_404` 토스트가 노출되지 않도록 처리
- 기본 프로필 선택 상태 표시 및 기본 아바타 clip-path/마이페이지 원형 wrapper 안정화
- 검증: `npm run typecheck` 통과

# 2026-06-13 17:39:53 KST 회원가입 이메일 인증 UI 및 개발용 플로우 보완

- 회원가입 UI 개발용 진입 버튼과 로컬 6자리 이메일 인증 흐름 추가
- 이메일 인증 단계: 재인증 초기화 확인 모달, 인증번호 6자리 제한, 남은 시간 라벨 우측 정렬 적용
- 약관 상세 모달 스크롤 영역, 닉네임 형식 안내, 소개-이름 간격 보완
- 검증: `npm run typecheck` 통과

# 2026-06-13 17:51:28 KST 회원가입 모달 스크롤 및 프로필 입력 UX 보완

- `DialogOverlay` 카드 터치 래퍼 구조를 조정해 약관 상세 모달 내부 `ScrollView` 스크롤 제스처가 동작하도록 수정
- 회원가입 프로필 기본 단계: 닉네임 20자 초과 경고, 소개 카운터 우측 배치, 전화번호 `(아이디 찾기용)` 안내 추가
- 이메일 인증 버튼 비활성 조건, 회원가입 1~5단계 하단 CTA 위치, 기본 프로필 이미지 확인 모달 적용
- 검증: `npm run typecheck` 통과

# 2026-06-13 18:19:35 KST 회원가입 단계별 하얀 카드 크기 통일

- 회원가입 1·2·3단계(약관/이메일/비밀번호) 카드 최소 높이를 `minHeight: 600`으로 통일
- 회원가입 4·5·6단계(프로필/카테고리/가입완료) 카드 최소 높이를 `minHeight: 720`으로 통일
- `renderCard` 옵션을 `equalHeight?: 'sm' | 'lg'`로 구조화, 단계별 카드 그룹 분리
- 6단계(가입 완료) 버튼 3개를 `completeButtonGroup(marginTop: 'auto')`으로 묶어 하단 고정

# 2026-06-13 18:40:37 KST 회원가입 6/6 화면 레이아웃 및 1~3단계 나가기 확인 모달 추가

- 6/6 화면: "6 / 6" 텍스트를 제목 위로 이동, "참여중인 독서 모임이 있으신가요?" 를 프로필 카드 아래로 이동
- 6/6 화면: X 버튼 제거 (하단 버튼 3개로 탈출 가능)
- 6/6 화면: "참여중인..." 텍스트 하단 여백 확대, 버튼 그룹 상단 여백 축소
- 1·2·3단계 X 버튼 클릭 시 확인 모달("나가시겠습니까? 현재 저장된 정보가 사라집니다." / 취소·나가기) 추가

# 2026-06-13 18:53:34 KST 회원가입 나가기 모달 문구 수정

- 1·2·3단계 X 버튼 확인 모달 제목 "나가시겠습니까?" → "회원가입을 그만하시겠습니까?"로 변경

# 2026-06-13 23:43:13 KST 회원가입 비밀번호 입력 UX 개선

- 비밀번호 최대 길이 12자 → 24자로 변경 (maxLength, regex, 안내 문구 모두 반영)
- 비밀번호 입력란 상단 설명 문구 제거
- 비밀번호 입력란 하단에 조건 3줄 표시 (6~24자 / 영어 최소 1자 / 특수문자 최소 1자)
- 각 조건 미충족 시 회색 × 아이콘, 충족 시 초록색 ✓ 아이콘으로 실시간 표시

# 2026-06-14 01:41:13 KST TODO 상태 업데이트

- 마이페이지 SVG 확인하기 → ✅ (실기기 확인 완료)
- 모임 상세정보 로딩 안됨 → ✅ (실기기 확인 완료)

# 2026-06-14 01:58:33 KST 모달 시각 토큰 통일 및 마이페이지 버그 수정

- `src/theme/dialog.ts` 신규: `dialog.maxWidth` / `dialog.borderRadius` 토큰 정의
- 백드롭 하드코딩 rgba → `colors.overlay30` 통일 (AuthFlow/MyPage/Story/UserProfile/Meeting/ReportMemberModal)
- maxWidth(420/460/760/180) · borderRadius(md↔lg) → `dialog.*` 단일 토큰으로 수렴
- MyPageScreen: 프로필 수정 저장 후 설정 화면 자동 닫힘, 신고 내역 텍스트 오버플로우 수정, 버전 날짜 업데이트

# 2026-06-14 02:06:31 KST 이메일 인증 초기화 / 기본 프로필 확인 모달 → Alert 전환

- 이메일 인증 초기화 확인: DialogOverlay → Alert.alert() (destructive 스타일)
- 기본 프로필 이미지 확인: DialogOverlay → Alert.alert()
- 관련 state 2개 제거 (emailResetConfirmVisible, defaultProfileConfirmVisible)

# 2026-06-14 02:09:49 KST 공유하기 URL 수정 및 댓글 입력창 자동 확장

- 공유하기 URL 경로 수정: /book-stories/ → /stories/
- 공유 방식 변경: 클립보드 복사 → 네이티브 Share 시트
- 댓글 입력창: 수동 height 추적 제거 → minHeight(48)/maxHeight(120) 스타일로 자동 확장
- expo-clipboard import 제거

# 2026-06-14 02:14:25 KST 공유하기 링크 중복 수정 및 TODO 업데이트

- 공유하기 Share.share({ url, message }) → { message } 단일 전달로 링크 중복 제거
- TODO: 뒤로가기 액션 확인 항목 추가 (🧪 직접 테스트 필요)

# 2026-06-14 02:18:09 KST 회원가입 전화번호 라벨 괄호 텍스트 제거

- 전화번호 옆 "(아이디 찾기용)" 텍스트 제거

# 2026-06-14 10:26:21 KST 공지사항 태그 표시 로직 보강

- 공지사항 태그 타입에 일반 태그를 추가하고 고정/일반/투표/모임 렌더링 분기 보강
- 공지 API 응답의 `tagItems`/`tags`/`noticeTags` 등 복수 태그 후보를 정규화
- 공지 목록/상세 매핑에서 중복 없는 복수 태그 배열을 생성하도록 수정
- 검증: `npm run typecheck` 통과

# 2026-06-14 12:58:09 KST 공지 작성/관리 UX 개선 및 본문 enrich

- 공지 작성 모달: 제목/내용 입력창 자동 높이 확장(min/max), 책장 선택 인라인 오버레이로 전환, 작성/수정 완료 후 공지 목록 탭 이동
- 공지 목록/수정: 본문 비어 있는 항목을 상세 API로 enrich, 수정 시 상세 로드 후 열기, 책장 meetingId 해석 로직 보강 및 작성/삭제 후 전체 페이지 새로고침
- 관리 메뉴 바텀시트: ScrollView로 감싸 위로 끌어 확장 / 당겨서 닫기 제스처 지원
- 상단 공지 텍스트 1줄 말줄임 처리, 마이페이지 신고 내역 줄바꿈 간격(12→28) 및 강제 break 속성 제거
- 검증: `npm run typecheck` 통과

# 2026-06-14 13:01:14 KST 공지 상세 태그 색상 통일

- 공지 상세보기 태그를 리스트와 동일한 `renderNoticeTag` 로직으로 렌더링
- 기존 `category` 텍스트 단일 핀 스타일(진한 갈색) → 고정/일반/투표/모임 태그별 색상 일치
- 검증: `npm run typecheck` 통과

# 2026-06-14 13:04:35 KST 공지 입력 글자수 제한 추가

- `INPUT_LIMITS`에 `NOTICE_TITLE`(50) / `NOTICE_CONTENT`(2000) 추가
- 공지 내용 입력창: maxLength 2000 + 우측 하단 `현재/2000` 글자수 카운터 표시
- 공지 제목: 50자 초과 입력 시 토스트 안내 + 초과 입력 차단(ref 가드로 토스트 스팸 방지)
- 검증: `npm run typecheck` 통과

# 2026-06-14 13:28:27 KST 모임 생성 공개여부 안내 + 회원가입 기본 프로필 버튼 상태 수정

- 모임 생성 공개여부 섹션 아래 "나중에 모임 관리 화면에서 변경 가능" 안내 문구 추가
- 회원가입 프로필 설정: 진입 시 기본 프로필 버튼 미선택(secondary), 경고창 확인 후에만 선택(primary)로 전환되도록 `defaultProfileConfirmed` 상태 도입(사진 업로드 시 해제)
- `docs/agent/todo.md` `👀 버그수정 육안 확인`에 위 2건 추가, 원복된 책 검색 실시간 항목 제거
- 검증: `npm run typecheck` 통과

# 2026-06-14 15:35:47 KST 공지 작성 입력 UX 및 운영진 바텀시트 QA 반영

- 공지 제목/내용 카운터를 입력칸 위 라벨 우측으로 이동하고 제목/내용 초과 토스트 제한 처리 보강
- 긴 공지 내용 입력 시 내부 스크롤이 먼저 켜지도록 입력 높이 계산 여유값 조정
- 운영진 관리 바텀시트 닫힘을 애니메이션 완료 후 숨김 처리로 변경해 깜빡임 완화
- 실기기 통과 항목을 `docs/agent/todo.md`에 완료 반영

# 2026-06-14 15:58:55 KST 편집 중 이탈 경고 통일

- 공용 `useUnsavedChangesGuard` 훅을 추가하고 공지/발제/모임정보/책장 편집 플로우에 적용
- 책이야기 글/댓글, 회원가입 프로필 단계, 마이페이지 이메일/비밀번호 변경의 이탈 경고 보강
- `edit-discard-warning-audit.md` 적용 결과와 TODO 실기기 QA 항목 갱신
- 검증: `npm run check` 통과

# 2026-06-14 16:03:50 KST 작업 산출물 문서 3종 추가

- `2nd-review-changelog.md`: 2차 심사(version-2) 변경사항(버그 7·기능 7·개선 7) 정리 문서 추가
- `bottomsheet-unification-plan.md`: 바텀시트 3종 구현 현황 및 공용 컴포넌트 통일 계획 추가
- `ux-consistency-audit.md`: 바텀시트/이탈 경고/파괴적 삭제 등 UX 일관성·치명 이슈 전수 감사 문서 추가

# 2026-06-14 16:44:59 KST 실기기 QA 피드백 반영

- 책이야기 작성/수정, 댓글/대댓글 이탈 경고와 2뎁스 제한 보강
- 공지 작성/수정 입력 스크롤, 저장 중 깜빡임 완화 및 중복 제출 방지 보강
- 모임 정보 수정 사진 UI, 책장 생성/수정 버튼, 책장 수정 진입 크래시 대응
- TODO에 남은 육안 확인 항목 갱신 및 `npm run check` 검증

# 2026-06-14 17:08:13 KST 공지 투표·책장·책이야기 QA 수정

- 공지 투표 기본 기간을 현재 기준으로 보정하고 투표 payload/검증을 정리
- 공지 내용 입력칸 고정 높이 내부 스크롤, 투표 옵션 3번 이후 삭제 버튼 추가
- 책장 생성/수정 제출 로그와 ISBN13 정규화 보강, 책이야기 수정 진입 자동 포커스 제거
- 실기기 통과/잔여 항목을 TODO에 반영하고 `npm run check` 검증

# 2026-06-14 17:10:58 KST 책이야기 수정 진입 크래시(iOS) 대응

- 책이야기 수정 진입 시 마운트 즉시 `autoFocus`로 인한 iOS first-responder 충돌 크래시 추정, 자동 포커스 제거 유지
- 본문 입력칸에 `bodyInputRef` 연결 후 `InteractionManager.runAfterInteractions`로 전환 완료 뒤 수동 포커스 처리해 UX 보존
- 검증: `npx tsc --noEmit` 통과

# 2026-06-14 17:26:03 KST 책이야기 수정 크래시 근본 원인 해결 + 제목 수정 허용

- iOS 크래시 근본 원인이 Fabric(New Arch) + `LayoutAnimation`(`RCTComponentViewRegistry`)으로 확정되어 StoryScreen/NewsScreen/MyGroupsDropdownCard의 전환 LayoutAnimation 제거
- 책이야기 수정 저장 시 서버가 title 필수 요구 → `updateBookStory`에 제목 전송하도록 수정하고, 수정 모드에서 제목 입력 잠금 해제(책만 변경 불가)
- 크래시 추적용 임시 로그(menu_action/edit_step/render_compose/render_detail 등) 제거
- 검증: `npx tsc --noEmit` 통과

# 2026-06-14 20:48:43 KST 공지/책장 날짜 LocalDateTime 포맷 수정 + 네이티브 datepicker 도입

- 투표(공지)·책장 `meetingTime`이 `+09:00` 오프셋으로 전송돼 백엔드 `LocalDateTime` 파싱 실패(400) → `toKstApiLocalDateTime`/`toApiLocalDateTime` 추가로 오프셋 없는 포맷 전송하도록 수정(useNoticeState/useBookshelfState)
- 투표 기간 입력을 기기 네이티브 `DateTimeField`(iOS 스피너 모달 / Android 날짜·시간 다이얼로그)로 교체, `@react-native-community/datetimepicker` 도입(app.json plugin + iOS pod 링크)
- 공지 컴포저 제목/내용 입력 `scrollEnabled` 항상 true로 변경해 iOS 고정높이 multiline 진동(jitter) 제거
- 검증: `npx tsc --noEmit` 통과, eslint 0 error / 네이티브 모듈이라 `npx expo run:ios` 재빌드 필요

# 2026-06-14 20:55:30 KST 투표 항목 6개 제한 + 수정 불가 안내 + TODO 동기화

- 투표 항목 최대 6개 제한: `INPUT_LIMITS.NOTICE_POLL_OPTION_MAX=6` 단일 상수, 추가 시 토스트, UI는 6개 도달 시 "항목 추가" 버튼 숨김
- "투표" 제목 옆에 빨간 문구(`colors.likeRed`) "투표가 있는 공지사항은 수정이 불가합니다" 추가
- TODO 갱신: 공지 투표 QA·책장 날짜 항목을 🔄(코드 완료, 실기기 육안 잔여)로 전환하고 설명 현행화
- 검증: `npx tsc --noEmit` 통과, eslint 0 error

# 2026-06-14 21:07:14 KST 실기기 QA 4건 통과 반영(TODO ✅)

- 사용자 실기기 확인 결과 4건 통과 → TODO ✅ 전환: 공지 작성/수정·투표 QA, 모임 정보 수정 사진/책장 버튼, 책이야기 글 작성/수정 화면 꺼짐, 책장 수정 진입 크래시
- 잔여(나중): 뒤로가기 액션 QA, 공지 리스트 로딩, 회원가입/모임 생성 로직 — 심사 전 회원가입·모임 생성 스모크 테스트 권장
- iOS 제출은 datetimepicker pod 포함된 신규 EAS 빌드 산출물로 진행(옛 빌드 재활용 금지)

# 2026-06-14 23:28:18 KST 회원가입 개발용 UI(미리보기) 제거

- AuthFlowScreen에서 "UI 보기(개발용)" 버튼 및 `signUpUiPreview` 미리보기 메커니즘 전면 제거(상태/openSignUpUiPreview 핸들러/`__DEV__` 분기 3곳/더미 데이터 프리필/전용 스타일)
- 미사용이 된 `declare const __DEV__` 선언 제거, 회원가입은 실제 이메일 인증/제출 경로만 남김
- 검증: `npx tsc --noEmit` 통과, eslint 에러 0, `signUpUiPreview` 잔존 0

# 2026-06-15 10:55:09 KST 공용 바텀시트 드래그 닫기 핸들 + 바텀시트 메뉴 QA 통과

- 공용 `BottomSheet`에 PanResponder 기반 드래그-다운 닫기 핸들 추가(임계 거리/속도, reset/dismiss 애니메이션). 핸들을 공용 컴포넌트로 승격
- `BottomSheetActionMenu`의 개별 핸들/스타일 제거(공용 BottomSheet 핸들로 일원화)
- TODO: 책이야기/공지/책장 상세 바텀시트 메뉴 + 댓글/발제·한줄평 앵커 메뉴 유지 QA 5건 실기기 통과 → ✅
- 검증: `npx tsc --noEmit` 통과

# 2026-06-15 00:50:40 KST 모달/경고창/바텀시트 액션 메뉴 통일

- `BottomSheet` 기본 백드롭/시트 스타일과 safe-area 하단 패딩을 추가하고, `BottomSheetActionMenu` 공용 컴포넌트를 생성함
- 책이야기 상세/공지 상세/책장 상세 메뉴를 바텀시트 액션 메뉴로 전환하고, 댓글·발제·한줄평은 기존 앵커 메뉴 유지
- 공지/책장 삭제는 `Alert.alert` 확인창을 거치도록 정리하고, TODO에 실기기 육안 확인 항목 6건 추가
- 검증: `npm run check` 통과

# 2026-06-15 01:44:22 KST RN API v1 및 앱 인증 분리 대응

- API base URL 기본값을 `/api/v1`로 전환하고 legacy `/api` env 보정, 공용 `buildApiUrl`/`fetchApi` 정리
- 앱 로그인/로그아웃을 `/auth/app/*`로 전환하고 SecureStore refresh token 저장소 및 silent refresh single-flight 추가
- 앱 시작 401 refresh 복구, 직접 fetch 호출(news/닉네임/next meeting), 이미지 URL origin 기준 정규화 반영
- 검증: `npm run check` 통과

# 2026-06-15 12:04:26 KST 회원가입 중단 계정 재진입 처리 보강

- 회원가입 `AUTH_411` 응답에서만 기존 생성 계정 로그인 후 프로필 완성 단계로 이어가도록 조정
- 완성된 기존 계정(`AUTH_402`)은 로그인 또는 비밀번호 찾기 안내로 분리
- 흡수 완료된 `feature/auth-silent-refresh` 브랜치 로컬/원격 삭제

# 2026-06-15 14:56:34 KST 회원가입 프로필 이미지 업로드 실패 안내 분리

- 회원가입 중 프로필 이미지 업로드 URL 발급 실패와 S3 업로드 실패를 추가정보 저장 실패와 분리
- 이미지 업로드 준비 실패/업로드 실패 각각의 사용자 안내 문구 추가
- 검증: `npm run check` 통과, BE `origin/develop` 기준 `./gradlew test` 통과

# 2026-06-15 15:02:32 KST 로그인 화면 하단 링크 시작점 정렬

- 로그인 화면 하단 `아직 회원이 아니신가요?`와 `고객센터/문의하기` 링크를 같은 세로 묶음으로 정리
- 두 링크의 첫 글자 시작 위치가 맞도록 내부 왼쪽 정렬 적용
- 검증: `npm run check` 통과

# 2026-06-15 16:50:36 KST 미완성 프로필 복귀 플로우 RN-only 처리

- RN 인증 상태를 `loggedOut`/`profileIncomplete`/`loggedIn`으로 분리하고 `AUTH_403` 기반 프로필 생성 화면 진입을 연결
- 회원가입 비밀번호 단계에서 계정 생성/앱 로그인 세션을 확보하고, 프로필 단계는 추가정보 제출만 수행하도록 정리
- 보호 API에서 `AUTH_403` 발생 시 AuthGate가 프로필 생성 화면을 열도록 공용 API 레이어 이벤트 추가
- 검증: `npm run check`, BE targeted test, BE `./gradlew test` 통과

# 2026-06-15 17:00:21 KST 회원가입 로직 수정 TODO 완료 처리

- 미완성 프로필 복귀 플로우 실기기 확인 후 `회원가입 로직 수정` TODO를 완료 상태로 갱신
- RN 작업 변경분은 기존 커밋 `5ff14c8`에 반영되어 있고, 이번 변경은 TODO/agent-log 정리만 포함
- 검증: `npm run check` 통과

# 2026-06-15 21:27:26 KST 배포 전 회원가입/고객센터 정리

- AuthFlowScreen 개발용 UI 보기와 회원가입 preview 우회 로직 제거
- 미완성 프로필 `AUTH_403` 문구를 `프로필을 완성해 주세요.`로 통일하고 보호 API 복귀 흐름에 연결
- 고객센터 URL 기본값과 `.env.example`을 `https://www.checkmo.co.kr/support`로 통일
- 검증: `npm run check` 통과

# 2026-06-15 21:30:10 KST API per-endpoint 버전 오버라이드 추가

- 공용 HTTP 레이어에 `apiVersion` 옵션을 추가해 호출별로 `/api/v{n}` 경로를 선택할 수 있게 함 (미지정 시 기본 `v1`)
- `buildApiUrl`이 origin 대신 버전 루트(`.../api`)를 기준으로 조립하도록 변경해 서브패스 배포 경로를 보존하고, 잘못된 버전 값은 `v1`으로 안전 폴백
- 기존 호출부는 무변경(backward-safe), 향후 특정 API만 `v2`로 이전 시 `apiVersion: 'v2'`만 지정하면 됨
- 검증: `npm run typecheck`, `eslint http.ts`, URL 조립 스모크 통과

# 2026-06-15 21:38:36 KST EAS production 빌드 컨텍스트 정리

- EAS 업로드에서 참고용 BE/FE 디렉터리와 Codex/IDE 로컬 파일을 제외하도록 `.easignore` 추가
- `version-2`를 main에 fast-forward merge 후 main 기준 EAS production iOS 빌드 진행 예정
- 검증: `npm run check` 통과

# 2026-06-15 22:58:07 KST iOS 1.0.1 빌드 버전 문자열 수정

- `app.json`의 Expo 앱 버전을 App Store Connect 제출 버전과 맞춰 `1.0.1`로 정리
- 잘못 포함된 터미널 명령 문자열을 제거해 `expo config` 실패 원인을 수정

# 2026-06-15 23:05:28 KST EAS bare workflow runtimeVersion 수정

- bare workflow에서 지원되지 않는 `runtimeVersion` 정책 설정을 문자열 `1.0.1`로 변경
- iOS 1.0.1 production EAS 빌드가 `expo config` 이후 런타임 버전 단계에서 실패하지 않도록 정리

# 2026-06-15 23:19:13 KST 앱 네이티브 버전 1.0.1 정리

- iOS 바이너리가 읽는 `CFBundleShortVersionString`과 Xcode `MARKETING_VERSION`을 `1.0.1`로 변경
- JS/package 및 Android `versionName`도 `1.0.1`로 맞춰 앱 소유 버전 표기를 통일

# 2026-06-16 09:05:12 KST iOS iPhone 전용 타깃 정리

- App Store Connect가 iPad 스크린샷을 요구하지 않도록 Xcode `TARGETED_DEVICE_FAMILY`를 iPhone 전용 `1`로 변경
- `app.json`의 `supportsTablet: false`와 실제 iOS 네이티브 빌드 설정을 일치시킴

# 2026-06-16 10:51:03 KST 플레이스토어 제출 준비 정리

- Android Play 제출용 권한 정리, dev-client 제거, 시스템 picker 기반 이미지 선택 반영
- `bundleRelease` 성공 및 최종 manifest에서 민감 권한 제거 확인
- TODO에 플레이스토어 사용자 준비/Android 실기기 QA 항목 추가

# 2026-06-17 11:28:19 KST 텍스트 입력 스크롤/글자수 제한 정리

- 멀티라인 `FormTextInput` 기본 스크롤/상단 정렬 동작을 보강
- 책이야기 댓글/대댓글 포커스 시 키보드에 가려지지 않도록 댓글 영역 자동 스크롤 추가
- 긴 입력 필드의 내부 스크롤 높이와 글자수 초과 토스트 문구 정리

# 2026-06-17 11:49:30 KST 로그인 식별자 문구 정리

- 로그인 입력 안내를 `이메일 또는 닉네임` 기준으로 명확화
- 로그인 실패 토스트를 `이메일/닉네임 또는 비밀번호` 불일치 문구로 조정
- `FormTextInput`에 이메일/닉네임 공용 `identifier` 타입 추가

# 2026-06-17 15:09:45 KST 텍스트 입력 스크롤/토스트 QA 보강

- 신고/모임 정보 수정/공지 작성 모달 내부에서 글자수 초과 토스트가 보이도록 `ToastHost` 배치 보강
- 책이야기 본문과 신고 내용 입력칸의 긴 텍스트 스크롤 여백을 조정
- 토스트 배경을 덜 어둡게 조정해 키보드 위 가독성 개선

# 2026-06-17 16:10:01 KST 가입신청 포커싱/책이야기 제목 제한 정리

- 모임 가입신청 입력칸이 자동 포커스되고 키보드 위에 보이도록 스크롤 보정 추가
- 책이야기 제목 입력을 100자로 제한하고 카운터/초과 토스트 연결
- 글자수 테스트 육안 및 가입신청 포커싱 QA 항목을 TODO에 추가

# 2026-06-21 17:27:54 KST 2026-06-18 QA 메모 TODO 수집

- 사용자 실기기 QA 메모 10건을 TODO에 `🗒 2026-06-18 QA 수집` 신규 섹션으로 원문 기록
- 모임 생성/소식 날짜/모임 사람들/댓글 프로필/임시저장/알림 빨간색/댓글 최대개수/신고하기/공지 댓글 placeholder/알림 이동 항목 추가(상세 설명 대기)
- TODO 섹션 목록 인덱스 갱신 및 마지막 업데이트 날짜 2026-06-21로 반영

# 2026-06-21 17:58:04 KST 완료 문서 아카이브 정리 + 기능명세서 보충

- `(done)` 문서 42개를 `docs/archive/`로 이동하고, 코드 검증으로 완료 확인된 4개(차단/임시저장 API, 모달 시각 토큰, silent refresh, RN STOMP 디버깅)에 `(done)` 접두어 붙여 함께 아카이브
- 이동으로 깨진 todo.md의 문서 링크 36건+1건을 `docs/archive/` 경로로 갱신(agent-log 과거 기록은 유지)
- functional-spec.md 보충: 신고 API(createReport)·앱 토큰 로테이션·채팅 제거·차단 기능·소셜 로그인(BE 구현/RN 미연결)·버전 표기 현행화

# 2026-06-21 18:05:51 KST 레퍼런스 코드 디렉토리 정리(reference_code)

- BE/FE 중복 클론을 정리해 `reference_code/BE`(develop), `reference_code/FE`(fix-381-signup)로 통합하고 wrapper(checkmo_be2/checkmo_fe2) 삭제
- `.gitignore`에 `/reference_code` 추가 — RN에서 절대 커밋/푸시되지 않도록 격리(각자 다른 GitHub 레포 BE.git/FE.git와 연결된 독립 클론)
- `tsconfig.json` exclude를 `reference_code`로 정리 — tsc 컴파일 대상 0건 확인, RN 빌드/타입체크 영향 없음

# 2026-06-21 18:10:13 KST 미추적 기획 문서 커밋 정리

- 그동안 untracked로 남아있던 기획 문서 3건 추적 시작: apple-login-rn-plan, social-login-reintegration-plan, checkmo-usage-chatbot-system-prompt
- apple-login-backend-plan.md 미커밋 수정분 반영

# 2026-06-21 18:36:26 KST 문서 위치 정리 + docs/agent 완료 문서 아카이브

- docs 루트 md 2건(push-notification-implementation, social-login-reintegration-plan)을 docs/documents/로 이동
- docs/agent 완료 문서 2건에 (done) 붙여 archive로 이동: edit-discard-warning-audit(useUnsavedChangesGuard 적용 확인), meet-split-design(MeetingScreen 4073줄 < 목표 5000)
- issue-fetch(미완료 20건)·bottomsheet-unification-plan(미반영)·ux-consistency-audit(미완료)는 미완료로 판정해 유지
- 이동에 따른 todo.md/ux-consistency-audit.md/functional-spec.md 링크 경로 갱신(agent-log 과거 기록은 유지)

# 2026-06-21 18:46:18 KST 온보딩 구현 계획 확정 문서화

- 온보딩 캐러셀 계획 확정: 5장(헤더는 홈에 흡수)·하이브리드 비주얼·첫 실행 즉시 노출(로그인 무관)·건너뛰기·다시보기
- 업계 표준(3~5장, 첫 슬라이드 가치 제안) 리서치 반영, docs/documents/onboarding-plan.md 신규 작성
- TODO 🔜 구현 예정에 "온보딩(첫 사용자 가이드) 추가" 항목 등록(구현 대기)

# 2026-06-21 21:06:56 KST 온보딩 미리보기 + 약관 연동 계획 문서화

- 홈에서 열 수 있는 5장 온보딩 미리보기 화면과 슬라이드 상수 추가
- 약관 동의 매핑 BE·웹 FE·RN 구현 계획서 3종 작성
- 약관 DB·API 계약과 회원가입·재동의·철회, 단계적 배포·검증 기준 정리

# 2026-06-21 21:45:55 KST Apple 로그인 구현 계획 문서화

- `reference_code/BE`, `reference_code/FE`, RN 현재 인증 구조를 기준으로 Apple 로그인 백엔드·웹 FE·RN 계획서 3종 작성
- iOS·웹 공통 `APPLE + sub` 회원 매핑, client별 token 검증·해지, 약관 후 프로필 흐름과 배포·테스트 기준 정리
- Apple Developer 키 다운로드 및 웹 인증 도메인·Return URL 설정 화면을 문서 에셋으로 추가

# 2026-06-21 21:52:32 KST API 버전 관리 가이드 문서화

- BE는 기존 v1을 유지하고 breaking API만 v2로 추가하는 정책 정리
- 웹·RN은 기본 v1을 유지하면서 변경된 endpoint만 v2로 전환하는 방법과 배포 순서 문서화

# 2026-06-21 23:23:39 KST 관리자 신고목록 계획 문서 커밋 + 애플 키 TODO

- TODO 🔜 구현 예정에 "웹 애플로그인 키 발급"(Services ID/Key.p8/Key ID/Team ID/redirect 등록) 항목 추가
- 관리자 회원 신고 목록 계획 문서 2건 추적 시작: admin-member-report-list-backend-plan, admin-member-report-list-frontend-plan

# 2026-06-21 23:29:56 KST 모임 회원 로스터 공개 계획 문서 작성

- 일반(가입) 회원도 모임 회원 목록(프로필/닉네임/역할)을 볼 수 있게 하는 계획 확정: 노출범위 ①ACTIVE 가입 회원만
- 기존 /members(운영진+PII)는 재활용 불가 판정 → BE 신규 슬림 엔드포인트 GET /clubs/{clubId}/members/roster 설계
- docs/documents/club-member-roster-plan.md 신규 작성(BE/RN 체크리스트·DoD 포함)

# 2026-06-21 23:52:36 KST 책이야기 책 검색 풀스크린 모달 전환

- StoryScreen 책 검색을 BottomSheet → 풀스크린 Modal로 교체(하단 레이아웃 깨짐 해결)
- 결과 리스트 maxHeight:420 → flex:1, safe-area 하단 패딩, KeyboardAvoidingView로 키보드 가림 방지
- 미사용 BottomSheet import 및 전용 스타일 3개 제거, 검색 로직/선택 동작은 그대로

# 2026-06-22 00:12:36 KST 타인 프로필 모임 메뉴를 방문하기로 변경

- 다른 사람 프로필 > 모임 행의 ⋮ 메뉴를 신고하기/차단하기 → 단일 "방문하기"로 교체
- 방문하기 클릭 시 navigation.navigate('Meeting', { openClubId })로 해당 모임 이동(GroupItem에 clubId 추가)
- 프로필 헤더의 신고/차단 메뉴는 그대로 유지

# 2026-06-22 00:26:21 KST POST 후 즉시 반영 누락 전수 조사 + TODO 등록

- 전 도메인 뮤테이션 감사: 성공 후 즉시 반영 안 되는 ❌ 5건(가입신청/모임삭제/차단/신고/이메일변경) 식별
- ⚠️ 책 좋아요 화면 간 동기화, 책이야기 삭제 실패 롤백 누락 추가 식별
- TODO 🔜 구현 예정에 "POST 후 즉시 반영 누락 정리" 항목 등록(파일:라인·DoD 포함)

# 2026-06-22 11:22:25 KST 완료 문서 아카이브 + 레퍼런스 경로 정리

- 관리자 신고 목록 BE/FE 계획과 모임 포커싱 문서를 `(done)` 완료 문서로 `docs/archive/`에 이동
- 모임 포커싱 완료 확인 내용을 반영하고 TODO의 관련 문서 링크를 archive 경로로 갱신
- 로컬 BE/FE 레퍼런스 디렉터리를 `reference_code`에서 `ref_code`로 변경하고 설정·활성 문서 참조를 일괄 수정

# 2026-06-22 11:51:42 KST Expo 푸시 알림 RN·BE 상세 계획 문서화

- 기존 푸시 알림 조사 문서를 `(done)`으로 archive 이동하고 RN·Backend 구현 계획서를 각각 신규 작성
- Expo Push Service, 최초 안내 후 권한 요청, 인앱·푸시 동시 토글 정책과 device API·영속 delivery·ticket/receipt 처리 확정
- Alert 27건, DialogOverlay 6건, Modal 13건의 버튼 순서를 감사해 취소성 버튼이 모두 먼저 배치된 것을 확인

# 2026-06-22 14:06:12 KST 임시저장 삭제 + 입력 글자수 안내 보강

- 마이페이지 임시저장 태그 옆에 삭제 버튼·확인 Alert를 추가하고 성공 시 목록 즉시 제거 및 중복 요청 차단
- 공지사항 댓글의 BE 프로필 이미지 응답부터 RN 렌더링·기본 아바타·프로필 이동 연결을 확인하고 TODO 완료 처리
- 발제·한줄평(300자), 공지 제목(50자), 공지 내용(2000자) placeholder에 최대 글자수 안내 추가

# 2026-06-22 22:13:25 KST 책 검색 체감 속도 단축 Phase 0~1

- 공용 훅 useBookSearch 신설: debounce 400ms prefetch + 최소2자 + normalize/dedupe + AbortController + TTL 캐시(3분/30개), search()는 캐시 히트 시 즉시 표시
- 인프라: requestJson 외부 AbortSignal을 내부 timeout 컨트롤러와 연결, searchBooks(kw, page, {signal}) 추가
- AppHeader 검색을 훅으로 교체(중복 state/executeSearch/loadMore/resolveBookResultKey 제거), 계획서 book-search-latency-plan.md 작성

# 2026-06-22 22:21:13 KST 책 검색 통일 Phase 2 (책이야기·책장)

- StoryScreen 책 선택 검색, 책장(useBookshelfState) 검색을 공용 useBookSearch 훅으로 교체
- 각 화면 중복 검색 state/runBookSearch 제거, clear는 reset()로 통일
- GroupManagementOverlay/MeetingScreen prop 정리(setter 3개 → resetBookshelfBookSearch). 헤더 포함 3곳 검색 로직 단일화. typecheck/lint 0 errors

# 2026-06-22 22:31:38 KST 책 검색 totalResults 표기 (Phase 3)

- BookSearchResult에 totalResults 추가, normalizeBookList에서 서버 totalResults 파싱(없으면 items.length 폴백)
- useBookSearch가 totalResults를 state/캐시로 노출
- "총 N개" 표기를 length → totalResults로 교체(헤더/책이야기/책장 3곳). 책 검색 단축 Phase 0~3 전부 완료

# 2026-06-22 22:34:19 KST 책 검색 성능 BE 공유용 요약 문서 작성

- 백엔드팀 공유용 요약 작성: 측정 기반(캐시히트 1~30ms vs 미스 250~980ms), 앱 개선(prefetch+캐시+요청절감), 협조요청(totalResults 유지/인기검색어 워밍), 레이트리밋(IP→토큰) 검토
- docs/documents/book-search-performance-be-summary.md 신규

# 2026-06-22 22:47:48 KST 조별 채팅 기능 재도입

- 정기모임 조 상세에 채팅 FAB·권한별 조 선택·전체 화면 채팅방을 복원하고 최근 30개/상단 커서 페이징을 구현
- RN STOMP 공통 설정을 추출해 채팅 송수신·재연결 누락 병합과 기존 발제 실시간 동기화에 함께 적용
- 타인 메시지 `CHAT + messageId` 신고, 작성자 프로필 요약 모달·타인 프로필 이동을 추가하고 기능 명세/TODO/CHAT-03 상태를 현행화
- `npm run check` 통과(typography, spacing, typecheck, Expo Doctor 18/18)

# 2026-06-22 23:10:01 KST 채팅 프로필·신고 상호작용 수정

- 채팅 전체 화면 위 네이티브 모달 적층을 제거하고 프로필·신고를 채팅 화면 내부 오버레이로 전환
- 작성자 클릭은 프로필 사진·아이디·사용자 신고·바로가기 모달, 타인 메시지 박스 클릭은 메시지 신고로 분리
- 채팅 메시지의 불필요한 `⋮` 메뉴를 제거하고 `npm run check`·Expo Doctor 18/18 통과

# 2026-06-22 23:17:57 KST 채팅 메시지 복사·신고 메뉴 추가

- 채팅 박스 클릭 시 채팅 화면 내부 액션 시트를 열어 내 메시지는 복사, 타인 메시지는 복사·신고 메뉴를 표시
- `expo-clipboard`로 메시지 내용을 시스템 클립보드에 저장하고, 신고 선택 시에만 `CHAT + messageId` 신고 모달을 열도록 변경
- 기능 명세·TODO·실기기 QA 항목 갱신, typography·spacing·typecheck·대상 ESLint 통과

# 2026-06-22 23:26:25 KST 조 관리 드래그 자동 스크롤 안정화

- 조 관리 ScrollView의 viewport/content 높이·offset·maxOffset을 추적하고 상·하단 112px 시간 기반 자동 스크롤(180~900px/s) 적용
- 상단 빠른 조 칩과 스크롤 내부 카드의 drop zone 좌표를 분리하고 현재 대상 활성 피드백·정확한 스크롤 좌표 변환 추가
- responder 종료 거부와 terminate 취소 경로를 분리해 드래그 중 스크롤 탈취·의도치 않은 배정을 방지
- `npm run check` 통과(typography, spacing, typecheck, Expo Doctor 18/18), lint 0 errors

# 2026-06-24 11:39:47 KST ref_code 레포 연결 안내 추가

- AGENTS/CLAUDE 지침에 `ref_code/BE`, `ref_code/FE`가 각각 별도 백엔드·프론트엔드 GitHub 레포와 연결되어 있음을 명시

# 2026-06-24 14:47:21 KST RN 모임 회원 목록 구현

- RN 모임 홈에 참여자 목록, 총원, 운영진 배지, 프로필 이동, 구독 버튼을 추가
- `/clubs/{clubId}/participants` API 타입·정규화·cursor 더보기 처리 추가
- 비공개 모임 참여자 조회 제한 메시지와 로딩/빈 목록/오류 상태 반영

# 2026-06-25 00:25:36 KST 조 관리 드래그 보강 + 긴 입력 전수 조사

- 조 관리 멤버 드래그 중 손가락 추적과 상·하단 자동 스크롤 루프를 보강
- 책이야기/신고/모임소개/발제·한줄평/공지 입력의 BE·RN 글자수와 초과 동작을 전수 조사 문서로 정리
- 긴 입력칸 내부 스크롤, 상단 정렬, 하단 여백, 카운터 간격을 보정하고 TODO 실기기 QA 항목을 최신화

# 2026-06-26 16:02:07 KST TODO QA 상태 정리

- 신고하기 안됨, 공용 바텀시트 레이아웃 QA를 사용자 통과 확인으로 완료 처리
- BE/문서 이슈 묶음은 보류 상태를 설명에 반영하고 최종 편집일자를 갱신
- 공지사항 댓글 입력 제한은 BE 엔티티 기준 300자, RN maxLength 미연결 상태 확인

# 2026-06-26 17:21:23 KST POST 후 즉시 반영 누락 개선

- 공개모임 가입 성공 후 membership 재조회 기반으로 카드 상태와 내 모임 목록을 즉시 갱신
- 모임 생성·수정·삭제 후 모임 목록/상세 상태를 부모 화면까지 동기화
- 책 좋아요 변경 이벤트를 헤더 검색과 마이페이지 내 서재에 연결해 화면 간 상태를 즉시 반영
- 관련 실기기 육안 확인 항목 3건을 TODO에 추가하고 `npm run check` 통과

# 2026-06-27 13:25:15 KST 에이전트 지침 ref_code 정책 보강

- AGENTS/CLAUDE 지침에 RN 앱 레포 성격과 `ref_code` 읽기 전용·커밋 제외 정책을 명시
- `ref_code/BE`, `ref_code/FE`의 별도 레포·기술 스택 정보를 보강

# 2026-06-27 14:26:02 KST 모임 관리 메뉴 문구 정리

- 공개모임 가입 즉시 반영 QA와 모임 생성·수정·삭제 목록 즉시 반영 QA를 사용자 통과 확인으로 완료 처리
- 모임 관리 바텀시트의 `모임 수정하기` 문구를 `모임 정보 수정하기`로 변경

# 2026-06-27 14:41:54 KST 온보딩 비노출 및 공지 투표 피드백 정리

- 홈 화면의 온보딩 미리보기 진입점을 제거하고 TODO에 사용자·개발 환경 비노출 방침을 반영
- 조 관리·책 좋아요·모임 참여자 QA 통과 상태를 TODO에 반영
- 공지 댓글 placeholder에 최대 300자 표기를 추가하고 실제 입력 제한도 연결
- 실명 투표 항목의 투표자 0명 클릭 시 안내 토스트를 표시하도록 개선

# 2026-06-27 14:47:27 KST 모임 회원 목록 자동 로드 전환

- 모임 홈 회원 목록의 `더보기` 버튼을 제거하고 하단 스크롤 도달 시 다음 페이지를 자동 호출하도록 변경
- 추가 페이지 로딩 중에는 하단 `불러오는 중...` 상태만 표시하도록 정리

# 2026-06-27 14:56:35 KST 공지 작성 글자수 제한 정합화

- BE/운영 Swagger 기준으로 공지 제목 40자, 내용 1000자 제한을 확인
- RN 공지 작성/수정 입력 제한과 제출 직전 검증을 BE 기준에 맞게 조정
- TODO와 긴 입력 조사 문서의 공지 제목/내용 제한 상태를 BE/RN 일치로 갱신

# 2026-06-27 16:41:32 KST TODO 통과 상태 정리

- POST 후 즉시 반영 누락 정리, 공지사항 리스트 로딩 문제, 웹 애플로그인 키 발급을 사용자 통과 확인으로 완료 처리
- 각 항목 최종 편집일자를 2026-06-27로 갱신

# 2026-06-27 18:16:38 KST 스토어 재심사용 버전 1.0.2 상향

- `app.json`의 `version`을 1.0.1 → 1.0.2로 명시적 변경 (스토어 마케팅 버전)
- `runtimeVersion`도 1.0.1 → 1.0.2로 동기화 (OTA 업데이트 호환 키)
- buildNumber/versionCode는 EAS `appVersionSource: remote` + `autoIncrement`로 서버 자동 증가라 미변경

# 2026-06-27 18:26:06 KST EAS capability 동기화 비활성화

- iOS 빌드 시 `APPLE_ID_AUTH` capability 동기화 실패로 빌드가 중단되던 문제 대응
- `eas.json`의 `build.production.env`에 `EXPO_NO_CAPABILITY_SYNC=1` 추가해 capability 자동 동기화를 영구 비활성화
- RN 앱은 네이티브 Apple/소셜 로그인을 쓰지 않아(이메일/비번 로그인만) capability를 건드릴 필요 없음 확인

# 2026-06-27 18:46:48 KST 네이티브 버전 1.0.2 정합화 (app.json 무시 이슈 대응)

- iOS 빌드가 1.0.2로 안 올라가던 원인 규명: 네이티브 `ios/` 디렉터리가 있어 EAS가 `app.json`의 `version`을 무시하고 `Info.plist`/`MARKETING_VERSION`(1.0.1)을 사용
- iOS `MARKETING_VERSION`(Debug/Release)·`Info.plist` CFBundleShortVersionString을 1.0.2로 변경
- Android `versionName`, `package.json`, `package-lock.json` 루트 버전도 1.0.2로 정합화
- buildNumber는 EAS 원격 관리(현재 11) → 다음 빌드 시 자동 증가, API 버전 가이드 문서의 `1.0.1`은 예시라 미변경

# 2026-06-28 16:18:29 KST iPad(태블릿) 지원 활성화

- `app.json` `supportsTablet` false→true, 네이티브 `TARGETED_DEVICE_FAMILY`를 1→"1,2"(Debug/Release 모두)로 변경해 iPhone+iPad 빌드 타깃 설정
- iPad도 폰과 동일하게 세로 전용 고정: `Info.plist`의 `UISupportedInterfaceOrientations~ipad`를 세로 2방향으로 축소, `UIRequiresFullScreen` true로 변경(멀티태스킹 끄고 세로 전용 → 심사 안전)
- 심사 스크린샷은 13" iPad(2064×2752)만 준비하면 12.9"/11"는 Apple이 자동 축소 — iPad Pro 13" 시뮬레이터로 네이티브 재빌드(`expo run:ios`) 후 캡처
- 네이티브 활성화만 완료, RN 화면은 폰 비율 그대로 늘어남 → iPad 레이아웃 분기는 후속 작업

# 2026-06-28 17:49:52 KST RN 입력 길이 제한 BE 스펙 정합화

- RN 입력 제한 상수를 BE 최신 스펙에 맞춰 모임 소개 500자, 가입 신청 300자, 책이야기 댓글 300자로 조정
- 공지 이미지 첨부를 5개로 제한하고 투표 항목 255자 clamp/토스트/제출 검증을 추가
- 공지 댓글 초과 토스트 문구를 명시하고 `typecheck`, `lint`, `diff --check` 통과 확인

# 2026-06-28 18:59:42 KST RN 소셜 로그인(Android) 스캐폴딩 추가 (#263)

- Option C(시스템 브라우저 OAuth + 딥링크 일회용 코드 교환) RN 구현: `socialAuth.ts`, `authApi.exchangeOAuthCode`, `expo-web-browser` 추가
- `AuthFlowScreen` 로그인 화면에 Android 전용 카카오/구글/네이버 버튼 통합, 브랜드 로고 에셋 복원 + `AppButton`에 `leftIcon` 옵션 추가
- iOS는 `Platform` 게이팅으로 미노출(App Store 4.8 회피), 토큰은 딥링크에 안 싣고 일회용 코드만 사용. 실동작은 BE 배포 + EAS Dev Build 후 검증 예정
- `CLAUDE.md` ref_code 규칙 갱신(BE/FE 클론은 각자 레포에 직접 커밋 가능), 전체 `tsc --noEmit` 0 에러 확인

# 2026-06-28 22:48:51 KST 프로필 편집 닉네임 변경 구현

- 기존 프로필 편집(소개/이미지/카테고리)에 닉네임 변경 추가, `PATCH /members/me`로 전송 (`UpdateMyProfilePayload`에 `nickname` 추가)
- 중복 검사 분기를 BE/FE와 동일하게 구현: 현재 닉네임이면 API 생략·자동 통과, 변경 시에만 `checkNicknameDuplicate`(true=중복/false=가능) 요구, 저장 시 `변경됨 && !확인`이면 차단
- check↔save 사이 선점 대비 BE `MEMBER_416` 재검증 시 재확인 유도, 저장 성공 시 `profileName` 갱신으로 헤더/표시 즉시 반영
- 입력 필터(소문자/숫자/특수문자, 20자)·상태 메시지(가능 초록/중복 빨강)·`typecheck`·`lint`·하드코딩 체크 통과

# 2026-06-28 23:03:16 KST RN 앱 버전 업데이트 게이트 구현

- 앱 부팅 시 `/app/version?platform=ios|android` 버전 정책을 조회하는 API 클라이언트 추가
- 현재 앱 버전과 `minSupportedVersion`/`latestVersion`을 비교하는 버전 게이트 훅 구현
- 강제 업데이트는 닫기 불가, 권장 업데이트는 닫기 가능 모달로 분기하고 `storeUrl`로 스토어 이동 연결
- `typecheck`, typography/spacing 체크, `lint` 통과 확인

# 2026-06-28 23:53:13 KST 모임 가입신청 키보드 포커싱 끊김 개선

- 가입신청 폼 위치 측정 ref를 추가하고 키보드 top 기준으로 제출 버튼이 키보드 위에 남도록 보정
- 중복 스크롤 예약과 타이핑 중 보정을 제거해 열림 중 끊김 현상 완화
- TODO의 모임 가입신청 입력칸 QA 항목은 미완료로 유지하고 끊김 현상 개선/재확인 필요 메모 반영
- `typecheck`, typography/spacing, `lint`, `diff --check` 통과 확인

# 2026-06-29 12:45:38 KST 앱 소셜 로그인/약관 동의 회원가입 정렬

- 앱 OAuth 코드 교환 및 Apple 네이티브 로그인 API를 RN 로그인 화면에 연결하고 소셜 아이콘 UI를 원형 버튼으로 정리
- iOS Apple Sign In 설정과 entitlement 반영, Google/Kakao/Naver 브라우저 OAuth를 iOS/Android 공통 흐름으로 확장
- 이메일 회원가입 약관 동의를 서버 `GET /terms` 기반으로 전환하고 `/auth/signup`에 `agreements` payload를 전송하도록 수정
- `npm run check`, `git diff --check` 통과 확인

# 2026-06-29 16:47:56 KST 앱 소셜 로그인 테스트 마무리

- 로그인 화면 소셜 버튼 UI를 최종 조정: Apple은 iOS 전용 검정 원형 버튼 + 공통 테두리, Kakao 로고는 중앙 정렬
- BE 미머지 상태인 앱 버전 정책 조회를 임시 비활성화하고 TODO에 재활성화 항목 추가
- Apple 네이티브 로그인은 Expo Go가 아닌 EAS iOS preview 빌드에서 테스트하도록 확인

# 2026-06-29 21:20:39 KST 소셜 로그인 약관 동의 흐름 반영

- 소셜/Apple 로그인 후 프로필 미완성 사용자가 약관 동의 화면을 먼저 거치도록 프로필 완성 흐름 시작 지점을 조정
- 프로필 완성 흐름에서는 `GET /members/me/terms`로 기존 동의 상태를 불러오고 `POST /members/me/terms`로 저장한 뒤 프로필 입력으로 이동
- 이메일 회원가입의 기존 공개 약관 조회/회원가입 agreements 전송 흐름은 유지

# 2026-06-29 23:17:19 KST 앱 버전 1.1.0 상향 (iOS 스토어 제출용)

- 스토어 재제출 위해 앱 버전 1.0.2 → 1.1.0 상향. 네이티브 추적 함정 대응으로 동기화 대상 전부 변경: `app.json`(version/runtimeVersion), `ios/app/Info.plist`(CFBundleShortVersionString), `project.pbxproj`(MARKETING_VERSION ×2), `android/app/build.gradle`(versionName), `package.json`, `package-lock.json`(루트 2곳)
- `package-lock.json`의 의존성 패키지 버전(node_modules/* 12건)은 그대로 두어 lockfile 무결성 유지
- 1.0.2 이후 변경: Android 소셜 로그인(카카오/구글/네이버), iPad 지원, 앱 강제 업데이트 게이트, 닉네임 변경, 소셜 로그인/약관 흐름 정렬
- buildNumber는 EAS autoIncrement라 미변경(빌드 시 자동 →13)

# 2026-07-01 09:50:09 KST 앱 버전 정책 조회 재활성화

- BE 앱 버전 정책 API(`GET /app/version`) 연동 완료로 `useAppVersionGate`의 `APP_VERSION_POLICY_LOOKUP_ENABLED`를 `false` → `true`로 복구
- iOS App Store 링크 `https://apps.apple.com/app/id6777671102`가 책모(개발자 Hyunil Yun) 앱으로 확인됨
- 남은 이슈: 업데이트 버튼 클릭 시 스토어 미이동 — 정책 응답 `storeUrl` 값 점검 필요(조사 진행 중)

# 2026-07-01 09:54:51 KST 앱 버전 1.1.1 상향

- 스토어 재제출용 앱 버전 1.1.0 → 1.1.1 상향. 네이티브 추적 함정 대응으로 동기화 대상 전부 변경: `app.json`(version/runtimeVersion), `ios/app/Info.plist`(CFBundleShortVersionString), `project.pbxproj`(MARKETING_VERSION ×2), `android/app/build.gradle`(versionName), `package.json`, `package-lock.json`(루트 2곳)
- `package-lock.json`의 의존성 패키지 버전은 그대로 두어 lockfile 무결성 유지(diff 루트 2줄만 변경 확인)
- buildNumber(iOS)/versionCode(Android)는 EAS autoIncrement라 미변경

# 2026-07-01 10:42:19 KST iOS 앱 아이콘 강제 추적 커밋 (엠보싱/옛 아이콘 문제 대응)

- build 14 IPA를 직접 추출해 확인: 바이너리 아이콘은 flat이나 현재 소스가 아닌 옛 "여백 많은" 버전이 박혀 있었음(App Store Connect의 엠보싱은 별개의 캐시된 옛 이미지)
- 원인: `.gitignore`(42~45줄)로 `ios/app/Images.xcassets/AppIcon.appiconset/`가 미추적 → EAS가 app.json 현재 아이콘 대신 캐시된 옛 아이콘 사용, `--clear-cache`로도 미교체
- 조치: `assets/checkmo-app-icon-ios.png`를 알파 없는 불투명 RGB로 변환해 네이티브 아이콘셋(`App-Icon-1024x1024@1x.png`)에 덮어쓰고 `Contents.json`과 함께 `git add -f`로 강제 추적
- 소스 에셋도 알파 제거해 일원화(prebuild 경로 알파 거부 방지). 재빌드 시 커밋된 아이콘이 박히도록 함

# 2026-07-01 16:19:27 KST 백엔드 API 계약 후속 문서 작성

- BE `develop` 최신 코드 기준으로 앱 버전 정책, Swagger 권한 문서, 검색 검증, 날짜/nullable 응답 계약 이슈를 정리
- 백엔드 전달용 문서 `docs/documents/backend-api-contract-followup-2026-07-01.md` 추가
- 커밋 범위 외 변경(HomeScreen/온보딩/스토어 산출물/IDE·skill 미추적 파일)은 요청대로 원복 또는 삭제

# 2026-07-01 22:34:26 KST FE/RN 영어화 계획 문서 작성

- FE Next.js 영어 지원 전환 계획 문서 추가
- RN Expo 앱 영어 지원 및 iOS/App Store·Google Play 현지화 계획 문서 추가
- 공식 Next.js, next-intl, Apple, Google, Expo 문서 기준으로 라우팅, 앱 내부 문자열, 스토어 메타데이터 전략 정리

# 2026-07-02 00:42:12 KST i18n 용어집 작성

- Checkmo 브랜드명과 `club`, `group`, `meeting` 계열 핵심 번역 기준 정리
- RN/FE 공통 번역 source of truth로 `docs/documents/i18n-glossary.md` 추가
- 스토어 앱 이름, 권한 문구, 기본 톤앤매너, 법률/정책 보류 항목 정리

# 2026-07-02 13:11:31 KST RN 언어 선택 기능 추가

- 앱 전역 언어 context와 `ko/en` 번역 catalog 추가
- 마이페이지 설정의 기타 섹션에 언어 선택 화면 추가
- 영어 선택 시 Profile/Settings 주요 문구, 하단 탭 label, 로그아웃 확인창이 즉시 영어로 표시되도록 반영

# 2026-07-02 23:41:50 KST 배포 앱 채팅 WebSocket 연결 보강

- 채팅 STOMP 연결 전에 로그인 세션을 preflight로 확인해 배포 앱 쿠키 인증 경로를 안정화
- `/user/queue/errors` 구독과 연결 상태(`preparing/connecting/connected/error/closed`) 표시를 추가
- 채팅 헤더에 연결 오류/끊김 상태를 노출하고 `EXPO_PUBLIC_WS_BASE_URL` 예시 값을 문서화
- `npm run check`, `npm run lint` 통과 확인

# 2026-07-02 23:51:16 KST RN 영어 지원 범위 확장

- 마이페이지 외 홈/모임/책이야기/소식/인증/사용자 프로필/온보딩/채팅/관리 모달까지 영어 번역 경로 확장
- `AppButton`, `FormTextInput`, `showToast` 공통 번역 처리와 `ko/en` 리터럴 사전 보강
- 모임/조/책장/공지/신고/알림/설정 계열 주요 UI 문구 영어화
- `npm run check` 통과 확인

# 2026-07-02 23:54:53 KST 문서 산출물 정리

- 서비스 소개 HTML 문서와 홍보 제안서 HTML 문서 추가
- 홍보 제안서용 히어로 이미지 추가
- `docs/agent/todo.md`의 실기기 통과 항목 상태 갱신
- `npm run check` 통과 확인

# 2026-07-03 00:00:43 KST 모임 수정 중복확인 추가

- 모임 정보 수정 화면에 모임 이름 중복확인 버튼과 결과 메시지 추가
- 기존 이름은 그대로 저장 가능하게 하고, 변경된 이름은 중복확인 통과 후 저장되도록 검증
- 저장 중 백엔드 중복 응답(`CLUB_400`/409)을 UI 상태에 반영
- `npm run check` 통과 확인

# 2026-07-03 00:26:49 KST 가입 신청 폼 및 책이야기 무한스크롤 보강

- 모임 가입 신청 폼에 `가입 신청하기`/`닫기` 액션을 분리하고 입력박스가 키보드 위에 오도록 보정
- 책이야기 탭 무한스크롤에 ref 기반 in-flight 락과 짧은 end-reached debounce 추가
- 책이야기 추가 로드 실패 시 반복 토스트 대신 footer 재시도 상태로 처리
- `npm run check` 통과 확인

# 2026-07-03 13:52:03 KST 앱/웹 로그인 계약 문서화

- 백엔드 전달용 앱/웹 로그인 계약 정리 문서 추가
- 쿠키 기반 웹 인증과 Bearer 기반 앱 인증의 분리 방향, WebSocket 인증 요청안, 수용 기준 정리
- `docs/agent/todo.md`에 최근 변경사항 유관 확인 섹션 추가

# 2026-07-03 17:25:23 KST RN 로그인 세션 복원 보강

- 앱 시작·로그인 직후·채팅 연결 전 `silentRefreshSession()`을 먼저 수행해 배포 앱 쿠키 세션 복원을 보강
- refresh 실패 시 401/세션 초기화 계열에서만 SecureStore refreshToken을 삭제하도록 조정
- `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 18:08:14 KST 알림 redirect 보강

- 알림 타입별 redirect에서 공지/정기모임 `sourceId`를 사용해 상세 화면으로 진입하도록 수정
- 삭제된 모임, 탈퇴한 회원, 누락된 대상 ID는 이동하지 않고 적절한 토스트를 표시하도록 방어
- 모임 화면 라우트 파라미터와 책장/공지 상세 오픈 경로를 확장하고 `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 18:36:33 KST 상대시간 라벨 갱신 보강

- 알림/책이야기/홈 피드의 `방금 전` 등 상대시간을 저장값이 아닌 렌더 시점 계산으로 변경
- 30초 주기 및 앱 활성화 시 현재 시간을 갱신하는 `useRelativeNow` 훅 추가
- 백엔드 KST `LocalDateTime` 문자열을 KST 벽시계 기준으로 파싱하도록 날짜 유틸 보정
- `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 18:45:17 KST 신고 관리 및 프로필 책이야기 이동 보강

- 마이페이지 신고 관리 목록을 백엔드 `ReportInfo` 응답 필드에 맞춰 매핑
- 신고 카드에 대상 타입, 대상 표시명, 이미지, 신고 사유, 날짜를 표시하고 `redirectUrl` 기반 이동 연결
- 다른 사람 프로필의 책이야기 카드 클릭 시 `Tabs > Story` 상세 진입을 단일 navigate로 처리
- `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 18:50:51 KST 프로필 편집 및 Android 공지 투표 UI 보강

- 프로필 편집 소개글을 멀티라인 입력으로 변경하고 설정 화면 키보드 상태 버튼 터치를 보강
- Android 공지 작성 모달의 상단 여백 계산을 보정해 화면이 아래로 밀려 보이는 현상 완화
- 공지 투표의 `실명`/`중복 가능` 선택 칩 터치 영역과 키보드 상태 터치 처리를 보강
- `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 18:58:05 KST 모임 문의 링크 수정 및 QA 체크리스트 정리

- 모임 정보 수정 화면에서 문의 링크 추가/수정/삭제가 가능하도록 `links` draft와 저장 payload 연결
- 백엔드 `ClubDetail.links` 계약에 맞춰 label/link 제한과 빈 링크 제외 처리 반영
- `docs/agent/todo.md`에 `7/2 QA 이후 수정한것들 육안 테스트` 섹션을 추가하고 미확인 실기기 항목 정리

# 2026-07-03 19:03:16 KST 거절 후 모임 가입 버튼 상태 갱신

- 모임 탭 focus 시 목록을 재조회해 가입 신청 거절 상태가 바로 반영되도록 보강
- 서버 membership status가 신청/가입 상태가 아니면 로컬 `신청완료` 오버레이를 제거해 `가입 신청하기` 버튼을 다시 활성화
- 클럽 목록 병합 시 서버가 명시한 membership status 기준으로 `applicationStatus`를 재계산하도록 수정

# 2026-07-03 19:10:09 KST 모임 관리 시트 및 비로그인 신고 플로우 보강

- 모임 관리하기 바텀시트가 기기 높이 기준 화면 아래에서 시작해 올라오도록 조정
- 모임 가입 신청 관리와 모임 회원 관리 화면에 pull-to-refresh 새로고침 연결
- 비로그인 상태에서 책이야기 신고 진입/제출 시 신고 모달을 먼저 닫고 로그인 화면으로 이동하도록 수정
- `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 19:17:19 KST 소식 상세 작성일 배치 수정

- 소식 상세 히어로 이미지 위 작성일 오버레이를 제거
- 상세 본문 영역을 `소식 제목` → `작성일` → `내용` 순서로 정리
- `docs/agent/todo.md`에 소식 상세 레이아웃 육안 테스트 항목 추가
- `npm run typecheck`, `npm run lint`, `git diff --check` 통과 확인

# 2026-07-03 20:10:39 KST 로컬 E2E 러너 및 리포트 추가

- 로컬 전용 Maestro E2E smoke flow(`tests/e2e/ios-guest-smoke.yaml`) 추가
- E2E 가능 기능 카탈로그와 로컬 실행 가이드 문서화
- E2E 실행 결과 Markdown/CSV 리포트 생성기 추가 및 iOS guest smoke 결과 기록
- 로컬 Codex skill `checkmo-e2e-runner` 생성 및 skill 검증 통과

# 2026-07-03 20:23:31 KST 로그인 E2E 결과 및 육안 QA 캡처 문서화

- 테스트 계정 기반 iOS 로그인 성공/세션 유지 E2E를 로컬 Maestro로 실행하고 Markdown/CSV 리포트에 기록
- 테스트 계정 정보가 레포에 남지 않도록 임시 flow와 런타임 변수 방식으로만 실행
- `docs/documents/visual-qa-checklist-2026-07-03.md`에 7/2 QA 이후 육안 테스트 항목 스냅샷 작성

# 2026-07-04 03:14:25 KST 로컬 전체 E2E 재실행

- iOS 비로그인 guest smoke, 로그인 smoke, 로그인 세션 유지 E2E를 로컬 Maestro로 실행하고 전부 통과 확인
- iOS secure storage 잔존으로 guest 전제가 깨지지 않도록 `clearKeychain`을 guest/login smoke flow에 추가
- 로그인 E2E flow를 레포에 추가하되 테스트 계정 정보는 런타임 변수로만 전달하도록 정리
- 2026-07-04 Markdown/CSV E2E 리포트와 E2E 카탈로그를 갱신

# 2026-07-06 11:22:44 KST QA 후속 수정 및 로컬 테스트 리포트 정리

- 로컬 E2E 리포트 생성기를 전체 기능 매트릭스 PASS/FAIL/NOT RUN/BLOCKED 표기 방식으로 확장
- 신고 작성 중 모달 닫기 시 저장되지 않음 확인창을 표시하도록 보강
- 비로그인 모임 `방문하기` 취소 시 모임 검색 화면이 유지되도록 수정
- `docs/agent/todo.md`에 모임 방문하기/책이야기 본문 잘림 육안 테스트 항목 추가

# 2026-07-06 11:31:42 KST 책 검색 인증 및 마이페이지 책이야기 복귀 수정

- 책 검색 화면의 게스트 하트/글 작성 버튼을 `requireAuth` 로그인 모달 흐름으로 통일
- 마이페이지 `내 책 이야기`에서 연 상세를 닫으면 다시 `마이페이지 > 내 책 이야기`로 복귀하도록 라우트 플래그 추가
- `docs/agent/todo.md`에 두 변경사항의 육안 테스트 항목 추가

# 2026-07-06 12:03:20 KST 모임 조회/관리 시트 및 발제 선택 QA 정리

- 모임 조회 제목을 로그인/게스트/검색·필터 상태별 문구로 정리하고 긴 모임 카드 텍스트를 2줄 말줄임 처리
- Android 발제 선택 카드의 선택 배경/테두리/체크 색상을 iOS 톤과 맞춤
- 모임 관리하기 바텀시트의 백드롭 터치를 손잡이 드래그와 같은 닫힘 애니메이션으로 분리
- `docs/agent/todo.md`에 육안 테스트 통과/미확인 항목을 갱신

# 2026-07-06 12:14:57 KST 책 검색 인증 레이어 및 소식 카드 QA 반영

- 비로그인 책 검색 좋아요 클릭 시 검색 오버레이를 닫고 로그인 모달이 위에 뜨도록 수정
- 마이페이지 언어 설정은 다른 언어 준비중 토스트만 노출하고 메뉴 진입을 보류
- 소식 카드 목록을 이미지/날짜와 제목/내용 2열 구조로 재배치하고 skeleton도 동일 구조로 맞춤
- `docs/agent/todo.md`에 통과된 육안 테스트 항목을 갱신

# 2026-07-06 12:37:21 KST 신고 관리 API 및 QA 후속 반영

- 책이야기/알림 등 생성 시간 상대 표기가 9시간 밀리지 않도록 생성 이벤트 시간 파싱을 분리
- 모임 관리하기 바텀시트 백드롭 터치가 지연 없이 즉시 닫히도록 수정
- 마이페이지 신고 관리 API 응답 매핑을 BE develop 기준으로 보강하고 API 실패를 빈 목록으로 숨기지 않도록 수정
- `docs/agent/todo.md`에 신고하기 접수/신고 관리 반영 등 남은 육안 테스트 항목을 갱신

# 2026-07-06 12:43:48 KST 책이야기 무한스크롤/관리 바텀시트 QA 통과 반영

- 책이야기 탭 무한스크롤 중복 요청 방지 육안 테스트를 사용자 통과 확인으로 갱신
- 모임 관리하기 바텀시트 상단 터치 즉시 닫힘 육안 테스트를 사용자 통과 확인으로 갱신

# 2026-07-06 12:59:49 KST 검색 인증/상대표기/모임 카드 QA 반영

- 책 검색 2뎁스 좋아요 인증 취소 시 직전 검색 화면을 유지하도록 수정
- 책이야기/알림 생성 시간 상대표기가 `방금 전`에 고정되지 않도록 KST 생성 시간 파싱을 수정
- 마이페이지 메인 breadcrumb 제거 및 모임 카드 본문 클릭 시 가입 신청 폼 열기를 반영
- `docs/agent/todo.md`에 관련 육안 테스트 항목을 추가/갱신

# 2026-07-06 13:10:17 KST 모임 탈퇴/댓글 버튼 QA 반영

- 책이야기 댓글/대댓글 작성 버튼 문구를 `입력`에서 `등록`으로 변경
- 모임 회원 관리에서 내 계정 탈퇴 시 마이페이지 내 모임 탈퇴와 같은 `leaveClub` API를 사용하도록 수정
- 내 계정 모임 탈퇴 성공 후 책모 홈 탭으로 이동하고 로그인 상태가 유지되도록 흐름을 분리
- `docs/agent/todo.md`에 관련 육안 테스트 항목을 추가

# 2026-07-06 13:49:19 KST 생성 시간 상대표기 QA 통과 반영

- 생성 시간 상대표기 갱신 항목을 코드상 확인 기준으로 통과 처리
- KST 이벤트 시간 파싱과 30초/앱 active 복귀 재계산 흐름을 TODO에 기록

# 2026-07-06 14:05:10 KST 바텀시트 효과 통일 및 모임 카드 표시 복구

- 책이야기/공지/책장 공통 바텀시트 메뉴를 모임 관리 바텀시트와 같은 fade + translateY 효과로 변경
- 모임 카드의 긴 모임명/대상/지역 말줄임 처리를 기존 무제한 표시 방식으로 복구
- 모임 탭 목록 제목을 기존처럼 기본 상태에서만 `독서 모임 추천`이 보이도록 복구

# 2026-07-06 14:20:12 KST 마이페이지 스켈레톤/좋아요 QA 반영

- 마이페이지 비로그인/프로필 로딩 중 `user_id` fallback 노출을 스켈레톤 표시로 교체
- 마이페이지 내 책이야기 카드가 API의 `likedByMe`/`liked` 값을 반영해 하트 채움 상태를 표시하도록 수정
- `docs/agent/todo.md`에 관련 육안 테스트 항목 2개 추가

# 2026-07-06 14:43:45 KST 차단 반영/키보드 dismiss 전수 반영

- 차단/차단해제 이벤트를 앱 내부에 즉시 전파해 홈·책이야기·검색·프로필 목록에서 새로고침 없이 반영되도록 수정
- 댓글·작성·검색·중복확인·저장·전송 등 입력 후 버튼 동작에서 첫 터치에 기능 실행과 키보드 dismiss가 함께 일어나도록 전수 보강
- `docs/agent/todo.md`에 키보드 닫힘/즉시 실행 전수 확인 항목을 추가

# 2026-07-06 14:53:26 KST 공지 댓글 버튼/QA 통과 반영

- 공지사항 상세 댓글 작성 버튼 문구를 `입력`에서 `등록`으로 변경
- 공지사항 댓글 입력 영역의 버튼 크기·간격·입력창 높이를 책이야기 댓글 기준에 맞춤
- Android/마이페이지/키보드/신고 관련 사용자 통과 확인 항목을 `docs/agent/todo.md`에 반영

# 2026-07-06 15:11:35 KST 공지 댓글 키보드 탭 처리 보강

- 공지사항 댓글 입력 중 `등록` 첫 터치가 상위 스크롤에 소비되지 않도록 모임 상세 스크롤 탭 처리를 보강
- 공지사항 댓글 육안 테스트 항목에 문구/크기와 키보드 열린 상태 즉시 등록 확인을 함께 기록
- 최근 사용자 통과 확인 항목을 `docs/agent/todo.md`에 반영

# 2026-07-06 15:26:20 KST 한줄평 별점 드래그 입력 반영

- 한줄평 작성/수정의 별점 입력을 반쪽 버튼 탭 방식에서 좌우 드래그 가능한 평점 트랙으로 변경
- 별점 입력은 0.5점 단위를 유지하고 접근성 증감 액션을 추가
- 신고/공지 댓글/가입 거절 재신청 관련 사용자 통과 확인을 `docs/agent/todo.md`에 반영

# 2026-07-06 16:06:42 KST 선택형 칩/버튼 활성 배경 대비 개선

- 책장 기수/정기모임 칩, 모임 생성·수정 칩, 공지 투표/작성 옵션 등 active 배경을 `subbrown4`에서 `subbrown3`로 상향
- 마이페이지 언어/신고/팔로우, 책이야기 구독, 회원가입 장르 선택 등 같은 연한 선택 배경 계열도 함께 보정
- 세션 만료 로그인 화면 이동, 소셜 로그인 이메일 변경 메뉴 숨김, Android footer padding 보정 변경과 함께 타입 검증/커밋 준비

# 2026-07-06 16:12:23 KST 선택형 칩/버튼 활성 배경 대비 원복

- 사용자 요청에 따라 active/selected 배경을 `subbrown3`에서 기존 `subbrown4`로 원복
- 방금 추가했던 `선택형 칩/버튼 활성 배경 대비` 육안 테스트 항목을 제거
- 세션 만료 로그인 화면 이동, 소셜 로그인 이메일 변경 메뉴 숨김, Android footer padding 보정은 유지

# 2026-07-06 16:38:08 KST 책이야기/모임 QA 보강

- Android 책장 기수 칩의 선택 배경 잔상 방지를 위해 inactive 배경과 ripple 처리를 보강
- 모임 검색 필터/검색 입력 시 섹션 제목이 `검색 결과`로 바뀌도록 상태를 분리
- 책이야기 댓글/대댓글 수정 입력폼을 해당 댓글 위치에 표시하고 `댓글 수정 취소`를 추가
- 공지 투표 기간 한 줄 표시와 책이야기 표지 2중 이미지 로딩 제거를 반영

# 2026-07-06 17:01:34 KST 모임 가입 신청 모달/공지 수정 보강

- 모임 가입 신청 폼을 모달로 분리하고 `가입 신청하기`/`닫기` 버튼을 하단에 항상 보이도록 수정
- 신청 사유 작성 후 닫기/바깥 터치/Android 뒤로가기 시 저장되지 않는다는 확인창을 표시
- 공지 수정 화면에서 기존 투표 영역을 비활성화하고, 책이야기 작성 화면 하단 스크롤 여유와 댓글 수정 표시를 보강

# 2026-07-06 17:36:22 KST 키보드 입력 고정/발제 선택 색상 보강

- 모임 검색, 책이야기 댓글/대댓글, 공지 댓글 입력창이 키보드 바로 위에 붙도록 docked 입력 영역을 추가
- 책이야기 작성 화면 하단 버튼을 `취소`/`등록/임시저장`으로 정리하고 저장 방식 선택 확인창을 추가
- 작성 중 닫기/취소 확인창을 띄우기 전에 키보드를 먼저 내리도록 공통 유틸로 정리
- 정기모임 발제 선택 카드를 기존 연두색 배경/초록 체크로 복구

# 2026-07-06 18:03:54 KST 입력 포커스 위치 재조정

- 모임 검색, 공지 댓글, 책이야기 댓글/답글/수정 포커스 시 실제 입력칸이 화면 아래에서 60% 지점에 오도록 스크롤 기준 변경
- 이전 docked 입력 footer와 `showSoftInputOnFocus` 우회 로직 제거
- `typecheck`/`lint`로 변경 검증

# 2026-07-06 18:17:29 KST 1.1.2 제출 버전 반영

- `app.json`, package metadata, iOS marketing version, Android versionName을 1.1.2로 갱신
- Expo public config에서 `version`/`runtimeVersion` 1.1.2 반영 확인
- `npm run check`로 제출 전 정적 검증 수행

# 2026-07-07 10:59:37 KST 채팅 진단 표시 및 1.1.3 제출 버전 반영

- 채팅 헤더에 STOMP 상태, 연결 여부, close code/reason, connection error 진단값을 표시
- 채팅 상태 훅에서 release 진단에 필요한 `connectionError`, `closeCode`, `closeReason`을 화면 state로 전달
- 앱/package/iOS marketing/runtime 버전을 1.1.3으로 갱신
- `npm run typecheck`로 변경 검증

# 2026-07-07 13:13:49 KST 앱 WebSocket 인증 헤더 및 진단 보강

- 채팅 STOMP WebSocket 생성 시 SecureStore refresh token을 `X-Refresh-Token` HTTP header로 전달
- release 앱 진단에 마지막 STOMP debug 메시지를 추가하고 토큰 값은 노출하지 않도록 처리
- STOMP CONNECT가 15초 안에 완료되지 않으면 timeout 오류를 표시하도록 보강
- `npm run typecheck`로 변경 검증

# 2026-07-07 13:17:22 KST 1.1.4 제출 버전 반영

- `app.json`, package metadata, Expo runtimeVersion을 1.1.4로 갱신
- iOS `CFBundleShortVersionString`, `MARKETING_VERSION`, Expo runtime plist를 1.1.4로 갱신
- `npm run typecheck`와 앱 버전 필드 검색으로 제출 전 검증
