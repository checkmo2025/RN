# 햄버거/3점 메뉴 분류 정리

기준: `src` 정적 스캔 후, 메뉴 버튼 클릭 시 실제 렌더 타입(커스텀 팝오버 / 폰 기본 Alert / 앱 커스텀 바텀시트)으로 분류.

## 1) 우리 코드 팝오버(앵커형)

- `책이야기 상세 > 글 3점 메뉴`
  - `src/screens/StoryScreen.tsx:887`
  - `src/screens/StoryScreen.tsx:1664`
  - `src/screens/StoryScreen.tsx:1924`
- `책이야기 상세 > 댓글 3점 메뉴`
  - `src/screens/StoryScreen.tsx:989`
  - `src/screens/StoryScreen.tsx:1798`
  - `src/screens/StoryScreen.tsx:1853`
- `마이페이지 > 내 모임 > 3점 메뉴`
  - `src/screens/MyPageScreen.tsx:1555`
  - `src/screens/MyPageScreen.tsx:2684`

## 2) 폰 기본 모달(Alert.alert)

- `정기모임 상세 > 공지 댓글 3점 메뉴`
  - `src/screens/MeetingScreen.tsx:6642`
  - `src/screens/MeetingScreen.tsx:9312`
- `정기모임 상세 > 책장 발제/한줄평 3점 메뉴`
  - `src/screens/MeetingScreen.tsx:7210`
  - `src/screens/MeetingScreen.tsx:9663`
  - `src/screens/MeetingScreen.tsx:9721`

## 3) 앱 커스텀 모달(바텀시트형)

- `정기모임 상세 > 공지 상세 3점 메뉴`
  - `src/screens/MeetingScreen.tsx:9051`
  - `src/screens/MeetingScreen.tsx:11922`
- `정기모임 상세 > 모임 관리하기`
  - `src/screens/MeetingScreen.tsx:8902`
  - `src/screens/MeetingScreen.tsx:10424`
  - `src/screens/MeetingScreen.tsx:11427`

## 참고(현재 미연결)

- `다른사람 프로필`의 3점 아이콘은 현재 `onPress` 연결이 없어 메뉴가 열리지 않음
  - `src/screens/UserProfileScreen.tsx:659`
