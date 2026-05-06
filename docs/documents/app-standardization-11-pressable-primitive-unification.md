# 표준화 11: Pressable 프리미티브 통일

## 범위
- 기존 추가 제안 3번

## 문제 요약
터치 인터랙션 컴포넌트가 `FeedbackPressable`과 raw `Pressable`로 혼재되어 있습니다. 피드백 강도/접근성/일관된 터치 경험이 화면마다 달라질 수 있습니다.

## 코드 근거
- raw `Pressable` 직접 import
  - `src/components/feature/groups/MeetingListCard.tsx:2`
  - `src/components/feature/groups/MyGroupsDropdownCard.tsx:6`
  - `src/screens/HomeScreen.tsx:4`
- 공용 프리미티브 사용 경로도 공존
  - `src/components/common/AppHeader.tsx:28`
  - `src/screens/MeetingScreen.tsx:46`

## 업계 표준 대비 차이
표준은 터치 프리미티브를 한 계층으로 묶고(pressed opacity, 접근성 role/label, disable feedback 룰), raw primitive는 레이아웃 용도로만 제한합니다.

## 리스크
- pressed 피드백 체감 불균등
- 접근성 속성 누락 가능성 증가
- 스타일 회귀 시 화면별 상이 동작

## 개선 가이드
### 단기
- feature 컴포넌트에서 raw `Pressable` 우선 치환
- 공용 프리미티브에서 접근성 기본값 보강

### 중기
- `IconButton`, `PrimaryButton`, `FeedbackPressable` 역할 경계 명확화
- 터치 컴포넌트 선택 기준 문서화

## DoD
- feature 레이어의 raw `Pressable` 사용 최소화
- 터치 피드백/접근성 기본 규칙 단일화
