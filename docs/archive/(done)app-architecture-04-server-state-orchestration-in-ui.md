# 앱 아키텍처 이슈 04: 서버 상태 오케스트레이션이 UI 컴포넌트에 과도 집중

## 범위
- 본 문서는 이전 진단의 4번 항목만 다룹니다.

## 문제 요약
페이지네이션 루프, 중복 제거, 병렬 fetch, 권한 분기까지 서버 상태 관리 핵심 로직이 `MeetingScreen`/`GroupHomeView` 컴포넌트 내부에 직접 구현되어 있습니다.

## 현재 코드 근거
- 검색 페이지네이션 루프(최대 100회)
  - `src/screens/MeetingScreen.tsx:580`
- 검색 로딩/결과 상태 관리가 화면 내부에 결합
  - `src/screens/MeetingScreen.tsx:548`
- 워크스페이스 전체 재로딩(여러 API 병렬)
  - `src/screens/MeetingScreen.tsx:5490`
- 책장 전체 커서 순회
  - `src/screens/MeetingScreen.tsx:406`

## 업계 표준 대비 차이
일반적으로 서버 상태는 별도 계층(예: query hook/repository)에서 다루고, 화면은 아래만 담당합니다.
- 상태 표시
- 사용자 액션 핸들러
- 최소한의 파생 UI 계산

현재는 화면 코드가 서버 상태 엔진 역할까지 수행하고 있어 경계가 흐립니다.

## 리스크
- 재사용성 저하: 같은 데이터 로직을 다른 화면에서 재사용하기 어려움
- 결합도 증가: UI 변경이 네트워크 로직 회귀를 유발
- 테스트 복잡도 증가: 화면 테스트로 서버 상태 시나리오까지 커버해야 함
- 성능 리스크: 캐시/중복요청 제어 정책 일관성 부족

## 개선 가이드
### 단기
- `meeting` 전용 data hook 계층 도입
  - `useMeetingDiscover`, `useClubWorkspace`, `useBookshelfPagination` 등
- 커서 순회/중복 제거는 hook 내부로 이동

### 중기
- 서버 상태 캐시 정책 표준화
  - stale time, refetch trigger, cancelation policy
- 액션(write)와 조회(read) 분리

## 완료 조건
- 화면 컴포넌트에서 직접 페이지네이션 루프 제거
- 데이터 fetch/정규화/병합은 hook/service 계층으로 이동
- 화면은 표현/입력 처리 중심으로 단순화
