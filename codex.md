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
