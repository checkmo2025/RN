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
  - `src/components/feature/news/NewsPromotionCarousel.tsx`
- 기준 통일
  - 크기/레이아웃: 홈 화면 기준
  - 자동 이동 동작: 소식 화면 방식
- 자동 이동 주기 변경
  - 3초 -> 5초
- 소식 화면 캐러셀 배치/정렬 보정
  - 좌우 패딩 중복으로 어긋나던 레이아웃 수정
  - 스냅 오프셋 기반으로 슬라이드 정렬 안정화
