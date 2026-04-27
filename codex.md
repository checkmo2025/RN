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
