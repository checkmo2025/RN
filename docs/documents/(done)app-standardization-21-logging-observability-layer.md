# 표준화 21: 로깅/관측 레이어 통일 (console 직접 호출 축소)

## 범위
- 실시간 채팅/모임 도메인 중심으로 로깅 경로를 공통 logger 레이어로 통합합니다.

## 문제 요약
현재는 `console.log/warn/info` 직접 호출과 도메인 로그 함수가 혼재되어, 환경별 제어와 추적 일관성이 약합니다.

## 현재 코드 근거
- 채팅 훅에서 직접 console 다수 사용
  - `src/hooks/useMeetingChatStomp.ts:45`
  - `src/hooks/useMeetingChatStomp.ts:51`
  - `src/hooks/useMeetingChatStomp.ts:65`
  - `src/hooks/useMeetingChatStomp.ts:77`
  - `src/hooks/useMeetingChatStomp.ts:93`
- 도메인 로그 유틸 별도 존재
  - `src/screens/meeting/helpers.ts:159`
  - `src/screens/meeting/helpers.ts:162`
  - `src/screens/meeting/helpers.ts:165`
- 사용 지점
  - `src/screens/meeting/useNoticeState.ts:874`
  - `src/screens/meeting/useBookshelfState.ts:1673`

## 업계 표준 대비 차이
표준은 logger 인터페이스(`debug/info/warn/error`)를 통해 환경별 출력/수집/마스킹 정책을 통제합니다.

## 리스크
- 운영 이슈 재현 시 로그 품질 불균등
- 민감 정보 마스킹 정책 강제 어려움
- 향후 원격 수집(Sentry/DataDog 등) 연결 비용 증가

## 개선 가이드
### 1차
- `src/utils/logger.ts` 생성
  - 레벨별 함수 + `__DEV__` 게이트
  - 도메인 prefix(`meeting`, `chat`, `api`) 표준화
- `useMeetingChatStomp`, `logMeetingAction`를 logger 경유로 교체

### 2차
- 에러 객체 직렬화 규칙 통일
- 필요 시 원격 수집 provider 어댑터 분리

## 완료 조건(Definition of Done)
- 도메인 코드의 직접 `console.*` 호출 최소화
- 로깅 포맷/레벨/출력 정책 단일화
- 디버그/운영 환경에서 일관된 로그 제어 가능
