# 표준화 19: 라우트 파라미터 소비/초기화 패턴 훅 통일

## 범위
- `openXxx` 형태의 one-shot 라우트 파라미터 소비 후 초기화 패턴을 공통화합니다.

## 문제 요약
`route.params`를 읽고 `navigation.setParams({ key: undefined })`로 지우는 코드가 여러 화면에 반복됩니다.

## 현재 코드 근거
- `openNewsId` 소비/초기화
  - `src/screens/NewsScreen.tsx:350`
  - `src/screens/NewsScreen.tsx:352`
- `openClubId` 소비/초기화
  - `src/screens/MeetingScreen.tsx:325`
  - `src/screens/MeetingScreen.tsx:328`
- `openCompose`, `openStoryId` 소비/초기화
  - `src/screens/StoryScreen.tsx:1493`
  - `src/screens/StoryScreen.tsx:1496`
  - `src/screens/StoryScreen.tsx:1500`
  - `src/screens/StoryScreen.tsx:1504`
- `openMyTab`, `openFollowTab` 소비/초기화
  - `src/screens/MyPageScreen.tsx:1842`
  - `src/screens/MyPageScreen.tsx:1849`
  - `src/screens/MyPageScreen.tsx:1853`
  - `src/screens/MyPageScreen.tsx:1861`
- `openSearchBook` 소비/초기화
  - `src/components/common/AppHeader.tsx:607`
  - `src/components/common/AppHeader.tsx:616`

## 업계 표준 대비 차이
표준은 one-shot deep link param을 공통 유틸/훅으로 처리해 중복과 누락을 줄입니다.

## 리스크
- 초기화 누락 시 중복 진입/무한 재열림
- 파라미터 타입 확장 시 화면별 수정 누락

## 개선 가이드
### 1차
- `useConsumeRouteParam` 훅 도입
  - 입력: `key`, `parser`, `onConsumed`
  - 동작: 유효값 파싱 -> 콜백 실행 -> `setParams({ key: undefined })`

### 2차
- `parsePositiveIntParam` 등 기존 파서와 결합
- 탭/루트 라우트 타입을 제네릭으로 연결해 타입 안정성 강화

## 완료 조건(Definition of Done)
- open-param 소비 로직이 공통 훅으로 통일
- 화면별 setParams 보일러플레이트 최소화
- 기존 딥링크/내부 이동 동작 회귀 없음
