# 표준화 13: 커서 페이지네이션 루프 정책 통일

## 범위
- 기존 추가 제안 5번

## 문제 요약
`for (page < 100)` + `visitedCursors` + `seenIds` 패턴이 여러 화면/서비스에 반복됩니다. 동작은 유사하지만 구현 위치가 분산되어 관리 비용이 큽니다.

## 코드 근거
- 반복 루프 패턴
  - `src/screens/HomeScreen.tsx:212`
  - `src/screens/NewsScreen.tsx:216`
  - `src/screens/MyPageScreen.tsx:657`
  - `src/screens/MeetingScreen.tsx:580`
  - `src/services/api/memberApi.ts:427`

## 업계 표준 대비 차이
표준은 “커서 전부 수집” 로직을 공통 유틸/리포지토리 함수로 추상화해 중복 방지, 최대 페이지 한도, 중복 제거 정책을 한 곳에서 제어합니다.

## 리스크
- 한도값(100) 변경 시 다중 수정
- 경계 조건(중복 커서/중복 ID) 화면별 편차
- 성능/네트워크 정책 일관성 저하

## 개선 가이드
### 단기
- `collectAllCursorPages` 유틸 도입
- 공통 옵션: `maxPages`, `getCursor`, `hasNext`, `dedupeKey`

### 중기
- 도메인별 파서만 주입하는 형태로 통일
- 대량 수집 사용처 모니터링 포인트 추가

## DoD
- 반복 루프를 공통 유틸로 치환
- 페이지 한도/중복 제거 정책 중앙화
