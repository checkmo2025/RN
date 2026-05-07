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

- STD-18/19 문서 파일명 `done-` → `(done)` 접두사 형식으로 rename.
- `docs/agent/todo.md` 파일 경로 참조 2건 동기화.

## 작업 파일
- `docs/documents/(done)app-standardization-18-domain-label-dictionary-centralization.md`
- `docs/documents/(done)app-standardization-19-route-param-consume-reset-hook.md`
- `docs/agent/todo.md`
- `docs/agent/agent-log.md`
