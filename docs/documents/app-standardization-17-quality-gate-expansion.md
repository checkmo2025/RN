# 표준화 17: 정적 품질 게이트 확장 (lint/test/unused)

## 범위
- 기존 추가 제안 9번

## 문제 요약
현재 품질 게이트는 `check:typography`, `check:spacing`, `typecheck`, `doctor` 중심입니다. lint/unused-code/테스트 게이트가 약해 구조 리팩터링 중 잔여 코드가 남기 쉽습니다.

## 코드 근거
- 현재 스크립트 구성
  - `package.json:5`
- 사용되지 않는 코드 징후(예: 로컬 미사용 선언)
  - `src/navigation/BottomTabs.tsx:76` (`Placeholder`)
  - `src/navigation/BottomTabs.tsx:159` (`labelsMap`)

## 업계 표준 대비 차이
표준은 최소한 아래를 CI 게이트에 둡니다.
- ESLint(미사용 변수/의존성 규칙)
- 테스트(단위 또는 스냅샷 최소셋)
- 타입체크 + 프로젝트 규칙 스크립트

## 리스크
- dead code 누적
- 리팩터링 이후 미사용 함수/상수 잔존
- 회귀 조기 탐지 실패

## 개선 가이드
### 단기
- ESLint 도입(또는 기존 규칙 활성화) + no-unused-vars 엄격 적용
- `npm run check`에 lint 포함

### 중기
- 핵심 유틸(날짜/매퍼/파서) 단위 테스트 최소셋 도입
- PR 게이트에서 check + test 강제

## DoD
- lint 기반 미사용 코드 자동 검출
- check 파이프라인에서 lint 포함
- 핵심 유틸 최소 테스트 확보
