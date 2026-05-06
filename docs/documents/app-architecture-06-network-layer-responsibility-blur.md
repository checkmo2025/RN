# 앱 아키텍처 이슈 06: 네트워크 계층 책임 경계 불명확

## 범위
- 본 문서는 이전 진단의 6번 항목만 다룹니다.

## 문제 요약
공통 HTTP 계층이 UI 토스트를 직접 발생시키고, 일부 API는 공통 request 유틸을 우회해 `fetch`를 직접 사용합니다. 결과적으로 에러 처리 책임 경계가 흐립니다.

## 현재 코드 근거
- HTTP 유틸에서 직접 `showToast` 호출
  - `src/services/api/http.ts:2`
  - `src/services/api/http.ts:115`
- `clubApi`의 일부 함수가 공통 유틸 우회
  - `src/services/api/clubApi.ts:1889` (`fetchClubNextMeetingRedirect`)

## 업계 표준 대비 차이
표준은 다음처럼 분리합니다.
- transport: 요청/응답/에러 객체화
- domain service: 도메인 의미 부여
- UI: 사용자 메시지 표현

현재처럼 하위 계층에서 UI 토스트를 직접 쏘면, 상위 계층이 메시지 전략을 일관되게 제어하기 어렵습니다.

## 리스크
- 동일 에러에 대해 화면별 메시지 일관성 저하
- 테스트 시 UI 의존성이 transport까지 전파
- 재시도/백오프/로그 수집 정책 통합 어려움

## 개선 가이드
### 단기
- `requestJson`은 `ApiError`만 throw하고 토스트는 옵션 기본 off로 전환
- 화면/훅에서 에러 메시지 매핑 후 토스트 출력

### 중기
- 에러 매퍼를 계층화
  - transport error -> domain error -> presentation message
- 공통 유틸 우회 fetch는 예외 사유를 문서화하고 점진 통합

## 완료 조건
- transport 계층에서 UI 부수효과 제거
- API 호출 경로의 에러 처리 정책이 화면 레벨에서 통제됨
- 예외 fetch 경로 최소화 또는 공통 계층 편입
