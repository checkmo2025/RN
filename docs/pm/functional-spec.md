# checkmo_rn 기능명세서 (코드 기준)

- 작성일: 2026-04-25
- 갱신일: 2026-06-22 (조별 채팅 재도입: REST 히스토리/STOMP 송수신/메시지 신고)
- 기준 코드: `src/screens/*`, `src/components/common/AppHeader.tsx`, `src/services/api/*`, BE `develop`
- 목적: 현재 앱에 구현된 기능의 동작/권한/API 연동 범위를 정리

## 1) 공통 정책

### 1.1 로그인 게이트

- 공통 인증 게이트: `AuthGateContext.requireAuth()`
- 비로그인 시 동작: 인증 플로우(`AuthFlowScreen`)를 오버레이로 표시
- 로그인 완료 시: 로그인 전 요청한 콜백 액션 재실행(pending action)

### 1.2 홈 권한 정책 (`homeAccessPolicy`)

| 접근자 | 소식 조회 | 추천 사용자 | 구독/좋아요 액션 | 책이야기 조회 | 앱 내 소식 관리 |
|---|---|---|---|---|---|
| `GUEST` | 가능 | 비활성 | 로그인 유도 | 가능 | 불가 |
| `MEMBER` | 가능 | 가능 | 가능 | 가능 | 불가 |
| `ADMIN_WEB` | 가능 | 가능 | 가능 | 가능 | 불가(앱) |

### 1.3 공통 UX

- 주요 액션 후 Toast 피드백 제공
- 일부 토글 액션은 낙관적 업데이트 후 실패 시 롤백
- 스크롤 화면 대부분 Pull-to-refresh 지원
- 여러 상세 화면에서 스와이프 백 제스처 제공(Story/News/UserProfile)

### 1.4 신고 공통 정책 (`REPORT-01`)

- 공통 함수: `createReport({ targetType, targetId, reason, content? })` (`memberApi.ts`)
  - 구버전 `reportMember`는 폐기되어 코드에 없음
- API: `POST /api/v1/reports`, 내 신고 목록: `GET /api/v1/reports/me`
- `targetType`: `MEMBER`(targetId=닉네임) / `CLUB` / `BOOK_STORY` / `BOOK_STORY_COMMENT` / `CLUB_NOTICE` / `CLUB_NOTICE_COMMENT` / `CLUB_TOPIC` / `CLUB_BOOK_REVIEW` / `CHAT` (나머지 targetId=문자열화한 ID)
- `reason`: `GENERAL`(일반) / `INSULT`(욕설·비방) / `INAPPROPRIATE_CONTENT`(음란·부적절) / `SPAM`(홍보·도배)
- `content`: 선택, 최대 500자
- 현재 RN 신고 진입점은 모두 **대상 작성자(MEMBER) 신고**로 호출(닉네임 기반). BE는 글/공지/댓글 단위(`BOOK_STORY`, `CLUB_NOTICE` 등) 신고도 지원하나 RN UI는 아직 작성자 신고만 연결.

## 2) 인증/계정

### 2.1 로그인 (`AUTH-01`)

- 입력: 아이디(이메일/닉네임), 비밀번호
- 검증: 공백 체크
- 처리: `loginByIdentifier`
- 결과: 성공 시 인증 완료 처리(`completeAuthFlow`), 실패 시 오류 토스트

### 2.2 회원가입 (`AUTH-02`)

- 단계:
  - 약관 동의
  - 이메일 인증번호 발송/검증
  - 비밀번호 설정(6~12자, 영문/특수문자 조건)
  - 기본 정보(닉네임 중복 확인, 이름, 전화번호, 소개)
  - 추가 정보(프로필 이미지/기본 색상, 관심 카테고리)
  - 완료
- 주요 API:
  - `requestEmailVerification`, `confirmEmailVerification`
  - `checkNicknameDuplicate`
  - `signUpByEmail` -> `loginByIdentifier` -> `submitAdditionalInfo`
  - 이미지 업로드 시 `issueProfileImageUploadUrl` + presigned `PUT`

### 2.3 아이디/비밀번호 찾기 (`AUTH-03`)

- 아이디 찾기: `findEmailByNamePhone`
- 임시 비밀번호 발급: `sendTemporaryPassword`

### 2.4 세션 동기화/로그아웃 (`AUTH-04`)

- 앱 로그인: `POST /auth/app/login` — 응답의 `refreshToken`을 로컬에 저장
- 토큰 로테이션: 401 응답 시 `POST /auth/app/refresh`로 access token 자동 재발급(`http.ts`), 갱신 실패 시 로컬 토큰 폐기
- 앱 부팅 후 로그인 상태 확인: `fetchLoginStatusSilently`
- 로그아웃: `POST /auth/app/logout` + 저장된 refresh token/로컬 인증 상태 초기화

## 3) Home (책모 홈)

### 3.1 소식 캐러셀 (`HOME-01`)

- 로드: `fetchNewsCarousel(5)`, 실패 시 폴백 카드
- 클릭: `News` 탭으로 이동(`openNewsId` 파라미터 가능)

### 3.2 사용자 추천 (`HOME-02`)

- 로그인 사용자만 노출
- 로드: `fetchRecommendedMembers` (+ 각 사용자 `fetchMemberProfile`로 구독 상태 보강)
- 구독 토글: `setFollowingMember`

### 3.3 책이야기 피드 (`HOME-03`)

- 로드:
  - 비로그인 첫 로드: `fetchGuestAllBookStories`
  - 그 외: `fetchBookStories('ALL', cursor)`
- 무한 스크롤: 커서 기반 `hasNext/nextCursor`
- 카드 액션:
  - 좋아요: `toggleBookStoryLike`
  - 작성자 구독: `setFollowingMember`
  - 상세 이동: `Story` (`openStoryId`)
  - 댓글 이동: `Story` (`openStoryId`, `openStoryFocus: 'comments'`)

## 4) Meeting (모임)

### 4.1 모임 탐색/검색 (`MTG-01`)

- 내 모임: 로그인 시 `fetchMyClubs`
- 추천/검색:
  - 기본: `fetchRecommendedClubs`
  - 검색/필터 적용 시: `searchClubs`
- 필터:
  - 입력 필터: `NAME`/`REGION`
  - 출력 필터: `ALL`, `STUDENT`, `WORKER`, `ONLINE`, `CLUB`, `MEETING`, `OFFLINE`

### 4.2 모임 가입 신청 (`MTG-02`)

- 조건: 로그인 필요
- 입력: 신청 사유
- 처리: `joinClub(clubId, joinMessage)`

### 4.3 모임 생성 플로우 (`MTG-03`)

- 4단계 입력:
  - 이름/소개(이름 중복 확인 `checkClubNameDuplicate`)
  - 프로필 이미지/공개여부
  - 카테고리/지역/대상
  - 외부 링크(선택)
- 생성: `createClub`
- 이미지 업로드: `pickAndUploadImage('CLUB')` -> `issueImageUploadUrl`

### 4.4 모임 홈 탭 (`MTG-04`)

- 로드: `fetchClubHome`
- 표시: 기본 정보, 공지 요약, 이번 모임 바로가기, 문의하기
- 이번 모임 바로가기:
  - `fetchClubNextMeetingRedirect`
  - 대응 책장 열기(`fetchClubBookshelfDetail` 포함)

### 4.5 공지사항 조회/상세 (`MTG-05`)

- 목록: `fetchClubNotices` (+ pinned/normal 병합)
- 최신 공지: `fetchClubLatestNotice`
- 상세: `fetchClubNoticeDetail`
- 댓글:
  - 조회/페이지네이션: `fetchClubNoticeComments`
  - 등록: `createClubNoticeComment`
  - 수정: `updateClubNoticeComment`
  - 삭제: `deleteClubNoticeComment`
- 신고: 공지 메뉴의 "신고하기"는 **공지 작성자(MEMBER) 신고**로 동작 — `createReport({ targetType: 'MEMBER', targetId: 작성자닉네임 })`. 댓글 신고도 동일하게 작성자 기준. (공지 글 자체 신고 `CLUB_NOTICE`는 BE 지원, RN 미연결 — `준비 중` 토스트도 현재 없음). 1.4 참고

### 4.6 공지 투표 (`MTG-06`)

- 옵션 선택: 단일/중복 규칙 반영
- 익명 투표일 때 투표자 목록 비공개
- 제출: `submitClubNoticeVote`
- 제출 후 상세 재조회로 결과 동기화

### 4.7 공지 작성/수정/삭제 (운영진) (`MTG-07`)

- 작성/수정: `createClubNotice`, `updateClubNotice`
- 삭제: `deleteClubNotice`
- 첨부:
  - 책장 연결
  - 투표(옵션, 익명/실명, 중복 허용, 시작/종료 시간)
  - 사진(최대 10개)

### 4.8 책장 조회 (`MTG-08`)

- 목록: `fetchClubBookshelves`
- 상세: `fetchClubBookshelfDetail`
- 기수(session) 필터로 GRID 표시
- 상세 탭:
  - 발제(TOPIC)
  - 한줄평(REVIEW)
  - 정기모임(REGULAR)

### 4.9 발제/한줄평 CRUD (`MTG-09`)

- 발제:
  - 조회: `fetchClubBookshelfTopics` (cursor 기반 추가 로드)
  - 생성/수정/삭제: `create/update/deleteClubBookshelfTopic`
- 한줄평:
  - 조회: `fetchClubBookshelfReviews`
  - 생성/수정/삭제: `create/update/deleteClubBookshelfReview`
- 작성 모달에서 발제/한줄평 공용 입력, 한줄평은 별점 입력 포함

### 4.10 정기모임/조 기능 (`MTG-10`)

- 정기모임 정보: `fetchClubMeeting`
- 조별 참여자: `fetchClubMeetingMembers`
- 조별 발제: `fetchClubMeetingTeamTopics`
- 조별 채팅: 조 상세의 FAB → 권한별 조 선택 → 전체 화면 채팅방. 일반 회원은 소속 조만, 운영진·개설자는 모든 조를 선택할 수 있음.
  - 히스토리: `fetchClubMeetingTeamChatMessages`로 최근 30개 조회 후 상단 스크롤 시 커서 기반 추가 로드
  - 실시간: `useMeetingChatStomp`로 `/sub/.../chat/messages` 구독, `/pub/.../chat/message` 발행
  - 안전 기능: 타인 메시지 박스는 `CHAT + messageId` 신고, 작성자 프로필 모달은 `MEMBER + 닉네임` 신고 및 타인 프로필 이동
- UI 기능:
  - 조 진입/참여자 펼침
  - 조 발제 완료 토글/정렬

### 4.11 조 편성 관리 (운영진) (`MTG-11`)

- 진입: REGULAR 탭의 "조 관리하기"
- 기능:
  - 멤버 드래그&드롭 배정
  - 조 추가/삭제(최대 10조, 최소 1조)
  - 미배정 그룹 이동
- 저장: `manageClubMeetingTeams`

### 4.12 운영진 관리 메뉴 (`MTG-12`)

- 가입 신청 관리:
  - 승인/거절: `updateClubMemberStatus(APPROVE/REJECT)`
- 회원 관리:
  - 역할 변경: `CHANGE_ROLE`, `TRANSFER_OWNER`
  - 회원 제외: `KICK`
- 모임 수정:
  - `updateClub` (+ 필요 시 `fetchClubDetail` 재조회)
- 책장 생성/수정/삭제:
  - `createClubBookshelf`, `updateClubBookshelf`, `deleteClubBookshelf`
- 모임 삭제:
  - `deleteClub`

## 5) Story (책 이야기)

### 5.1 피드 조회 (`STORY-01`)

- 탭:
  - `ALL`
  - `FOLLOWING` (로그인)
  - `CLUB-*` (내 모임별, 로그인)
- API:
  - 기본: `fetchBookStories`
  - 비로그인 최초 전체: `fetchGuestAllBookStories`
  - 모임별: `fetchClubBookStories`
- 추천 사용자 카드 삽입: 로그인 시 일정 간격으로 표시

### 5.2 글 작성/수정 (`STORY-02`)

- 작성:
  - 책 선택(검색 `searchBooks`)
  - 제목/본문 입력
  - 등록 `createBookStory`
- 수정:
  - 기존 글 불러와 편집
  - 수정 `updateBookStory`
- 삭제: `deleteBookStory`

### 5.3 상세/상호작용 (`STORY-03`)

- 상세 조회: `fetchBookStoryDetail`
- 좋아요: `toggleBookStoryLike` (낙관적 업데이트)
- 작성자 구독: `setFollowingMember`
- 공유: 시스템 공유 시트(`Share.share`, 글 웹 URL 전달)
- 신고: `createReport`(작성자 MEMBER 기준, 1.4 참고)

### 5.4 댓글/대댓글 (`STORY-04`)

- 댓글 작성: `createBookStoryComment`
- 댓글 수정: `updateBookStoryComment`
- 댓글 삭제: `deleteBookStoryComment`
- 대댓글: 부모 댓글 ID 지정해서 작성
- 실패 시 낙관적 렌더 롤백

### 5.5 라우트 연동 (`STORY-05`)

- `openCompose` + `composeBook`: 작성 화면 즉시 오픈
- `openStoryId`: 특정 글 상세 오픈
- `openStoryFocus='comments'`: 상세 진입 후 댓글 섹션 포커스

## 6) News (소식)

### 6.1 목록/캐러셀 (`NEWS-01`)

- 캐러셀: `fetchNewsCarousel`
- 목록: `fetchNewsList`
- 추천 책 카드: `fetchRecommendedBooks`

### 6.2 상세 (`NEWS-02`)

- 진입:
  - 목록/캐러셀 클릭
  - 라우트 파라미터 `openNewsId`
- 상세 API: `fetchNewsDetail`
- 원문 링크 열기 지원

### 6.3 문의 (`NEWS-03`)

- FAB 클릭 시 `SUPPORT_FORM_URL` 오픈

## 7) MyPage (마이페이지)

### 7.1 메인 데이터 로드 (`MY-01`)

- 로그인:
  - 프로필 `fetchMyProfile`
  - 팔로우 `fetchMyFollowCount`, `fetchMyFollowers`, `fetchMyFollowing`
  - 내 책이야기 `fetchMyBookStories`
  - 내 서재 `fetchAllMyLikedBooks`
  - 내 모임 `fetchMyClubs`
- 비로그인:
  - 폴백 프로필/목록 데이터 표시

### 7.2 탭 기능 (`MY-02`)

- 내 책 이야기: 목록 -> `Story openStoryId`
- 내 서재: 좋아요 토글 `toggleBookLikeByIsbn`
- 내 모임: 그룹 진입 `Meeting openClubId`, 탈퇴 `leaveClub`
- 내 알림:
  - 목록 `fetchNotifications`
  - 읽음 처리 `markNotificationAsRead`
  - 대상 화면 이동 `resolveNotificationTarget`

### 7.3 팔로우 페이지 (`MY-03`)

- 구독자/구독중 목록 조회
- 구독중 토글 `setFollowingMember`
- 구독자 삭제 `deleteFollowerMember`

### 7.4 설정 > 계정 (`MY-04`)

- 프로필 편집:
  - 소개/카테고리/프로필 이미지
  - `updateMyProfile`
  - 이미지 업로드 `issueProfileImageUploadUrl` + presigned `PUT`
- 이메일 변경: `updateMyEmail`
- 비밀번호 변경: `updateMyPassword`
- 탈퇴: `withdrawMember`
- 로그아웃: `logoutSession` + 로컬 게이트 로그아웃

### 7.5 설정 > 서비스/기타 (`MY-05`)

- 내 소식 관리: `fetchMyNewsList`
- 신고 관리: `fetchMyReports`
- 차단 관리: `fetchBlockedMembers` 목록 + `unblockMember(nickname)` 해제 (최신순, 무한스크롤). 상세는 `block-feature-spec.md` 참고
- 알림 관리:
  - 조회 `fetchNotificationSettings`
  - 토글 `toggleNotificationSetting`
- 고객센터/문의하기: `SUPPORT_FORM_URL`
- 이용약관/버전정보: 앱 내 정적 표시

## 8) UserProfile (다른사람 프로필)

### 8.1 프로필 조회 (`UP-01`)

- 기본 프로필: `fetchMemberProfile`
- 작성 책이야기: `fetchMemberBookStories`
- 공개 서재: `fetchAllMemberLikedBooks`
- 공개 모임: `fetchMemberClubs`

### 8.2 팔로우/신고/차단 (`UP-02`)

- 구독 토글: `setFollowingMember`
- 신고: `createReport`(작성자 MEMBER 기준, 1.4 참고)
- 차단: `blockMember(nickname)` — 확인 모달 후 처리, 성공 시 이전 화면 복귀. 상세 정책은 `block-feature-spec.md` 참고

### 8.3 팔로우 페이지 (`UP-03`)

- 구독자/구독중 목록: `fetchMemberFollowers`, `fetchMemberFollowings`
- 리스트 내 구독 토글: `setFollowingMember`

## 9) 공통 헤더 기능

### 9.1 알림 프리뷰 (`HDR-01`)

- 조회: `fetchNotificationPreview(5)`
- 클릭:
  - 읽음 처리 `markNotificationAsRead`
  - 라우팅 `resolveNotificationTarget` (`Story`/`Meeting`/`My`)

### 9.2 책 검색 (`HDR-02`)

- 검색: `searchBooks`
- 도서 상세 보강: `fetchBookDetail`
- 해당 도서 책이야기: `fetchBookStoriesByBook`
- 도서 좋아요: `toggleBookLike` (`bookLikeApi`)
- 도서 기반 글쓰기 이동: `Story openCompose + composeBook`

## 10) 구현 제약/주의사항

- `My` 탭은 비로그인 사용자가 직접 진입할 수 없음(탭 클릭 시 로그인 유도).
- 신고 API는 대상별 `targetType`/`targetId`를 사용하며, 조별 채팅은 메시지 ID 기준 `CHAT` 신고를 연결함.
- 조별 채팅은 텍스트 송수신·히스토리·메시지 신고만 지원함. 첨부/수정/삭제/읽음/푸시 알림/채팅 내 직접 차단은 미지원.
- 소셜 로그인: **BE는 OAuth2(Google/Kakao/Naver) 구현됨** — Spring Security `oauth2Login` 웹 리다이렉트 방식(`/login/oauth2/code/{provider}`, 성공 시 `/api/v1/auth/redirect/oauth2`로 리다이렉트). **RN 앱에는 소셜 로그인 UI 미연결**(이메일/닉네임 로그인만). Apple은 BE provider에 없고 기획 문서(`docs/documents/apple-login-*`, `docs/documents/social-login-reintegration-plan.md`)만 존재.
- 마이페이지 버전 정보 텍스트는 하드코딩(`2026.06.14`).
- 일부 비로그인 상태 화면은 실제 API 대신 폴백 데이터 표시(마이페이지).
