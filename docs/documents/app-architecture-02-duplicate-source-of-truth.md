# 앱 아키텍처 이슈 02: 분리 리팩터링 중복 소스(SoT) 상태

## 범위
- 본 문서는 이전 진단의 2번 항목만 다룹니다.
- 1번(대형 단일 파일 분해)은 제외합니다.

## 문제 요약
`MeetingScreen`에서 일부 로직은 `src/screens/meeting/*`로 분리되었지만, 동일 역할의 타입/헬퍼가 `MeetingScreen.tsx` 내부에도 여전히 남아 있습니다. 현재는 “두 개의 진실 소스(Source of Truth)”가 공존하는 상태입니다.

## 현재 코드 근거
- `MeetingScreen`은 `formatters`, `mappers`만 import 중
  - `src/screens/MeetingScreen.tsx:155`
  - `src/screens/MeetingScreen.tsx:163`
- 동일 의미의 타입/헬퍼가 `MeetingScreen` 내부에 재정의됨
  - 타입 블록 시작: `src/screens/MeetingScreen.tsx:4319`
  - 예: `buildBookshelfCreateDraft`: `src/screens/MeetingScreen.tsx:4545`
  - 예: `buildNoticeDraft`: `src/screens/MeetingScreen.tsx:4610`
- 분리된 헬퍼 파일에도 동일 함수 존재
  - `src/screens/meeting/helpers.ts:98`
  - `src/screens/meeting/helpers.ts:109`
- 분리 훅 `useNoticeState`가 생성되었지만 아직 미연결
  - 정의만 존재: `src/screens/meeting/useNoticeState.ts:61`

## 업계 표준 대비 차이
표준적인 분리 리팩터링은 다음 2가지를 빠르게 달성합니다.
1. 단일 책임의 구현 단위를 새 모듈로 완전히 이관
2. 기존 정의를 제거해 SoT를 1개로 수렴

현재 구조는 “부분 이관 + 기존 정의 유지” 상태가 길어져, 리팩터링 이득이 상쇄되고 있습니다.

## 리스크
- 유지보수 리스크: 같은 의미의 수정이 파일 2곳에 누락될 수 있음
- 회귀 리스크: 신규 개발자가 어느 정의가 실제 사용되는지 오판 가능
- 테스트 리스크: 분리 모듈에 테스트를 추가해도 실사용 코드가 내부 정의면 효과 없음
- 코드리뷰 리스크: 변경 diff가 분산돼 리뷰 정확도 저하

## 개선 가이드
### 단기
- 동일 기능(타입/헬퍼)별로 “사용 중인 정의”를 1개로 선언
- `MeetingScreen` 내부 정의를 하나씩 삭제하면서 import 치환
- 치환 단위마다 타입체크로 즉시 검증

### 중기
- `GroupHomeView` 기준으로 도메인 섹션별 훅 분리
  - notice, bookshelf, team-management, chat
- 각 훅의 public API(입력/출력 state/action)만 화면에 노출

### 운영 규칙
- “분리 파일 추가 PR”은 같은 PR에서 “기존 중복 정의 제거”까지 완료
- 새 모듈 도입 시, 기존 정의와 이름 충돌이 있으면 즉시 rename 또는 제거

## 완료 조건(Definition of Done)
- `MeetingScreen.tsx` 내부에 중복 타입/헬퍼 정의 없음
- `src/screens/meeting/*`가 유일한 구현 소스
- 회귀 없이 typecheck 통과
