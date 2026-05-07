# 표준화 22: CI 품질 게이트 파이프라인 고정 (PR 차단 규칙)

## 범위
- 로컬 `check` 스크립트를 CI 파이프라인으로 승격해 PR 단위 품질 게이트를 강제합니다.

## 문제 요약
현재 품질 점검은 로컬 실행 중심이며, 저장소 내 `.github/workflows`가 없어 자동 강제가 없습니다.

## 현재 코드 근거
- 품질 스크립트는 이미 정의됨
  - `package.json` scripts:
    - `lint`
    - `typecheck`
    - `check:typography`
    - `check:spacing`
    - `check`
- 워크플로우 폴더 부재
  - `.github/workflows` 없음

## 업계 표준 대비 차이
표준은 PR마다 최소 정적 검사/타입 검사/핵심 스크립트를 CI에서 자동 실행하고 실패 시 머지를 차단합니다.

## 리스크
- 로컬 환경 의존으로 검사 누락 가능
- 브랜치별 품질 편차 발생
- 회귀가 리뷰 후반/릴리즈 직전에 발견될 확률 증가

## 개선 가이드
### 1차
- GitHub Actions 워크플로우 추가
  - 트리거: `pull_request`, `push`(main/개발 브랜치)
  - 실행: `npm ci` -> `npm run lint` -> `npm run typecheck` -> `npm run check:typography` -> `npm run check:spacing`

### 2차
- `npm run check` 단일 게이트 job으로 통합
- 브랜치 보호 규칙에서 해당 CI를 필수 상태 체크로 지정

## 완료 조건(Definition of Done)
- PR에서 CI 품질 게이트가 자동 실행됨
- 실패 시 merge 불가 상태가 강제됨
- 로컬/CI 결과 불일치가 최소화됨
