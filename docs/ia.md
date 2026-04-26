# checkmo_rn IA (Information Architecture)

- 작성일: 2026-04-25
- 기준: `App.tsx`, `src/navigation/*`, `src/screens/*`, `src/components/common/AppHeader.tsx`
- 범위: 현재 앱 코드에 구현된 화면/모달/라우팅 구조

## 1) 앱 레벨 구조

```text
App
├─ Boot Loading (BookFlipLoadingScreen, 1.5s)
├─ RootNavigator (SimpleStack)
│  ├─ Tabs (BottomTabs)
│  │  ├─ Home (HomeScreen)
│  │  ├─ Meeting (MeetingScreen)
│  │  ├─ Story (StoryScreen)
│  │  ├─ News (NewsScreen)
│  │  └─ My (MyPageScreen) [비로그인 시 탭 진입 차단]
│  └─ UserProfile (UserProfileScreen)
├─ Global Overlay: AuthFlowScreen (로그인/회원가입)
├─ Global Overlay: Auth Transition Loading
└─ Global Overlay: ToastHost
```

## 2) 공통 헤더 IA (`AppHeader`)

모든 `ScreenLayout` 화면은 공통 헤더를 사용합니다.

```text
Header
├─ Logo
│  └─ 홈 이동 (onPressLogo 우선, 없으면 navigateToHome)
├─ Notifications Icon
│  ├─ 비로그인: 로그인 유도
│  └─ 로그인: 알림 프리뷰 모달
│     └─ 알림 클릭 시 대상 화면 이동 (Story/Meeting/My)
└─ Search Icon
   ├─ 검색 드롭다운
   │  ├─ 검색 입력
   │  ├─ 오늘의 추천 책
   │  └─ 외부 링크(알라딘 랭킹)
   └─ 검색 전체 페이지
      ├─ 결과 목록
      └─ 도서 상세
         ├─ 도서 좋아요 토글
         ├─ 책이야기 쓰기(Story 작성으로 이동)
         └─ 해당 도서의 책이야기 목록
```

## 3) 하단 탭별 IA

### 3.1 Home (`책모 홈`)

```text
Home
├─ 소식 캐러셀
│  └─ 소식 상세(News openNewsId)
├─ 사용자 추천 (로그인 시 표시)
│  └─ 사용자 프로필(UserProfile) / 구독 토글
└─ 책이야기 피드
   ├─ 카드 클릭: Story 상세
   ├─ 댓글 클릭: Story 상세(댓글 포커스)
   ├─ 작성자 클릭: UserProfile 또는 My(본인)
   ├─ 좋아요 토글
   └─ 작성자 구독 토글
```

### 3.2 Meeting (`모임`)

```text
Meeting
├─ 루트 화면
│  ├─ + 모임 생성하기 (MeetingCreateFlow)
│  ├─ 내 모임 드롭다운 (로그인 시)
│  ├─ 모임 검색/필터
│  │  ├─ 입력 필터: 모임별/지역별
│  │  └─ 출력 필터: 전체/대학생/직장인/온라인/동아리/모임/대면
│  └─ 추천/검색 모임 카드
│     ├─ 방문(모임 홈)
│     └─ 가입 신청(사유 입력)
├─ 모임 생성 플로우 (4단계)
│  ├─ 1단계: 이름/소개/이름중복확인
│  ├─ 2단계: 프로필 이미지/공개여부
│  ├─ 3단계: 카테고리/지역/대상
│  └─ 4단계: 링크 입력(선택)
└─ 모임 홈 (`GroupHomeView`)
   ├─ 탭: 모임 홈
   ├─ 탭: 공지사항
   │  ├─ 공지 목록 + 페이지네이션
   │  └─ 공지 상세
   │     ├─ 책장 첨부
   │     ├─ 투표
   │     ├─ 사진 첨부
   │     └─ 댓글
   └─ 탭: 책장
      ├─ GRID: 기수별 책장 목록
      └─ DETAIL
         ├─ 발제
         ├─ 한줄평
         └─ 정기모임
            ├─ 조 목록/참여자
            ├─ 조 발제(완료 토글/정렬)
            └─ 조 채팅
```

#### Meeting 상세 오버레이/관리 레이어

```text
GroupHome Overlays
├─ 모임 관리 바텀시트(운영진)
│  ├─ 가입 신청 관리
│  ├─ 회원 관리
│  ├─ 모임 수정
│  ├─ 공지 작성
│  ├─ 책장 생성
│  └─ 모임 삭제
├─ 조 관리하기(드래그&드롭 배정)
├─ 공지 작성/수정
├─ 공지 책장 선택
├─ 공지 메뉴(수정/삭제/신고)
├─ 책장 생성용 책 검색
├─ 책장 날짜 선택 달력
├─ 문의하기(Contact 링크)
├─ 조 채팅 선택/채팅방
├─ 투표자 목록
└─ 신고 모달
```

### 3.3 Story (`책 이야기`)

```text
Story
├─ 피드
│  ├─ 필터 탭: 전체 / 구독중 / 내 모임별(CLUB-n)
│  ├─ 카드 클릭: 상세
│  ├─ 댓글 클릭: 상세(댓글 포커스)
│  ├─ 좋아요 / 구독 토글
│  └─ 사용자 추천 카드(중간 삽입)
├─ 글 작성/수정 화면
│  ├─ 책 선택(검색 모달)
│  ├─ 제목/본문
│  └─ 등록/수정
└─ 상세 화면
   ├─ 본문/좋아요/구독/공유
   ├─ 글 메뉴(수정/삭제/신고/공유)
   ├─ 댓글 입력
   ├─ 댓글 메뉴(대댓글/수정/삭제/신고)
   └─ 신고 모달
```

### 3.4 News (`소식`)

```text
News
├─ 목록 화면
│  ├─ 소식 캐러셀
│  ├─ 오늘의 추천 책
│  └─ 소식 리스트
├─ 상세 화면
│  ├─ 히어로/본문
│  └─ 원문 보기 링크
└─ FAB: 문의하기(SUPPORT_FORM_URL)
```

### 3.5 My (`마이페이지`)

```text
MyPage
├─ 메인
│  ├─ 프로필 요약
│  ├─ 액션: 책 이야기 쓰기 / 소식 문의하기
│  └─ 탭
│     ├─ 내 책 이야기
│     ├─ 내 서재
│     ├─ 내 모임
│     └─ 내 알림
├─ 팔로우 페이지
│  ├─ 구독자
│  └─ 구독중
└─ 설정 페이지
   ├─ 계정 관리
   │  ├─ 프로필 편집
   │  ├─ 이메일 변경
   │  ├─ 비밀번호 변경
   │  └─ 탈퇴/비활성화
   ├─ 서비스
   │  ├─ 내 소식 관리
   │  ├─ 신고 관리
   │  └─ 알림 관리
   └─ 기타
      ├─ 고객센터/문의하기
      ├─ 이용약관
      ├─ 버전 정보
      └─ 로그아웃
```

## 4) Stack 화면: UserProfile (`다른사람 프로필`)

```text
UserProfile
├─ 프로필 요약 + 구독/신고
├─ 탭
│  ├─ 책 이야기
│  ├─ 서재
│  └─ 모임
└─ 팔로우 페이지
   ├─ 구독자
   └─ 구독중
```

## 5) 인증 플로우 IA (`AuthFlowScreen`)

```text
AuthFlow
├─ 로그인
├─ 아이디 찾기
├─ 아이디 찾기 결과
├─ 비밀번호 재발급
├─ 회원가입
│  ├─ 약관 동의
│  ├─ 이메일 인증
│  ├─ 비밀번호 설정
│  ├─ 프로필 기본정보
│  ├─ 프로필 추가정보(이미지/색상/관심 카테고리)
│  └─ 가입 완료
└─ 완료 후 앱 복귀
```

## 6) 라우트 파라미터 맵

| 화면 | 파라미터 | 용도 |
|---|---|---|
| `Meeting` | `openClubId` | 특정 모임 홈 바로 열기 |
| `Story` | `openCompose`, `composeBook` | 글쓰기 화면 바로 열기(선택 도서 포함) |
| `Story` | `openStoryId`, `openStoryFocus` | 특정 글 상세/댓글 포커스 바로 열기 |
| `News` | `openNewsId` | 특정 소식 상세 바로 열기 |
| `My` | `openMyTab` | 알림 탭 강제 오픈(`ALARM`) |
| `My` | `openFollowTab` | 팔로우 페이지 강제 오픈(`FOLLOWER`/`FOLLOWING`) |
| `UserProfile` | `memberNickname` | 특정 사용자 프로필 열기 |
| `Header` | `openSearchBook` | 헤더 검색 상세(선택 도서) 바로 열기 |

