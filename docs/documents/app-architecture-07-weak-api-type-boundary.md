# 앱 아키텍처 이슈 07: API 타입 경계 약화(`unknown` 수동 정규화 과다)

## 범위
- 본 문서는 이전 진단의 7번 항목만 다룹니다.

## 문제 요약
`clubApi`에서 `unknown` 응답을 수동으로 풀어내는 정규화 로직이 매우 많습니다. 백엔드 계약 불안정 대응에는 유연하지만, 타입 안정성/유지보수성이 크게 희생됩니다.

## 현재 코드 근거
- `unknown` 기반 응답 타입 정의
  - `src/services/api/clubApi.ts:522`
- 수동 파싱 유틸 다수
  - `src/services/api/clubApi.ts:527`

## 업계 표준 대비 차이
표준은 다음 조합을 많이 사용합니다.
- OpenAPI 기반 타입 생성
- 런타임 schema 검증(zod/io-ts 등)
- adapter 계층에서 한 번만 정규화

현재 구조는 endpoint별로 파싱 분기가 증가해, 변경 비용이 누적되는 형태입니다.

## 리스크
- 계약 변경 시 침묵 실패(silent failure) 가능
- 런타임 데이터 불일치가 UI까지 늦게 전파
- 신규 개발자 학습 비용 증가

## 개선 가이드
### 단기
- 변동성이 큰 endpoint부터 schema 검증 도입
- 핵심 도메인 타입(meeting/member/notice) 우선 고정

### 중기
- OpenAPI 타입 생성 파이프라인 도입
- endpoint adapter 표준 템플릿화
  - raw -> validated -> domain model

## 완료 조건
- 핵심 endpoint에 런타임 검증 도입
- `unknown` 직접 소비 지점 최소화
- 모델 변경 시 컴파일/검증 단계에서 조기 실패
