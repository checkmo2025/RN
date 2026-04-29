# UI 로딩 피드백 통일 가이드 (2번 항목)

> 기준 문서: `docs/ui-consistency-top10.md`의 2번 항목  
> 범위: RN `App.tsx`, `src/**/*.ts(x)` 로딩 UI/상태 표현

## 1) 점검 목적
- 로딩 표현(풀스크린/인라인/버튼/당겨서 새로고침)을 한 세트 규칙으로 통일한다.
- 화면별 체감 편차(깜빡임, 무반응처럼 보임)를 줄인다.

## 2) 현재 현황 요약 (RN 기준)
- 전용 로더 컴포넌트: `BookFlipLoadingScreen` 1종
  - 실제 사용: 4곳 (`App.tsx` 2곳, `StoryScreen`, `MeetingScreen`)
- `RefreshControl` 사용: 10개 위치
  - `Home`, `News`, `Story`, `Meeting`, `MyPage`, `UserProfile` 등
- `ActivityIndicator` 직접 사용: 0건
- 전역 로딩에 고정 타이머 존재:
  - 앱 부팅: `1500ms` (`App.tsx`)
  - 인증 전환: `1200ms` (`src/contexts/AuthGateContext.tsx`)

참고: 상세 위치/문구 목록은 `docs/loading-screen.md`에 전수 정리됨.

## 3) 통일 정책 (초안)

### A. 로딩 레벨 정의
- `L1 Global Blocking`: 앱 부팅/인증 전환처럼 화면 전체 차단
  - UI: `BookFlipLoadingScreen`
  - 조건: 진입 불가 상태에서만 사용
- `L2 Screen Blocking`: 특정 화면 작업 중 전체 영역 차단
  - UI: 오버레이 또는 전체 대체 로더
  - 조건: 사용자 입력이 의미 없을 때만 사용
- `L3 Section Loading`: 리스트/카드 일부 영역만 로딩
  - UI: 인라인 텍스트 또는 섹션 스켈레톤
- `L4 Action Loading`: 버튼/토글/업로드 진행
  - UI: 버튼 비활성화 + 상태 문구 (`~ 중...`)
- `L5 Refresh`: 당겨서 새로고침
  - UI: `RefreshControl` (네이티브)

### B. 문구 규칙
- 로딩/동작 문구는 `docs/ui-copy-consistency.md` 1번 규칙을 따른다.
- 동작형 문구는 `동사 + 중...` 통일 (예: `저장 중...`, `업로드 중...`).

### C. 타이밍 규칙
- 고정 시간 로딩은 원칙적으로 금지한다.
- 로딩 종료는 실제 준비 완료 이벤트(데이터 응답, 상태 동기화) 기준으로 처리한다.
- 최소 표시 시간(깜빡임 방지)이 필요하면 화면 공통 상수로만 관리한다.

### D. 빈 피드백 금지
- 네트워크 작업/페이징/저장 동작에는 반드시 시각 피드백 1개 이상이 있어야 한다.
- `isLoading` 플래그만 있고 UI 피드백이 없는 상태를 금지한다.

## 4) 1차 정리 대상
- `App.tsx` 부팅 1500ms 고정 로더 정책 재검토
- `src/contexts/AuthGateContext.tsx` 1200ms 고정 로더 정책 재검토
- `docs/loading-screen.md`에 기록된 문구 혼재(`업로드중`/`업로드 중`)를 `ui-copy` 기준으로 치환
- 인라인 텍스트만 있는 중요 구간에 최소 공통 피드백 규칙 적용

## 5) 2차 정리 대상
- `BookFlipLoadingScreen` 사용 기준을 L1/L2로 제한하고 남용 방지
- 섹션 로딩 컴포넌트(텍스트/스켈레톤) 공용화 검토
- Pull-to-refresh 색/문구 정책을 플랫폼별로 고정

## 6) 완료 조건
- 로딩 레벨(L1~L5)이 화면별로 일관되게 적용됨
- 고정시간 로더가 정책적으로 허용된 경우만 남아있음
- 로딩 상태에 피드백 없는 케이스 0건
