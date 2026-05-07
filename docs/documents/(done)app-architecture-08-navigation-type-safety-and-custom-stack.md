# 앱 아키텍처 이슈 08: 네비게이션 타입 안정성 약화 + 커스텀 스택 유지 부담

## 범위
- 본 문서는 이전 진단의 8번 항목만 다룹니다.

## 문제 요약
전반적으로 `ParamListBase` 사용 비율이 높아 라우트 파라미터 타입 안전성이 낮고, 별도 커스텀 스택 구현을 유지하고 있습니다.

## 현재 코드 근거
- `MeetingScreen`에서 `ParamListBase` 기반 네비게이션 타입 사용
  - `src/screens/MeetingScreen.tsx:439`
- 공통 네비게이션 헬퍼도 `ParamListBase` 기반
  - `src/navigation/navigateToHome.ts:3`
- 커스텀 스택 구현
  - `src/navigation/SimpleStackNavigator.tsx:13`
  - `src/navigation/SimpleStackNavigator.tsx:79`

## 업계 표준 대비 차이
표준은 route param list를 명시적으로 선언하고, 스택 동작은 라이브러리 기본 구현을 최대한 활용합니다.

현재 구조는 “유연성”은 있지만, 타입 보호와 유지보수성에서 비용이 커집니다.

## 리스크
- 잘못된 route params 전달이 런타임까지 지연
- 네비게이션 구조 변경 시 전역 회귀 가능성 증가
- 커스텀 제스처/스택 동작 유지 부담

## 개선 가이드
### 단기
- 루트/탭/상세 스택별 ParamList 정의
- `useNavigation`/`useRoute`에 구체 타입 적용

### 중기
- 커스텀 스택 유지 목적 재평가
- 가능한 경우 공식 stack/native-stack으로 회귀
- 필요한 제스처만 extension 형태로 분리

## 완료 조건
- 핵심 화면의 `ParamListBase` 의존 제거
- 잘못된 param 전달이 컴파일 단계에서 검출
- 커스텀 스택 유지 범위 최소화
