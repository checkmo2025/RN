# UI 접근성/이벤트 네이밍 통일 가이드 (10번 항목)

> 기준 문서: `docs/ui-consistency-top10.md`의 10번 항목  
> 범위: RN `src/**/*.tsx`, `src/**/*.ts`

## 1) 점검 목적
- 스크린리더/키보드 사용자 관점에서 기본 접근성을 확보한다.
- 이벤트 핸들러/분석 이벤트 네이밍 규칙을 정해 유지보수성을 높인다.

## 2) 현재 현황 요약 (RN 기준)
- 접근성 속성 사용 총합: 7건
  - `accessibilityLabel`: 4
  - `accessibilityRole`: 2
  - `accessible`: 1
  - `accessibilityHint/state`: 0
- `testID`: 0건
- `importantForAccessibility`: 0건
- `accessibilityLiveRegion`: 0건
- `handle*` 형식 이벤트 핸들러 선언: 164건
- 분석 이벤트 라이브러리/`logEvent`/`track` 호출: 확인되지 않음

## 3) 통일 정책 (초안)

### A. 접근성 최소 기준
- 버튼/아이콘 버튼: `accessibilityRole="button"` + 명확한 `accessibilityLabel`
- 상태 전환 컨트롤: `accessibilityState` 제공
- 맥락이 필요한 조작: `accessibilityHint` 제공

### B. 테스트 식별자
- 핵심 플로우 버튼/입력에 `testID` 부여
- 화면별 네이밍 규칙: `screen-section-action`

### C. 이벤트 핸들러 네이밍
- 핸들러는 `handle + 목적 + 동사` 패턴 유지
- 파일 내 이벤트 이름 일관성(`handleOpen*`, `handleClose*`, `handleSubmit*`) 유지

### D. 분석 이벤트 네이밍
- 추후 분석 도입 시 이벤트명 규칙 선행 정의
  - 예: `screen_action_result` (`meeting_submit_success`)
- UI 문구와 이벤트명은 분리해 키 기반 관리

## 4) 1차 정리 대상
- `IconButton`/헤더 액션/플로팅 버튼 등 접근성 라벨 누락 구간 보강
- 모달 열림 상태 요소에 role/state/hint 보강
- 주요 E2E 경로에 `testID` 시범 도입

## 5) 2차 정리 대상
- 접근성 체크리스트를 PR 템플릿에 포함
- 이벤트명 사전(JSON/TS) 문서화 및 추후 analytics 연동 준비
- 스크린리더 동선 검증 절차 추가

## 6) 완료 조건
- 핵심 인터랙션 요소에 접근성 속성이 기본 탑재됨
- 이벤트 핸들러/이벤트명 규칙이 문서와 코드에서 일치함
