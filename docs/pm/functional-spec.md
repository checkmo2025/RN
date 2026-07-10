# checkmo_rn 기능명세서 (코드 기준)

- 작성일: 2026-04-25
- 갱신일: 2026-07-08 (소셜 로그인/약관/프로필 완성/세션 선제 갱신/푸시·딥링크·버전 게이트 반영)
- 기준 코드: `App.tsx`, `src/screens/*`, `src/components/common/*`, `src/services/api/*`, `src/services/auth/*`, `src/services/push/*`, `src/services/deepLinking.ts`, BE `develop`
- 목적: 현재 앱에 구현된 기능의 동작/권한/API 연동 범위를 정리

## 1) 공통 정책

### 1.1 로그인 게이트

- 공통 인증 게이트: `AuthGateContext.requireAuth()`
- 인증 상태: `loggedOut` / `profileIncomplete` / `loggedIn`
- 비로그인 시 동작: 인증 플로우(`AuthFlowScreen`)를 오버레이로 표시
- 로그인 완료 시: 로그인 전 요청한 콜백 액션 재실행(pending action)
- 프로필 미완성 세션(`AUTH_403` 또는 소셜 로그인 응답 `profileCompleted=false`)은 `profileCompletion` 모드로 인증 플로우를 열고 닫기 동작을 막음
- 세션 초기화/만료(`AUTH_405`, `AUTH_412`, 복구 불가 401)는 저장 refresh token과 푸시 등록 캐시를 정리하고 로그인 화면을 다시 표시

### 1.2 홈 권한 정책 (`homeAccessPolicy`)

| 접근자 | 소식 조회 | 추천 사용자 | 구독/좋아요 액션 | 책이야기 조회 | 앱 내 소식 관리 |
|---|---|---|---|---|---|
| `GUEST` | 가능 | 비활성 | 로그인 유도 | 가능 | 불가 |
| `MEMBER` | 가능 | 가능 | 가능 | 가능 | 불가 |
| `ADMIN_WEB` | 가능 | 가능 | 가능 | 가능 | 불가(앱) |

### 1.3 공통 UX

- 앱 부팅 중 `AuthGate.isReady`가 될 때까지 책 넘김 로딩 화면 표시
- 로그인 필요 액션은 1초 인증 전환 로딩(`AUTH_TRANSITION_MS`) 후 인증 오버레이 표시
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

### 1.5 앱 버전 게이트 (`APP-UPDATE-01`)

- 앱 시작 시 `useAppVersionGate`가 `GET /api/v1/app/version?platform=ios|android` 조회
- 현재 버전: `app.json`의 `expo.version`
- `minSupportedVersion` 미만이면 강제 업데이트 모달(닫기 불가), `latestVersion` 미만이면 권장 업데이트 모달(나중에 가능)
- 업데이트 버튼은 BE 응답 `storeUrl`을 `Linking.openURL`로 열며, 정책 조회 실패 시 앱 진입은 막지 않음

### 1.6 딥링크/유니버설 링크 (`DEEPLINK-01`)

- 지원 링크: 앱 스킴 `checkmo://...`, 웹 링크 `https://checkmo.co.kr/...`, `https://www.checkmo.co.kr/...`
- 라우팅:
  - `stories/{id}`, `book-stories/{id}` -> `Story openStoryId` (`focus=comments` 지원)
  - `groups/{clubId}`, `clubs/{clubId}` -> `Meeting openClubId`
  - `groups|clubs/{clubId}/meetings/{meetingId}` -> `Meeting openClubId/openMeetingId`
  - `groups|clubs/{clubId}/notice(s)/{noticeId}` -> `Meeting openClubId/openNoticeId`
  - `news/{newsId}` -> `News openNewsId`
  - `profile|members/{nickname}` -> `UserProfile`
  - `profile/me`, `members/me`, `profile/mypage` -> `My`
- 네비게이션 준비 전 받은 링크는 pending target으로 보관했다가 준비 후 이동

### 1.7 푸시 알림 (`PUSH-01`)

- `PushNotificationCoordinator`가 앱 루트에서 Expo notification handler를 설정
- 로그인 완료 후 실제 iOS/Android 기기에서 알림 권한, EAS projectId, Expo push token을 확인해 `PUT /notifications/push-devices`로 기기 등록
- 앱 active 복귀/Expo push token 변경 시 등록 정보를 재동기화
- 로그아웃/비밀번호 변경/회원 탈퇴 시 `DELETE /notifications/push-devices/{installationId}` 후 로컬 푸시 등록 캐시 정리
- 푸시 탭:
  - 로그인 상태면 payload를 `NotificationItem`으로 파싱해 `Story`/`Meeting`/`My`/`UserProfile`로 이동하고 읽음 처리
  - 비로그인 상태면 로그인 유도 후 `My` 탭의 알림 화면으로 이동

## 2) 인증/계정

### 2.1 이메일/닉네임 로그인 (`AUTH-01`)

- 입력: 아이디(이메일/닉네임), 비밀번호
- 검증: 공백 체크
- 처리: `loginByIdentifier`
- 결과: 성공 시 인증 완료 처리(`completeAuthFlow`), 실패 시 오류 토스트
- 프로필 미완성 오류(`AUTH_403`)는 프로필 완성 플로우로 전환

### 2.2 소셜 로그인 (`AUTH-02`)

- 로그인 화면 노출:
  - iOS + Apple 인증 가능 기기: Apple 아이콘
  - 공통: Kakao / Google / Naver 아이콘
- Kakao/Google/Naver:
  - `WebBrowser.openAuthSessionAsync`로 `${API_ORIGIN}/oauth2/authorization/{provider}?client=app` 오픈
  - BE 성공 콜백은 `checkmo://oauth-callback?code=...`
  - RN은 일회용 `code`를 `POST /auth/app/oauth/exchange`로 교환해 refresh token을 SecureStore에 저장
  - 응답 `profileCompleted=false`이면 프로필 완성 플로우로 전환
- Apple:
  - `expo-apple-authentication` native Sign in with Apple 사용(iOS only)
  - nonce 생성/해시 후 Apple credential의 `identityToken`, `rawNonce`, 선택 `authorizationCode`를 `POST /auth/app/apple/login`으로 전송
  - 성공 시 이메일 로그인과 동일하게 refresh token 저장 + 세션 확인
- 취소(`cancel`/`dismiss`)는 무동작, 실패는 provider별 오류 토스트
- 주요 오류:
  - `AUTH_414`: 이미 다른 계정으로 가입된 이메일
  - `AUTH_415`: Apple 인증 정보 유효하지 않음
  - `AUTH_416`: OAuth 일회용 코드 만료

### 2.3 회원가입/프로필 완성 (`AUTH-03`)

- 단계:
  - 약관 동의
  - 이메일 인증번호 발송/검증
  - 비밀번호 설정(6~24자, 영문/특수문자 조건)
  - 기본 정보(닉네임 중복 확인, 이름, 전화번호, 소개)
  - 추가 정보(프로필 이미지/기본 프로필 이미지, 관심 카테고리)
  - 완료
- 주요 API:
  - 약관: `fetchActiveTerms`, `fetchMyTermsStatus`, `updateMyTermsAgreements`
  - `requestEmailVerification`, `confirmEmailVerification`
  - `checkNicknameDuplicate`
  - `signUpByEmail` -> `loginByIdentifier` -> `submitAdditionalInfo`
  - 이미지 업로드 시 `issueProfileImageUploadUrl` + presigned `PUT`
- 약관:
  - 일반 회원가입은 `GET /terms`로 활성 약관을 불러오고 필수 약관 동의가 필요
  - 프로필 완성 모드는 `GET /members/me/terms`로 현재 동의 상태를 불러온 뒤 `POST /members/me/terms` 저장
- 프로필 완성 모드:
  - 이메일 회원가입 중 계정 생성 후 추가 정보 저장이 실패했거나, 소셜 로그인 후 프로필이 미완성인 경우 진입
  - 약관 -> 기본 프로필 -> 추가 프로필 3단계로 진행
  - 닫기 버튼/취소 경로 없음
- 입력 정책:
  - 닉네임 최대 20자, 영어 소문자/숫자/허용 특수문자, 중복 확인 필수
  - 이름 최대 10자, 소개 최대 40자, 전화번호 `010-0000-0000` 형식
  - 관심 카테고리 최소 1개, 최대 6개 선택
- 완료 화면 CTA:
  - 모임 검색하기
  - 모임 생성하기
  - 모임 없이 이용하기

### 2.4 아이디/비밀번호 찾기 (`AUTH-04`)

- 아이디 찾기: `findEmailByNamePhone`
- 임시 비밀번호 발급: `sendTemporaryPassword`

### 2.5 세션 동기화/로그아웃 (`AUTH-05`)

- 앱 로그인: `POST /auth/app/login` — 응답 `refreshToken`을 SecureStore에 저장(`checkmo.refreshToken`)
- refresh token 저장 시 갱신 시각(`checkmo.refreshTokenUpdatedAt`)도 함께 저장
- 토큰 로테이션:
  - 앱 부팅 시 `silentRefreshSession` -> `fetchLoginStatusSilently`
  - 일반 API 요청 전 저장 refresh token이 1시간 이상 지난 경우 `ensureFreshAppSessionIfNeeded`로 선제 갱신
  - 앱이 foreground로 복귀했을 때도 필요 시 선제 갱신
  - 401 응답 시 `POST /auth/app/refresh`로 access token 자동 재발급 후 원 요청 1회 재시도
  - `auth/*`, `members/check-nickname`, `members/find-email`, `credentials: omit`, `retryOnUnauthorized: false` 요청은 자동 갱신 제외
- 갱신 실패/세션 무효:
  - refresh 실패가 401, `AUTH_405`, `AUTH_412`이면 로컬 refresh token 삭제
  - 복구 불가 401 또는 무효 세션은 인증 오버레이 재표시
- 로그아웃:
  - 현재 푸시 디바이스 등록 해제 시도
  - refresh token이 있으면 `POST /auth/app/logout`(`X-Refresh-Token` 헤더)
  - refresh token이 없으면 `POST /auth/logout`
  - 최종적으로 저장 refresh token/로컬 인증 상태 초기화

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
  - 모임명/소개(모임명 중복 확인 `checkClubNameDuplicate`)
  - 프로필 이미지/공개여부
  - 카테고리/지역/대상
  - 문의 링크(선택, 최대 4개)
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
  - 상단 고정 여부
  - 책장 연결
  - 투표(옵션 2~6개, 익명/실명, 중복 허용, 시작/종료 시간)
  - 사진(최대 5개, `issueImageUploadUrl('NOTICE')` + presigned `PUT`)
- 입력 제한: 제목 40자, 내용 1000자
- 투표가 이미 있는 공지를 수정할 때는 투표 입력 영역을 잠금 처리

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
  - 메시지 메뉴: 박스 클릭 시 내 메시지는 복사, 타인 메시지는 복사/`CHAT + messageId` 신고. 복사는 시스템 클립보드 사용
  - 작성자 메뉴: 프로필 모달에서 `MEMBER + 닉네임` 신고 및 타인 프로필 이동
- UI 기능:
  - 조 진입/참여자 펼침
  - 조 발제 완료 토글/정렬

### 4.11 조 편성 관리 (운영진) (`MTG-11`)

- 진입: REGULAR 탭의 "조 관리하기"
- 기능:
  - 멤버 드래그&드롭 배정
  - 드래그 중 상·하단 가장자리 자동 스크롤(거리 비례 가속, 콘텐츠 경계 제한)
  - 상단 빠른 조 칩과 스크롤 내부 조 카드 모두 드롭 지원 및 현재 드롭 대상 강조
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
  - 모임명을 변경하는 경우 `checkClubNameDuplicate` 중복 확인 필수
  - 문의 링크 최대 4개
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
- 입력 제한: 제목 100자, 본문 5000자

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
- 입력 제한: 댓글/대댓글 300자
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
  - 하단 `My` 탭 진입은 `requireAuth`로 차단
  - 화면 내부 폴백 프로필/목록 데이터는 남아 있으나 일반 탭 경로에서는 노출되지 않음

### 7.2 탭 기능 (`MY-02`)

- 내 책 이야기: 목록 -> `Story openStoryId`
- 내 서재: 좋아요 토글 `toggleBookLikeByIsbn`
- 내 모임: 그룹 진입 `Meeting openClubId`, 탈퇴 `leaveClub`
- 내 알림:
  - 목록 `fetchNotifications`를 cursor 기반으로 최대 100페이지까지 병합 로드(중복 notificationId 제거)
  - 알림 클릭 시 낙관적 읽음 처리 후 `markNotificationAsRead`, 실패 시 unread 롤백
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
- 이메일 변경 인증: `requestEmailVerification(type='UPDATE_EMAIL')`, `confirmEmailVerification`
- 비밀번호 변경: `updateMyPassword` 성공 후 푸시 디바이스 해제 + 로컬 세션 초기화 + 재로그인 유도
- 탈퇴: `withdrawMember` 성공 후 푸시 디바이스 해제/캐시 삭제 + 로컬 세션 초기화
- 로그아웃: `logoutSession` + 로컬 게이트 로그아웃

### 7.5 설정 > 서비스/기타 (`MY-05`)

- 내 소식 관리: `fetchMyNewsList`
- 신고 관리: `fetchMyReports`
- 차단 관리: `fetchBlockedMembers` 목록 + `unblockMember(nickname)` 해제 (최신순, 무한스크롤). 상세는 `../archive/(done)block-feature-spec.md` 참고
- 알림 관리:
  - 기기 푸시 수신 토글: `setPushNotificationsEnabledAsync`
  - 알림 종류별 설정 조회: `fetchNotificationSettings`
  - 종류별 토글: `toggleNotificationSetting`
  - 종류: 책 이야기 좋아요, 책 이야기 댓글, 구독자, 독서 모임 가입, 모임 일정, 공지사항
  - 권한 거부/실기기 아님/projectId 없음/지원 플랫폼 아님은 토스트로 안내하고 토글 롤백
- 고객센터/문의하기: `SUPPORT_FORM_URL`
- 이용약관/버전정보: 앱 내 정적 표시
- 버전 정보 텍스트: `settings.versionUpdatedAt` 번역 문자열에 하드코딩(`2026.06.14`)

## 8) UserProfile (다른사람 프로필)

### 8.1 프로필 조회 (`UP-01`)

- 기본 프로필: `fetchMemberProfile`
- 작성 책이야기: `fetchMemberBookStories`
- 공개 서재: `fetchAllMemberLikedBooks`
- 공개 모임: `fetchMemberClubs`

### 8.2 팔로우/신고/차단 (`UP-02`)

- 구독 토글: `setFollowingMember`
- 신고: `createReport`(작성자 MEMBER 기준, 1.4 참고)
- 차단: `blockMember(nickname)` — 확인 모달 후 처리, 성공 시 이전 화면 복귀. 상세 정책은 `../archive/(done)block-feature-spec.md` 참고

### 8.3 팔로우 페이지 (`UP-03`)

- 구독자/구독중 목록: `fetchMemberFollowers`, `fetchMemberFollowings`
- 리스트 내 구독 토글: `setFollowingMember`

## 9) 공통 헤더 기능

### 9.1 알림 프리뷰 (`HDR-01`)

- 조회: `fetchNotificationPreview(5)`
- 로그인 사용자만 조회, 실패 시 프리뷰 비움
- 클릭:
  - 읽음 처리 `markNotificationAsRead`
  - 라우팅 `resolveNotificationTarget` (`Story`/`Meeting`/`My`)
- "알림 전체보기"는 `My openMyTab='ALARM'`로 이동

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
- 소셜 로그인은 RN UI에 연결됨. Kakao/Google/Naver는 BE OAuth2 웹 플로우 + 앱 딥링크 일회용 코드 교환 방식, Apple은 iOS native Sign in with Apple + BE app login 방식.
- `checkmo://oauth-callback`은 소셜 로그인용 콜백 URL이며, 일반 딥링크 라우터(`parseCheckmoDeepLink`)의 콘텐츠 이동 대상은 아님.
- Apple 로그인은 iOS에서만 노출되며 `AppleAuthentication.isAvailableAsync()`가 false이면 버튼 미노출.
- 앱 버전 정책 조회와 푸시 디바이스 등록은 실패해도 핵심 앱 진입을 막지 않음. 강제 업데이트는 정책 조회 성공 후 버전 비교가 force일 때만 차단.
- 마이페이지 화면 내부에는 비로그인 폴백 데이터가 남아 있으나 하단 탭 진입 정책상 일반 사용자는 로그인 전 직접 볼 수 없음.
