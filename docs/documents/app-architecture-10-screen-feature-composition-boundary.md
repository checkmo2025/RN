# 앱 아키텍처 이슈 10: 대형 화면 파일의 기능 경계/합성 경계 재정의

## 범위
- 본 문서는 `MeetingScreen` 분해 이후에도 남아 있는 대형 화면 파일의 구조 표준화를 다룹니다.
- 대상: `MyPageScreen`, `StoryScreen`, `AuthFlowScreen` 중심.

## 문제 요약
`MeetingScreen`은 분해가 상당히 진행됐지만, 다른 핵심 화면은 여전히 화면/상태/비즈니스 흐름이 단일 파일에 과집중되어 있습니다.

## 현재 코드 근거
- 파일 규모 상위
  - `src/screens/MyPageScreen.tsx` (3567 lines)
  - `src/screens/StoryScreen.tsx` (3057 lines)
  - `src/screens/AuthFlowScreen.tsx` (1818 lines)
- 상태/핸들러 집중도
  - `MyPageScreen`: `useState` 43개, `useCallback` 36개
  - `StoryScreen`: `useState` 18개, `useCallback` 39개
  - `AuthFlowScreen`: `useState` 35개

## 업계 표준 대비 차이
표준 구조는 화면을 아래 단위로 분리합니다.
1. 화면 컨테이너: 라우팅/탭 전환/최소 조립
2. 도메인 훅: fetch + mutation + 상태 머신
3. 프레젠테이션 컴포넌트: UI 렌더링 전담

현재는 컨테이너가 도메인 훅/뷰 책임을 동시에 수행하는 비율이 높습니다.

## 리스크
- 회귀 범위 확대: 작은 수정도 대형 diff로 확장
- 리뷰 정확도 저하: 변경 의도 파악 비용 증가
- 테스트 도입 난이도 증가: 단위 경계 부재

## 개선 가이드
### 1차
- `MyPageScreen`을 탭/설정 섹션 단위로 분리
  - 예: `useMyNewsState`, `useProfileEditState`, `MySettingsView`
- `StoryScreen`을 피드/상세/작성 흐름 단위로 분리
  - 예: `useStoryFeedState`, `useStoryComposeState`
- `AuthFlowScreen`을 단계형 상태머신 훅 + 단계 뷰 컴포넌트로 분리

### 2차
- 각 화면은 `index(컨테이너)` + `hooks` + `views` + `types` 구조로 고정
- 사이드이펙트(setInterval, navigation param consume)는 훅 계층으로 이동

## 완료 조건(Definition of Done)
- 상위 3개 화면의 핵심 도메인 로직이 훅/서비스로 이동
- 화면 파일은 라우팅/뷰 조립 중심으로 축소
- 타입체크 통과 + 기존 UX 동작 동일성 확인
