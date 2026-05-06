# 표준화 16: 네비게이션 파라미터 파싱 + 체인 탐색 헬퍼 통일

## 범위
- 기존 추가 제안 8번

## 문제 요약
`route.params`에서 `number|string`를 숫자로 파싱하는 로직과 navigation parent chain 탐색 로직이 여러 화면에서 반복됩니다.

## 코드 근거
- params 숫자 파싱 반복
  - `src/screens/MeetingScreen.tsx:629`
  - `src/screens/NewsScreen.tsx:391`
  - `src/screens/StoryScreen.tsx:1550`
- navigation chain 탐색 반복
  - `src/screens/UserProfileScreen.tsx:599`
  - `src/screens/NewsScreen.tsx:363`
- 유사 헬퍼 일부는 이미 존재
  - `src/navigation/navigateToHome.ts:5`

## 업계 표준 대비 차이
표준은 route param parser와 navigator finder를 공용 유틸로 분리해 화면 코드의 중복/실수 지점을 줄입니다.

## 리스크
- 파싱 누락/NaN 처리 편차
- 탭 전환 시점 race(setTimeout 기반 보정) 증가
- 동일 버그 다발 재현

## 개선 가이드
### 단기
- `parsePositiveIntParam(value)` 유틸 도입
- `findNavigatorByRouteName(navigation, routeName)` 유틸 도입

### 중기
- typed route param 전환 시 유틸 축소
- 임시 `setTimeout` 네비게이션 보정 제거 방향 정리

## DoD
- 숫자 파라미터 파싱 중복 제거
- 네비게이션 체인 탐색 코드 공통화
