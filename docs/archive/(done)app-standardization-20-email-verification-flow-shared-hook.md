# 표준화 20: 이메일 인증(코드 발송/카운트다운/확인) 공통 훅화

## 범위
- 회원가입/Auth와 마이페이지/이메일변경에서 반복되는 이메일 인증 흐름을 통합합니다.

## 문제 요약
인증번호 발송/만료 카운트다운/확인 로직이 두 화면에 유사 구조로 중복되어 있습니다.

## 현재 코드 근거
- 회원가입 인증 상수/상태/타이머
  - `src/screens/AuthFlowScreen.tsx:88`
  - `src/screens/AuthFlowScreen.tsx:157`
  - `src/screens/AuthFlowScreen.tsx:355`
  - `src/screens/AuthFlowScreen.tsx:356`
  - `src/screens/AuthFlowScreen.tsx:413`
- 마이페이지 이메일 변경 인증 상수/상태/타이머
  - `src/screens/MyPageScreen.tsx:225`
  - `src/screens/MyPageScreen.tsx:433`
  - `src/screens/MyPageScreen.tsx:1040`
  - `src/screens/MyPageScreen.tsx:1041`
  - `src/screens/MyPageScreen.tsx:1826`

## 업계 표준 대비 차이
표준은 동일 인증 플로우를 훅으로 추상화해 정책(만료 시간/메시지/재시도 규칙)을 단일화합니다.

## 리스크
- 한 화면만 정책 수정되는 불일치
- 타이머 정리/만료 처리 버그 재발 가능성
- QA 범위 중복 확대

## 개선 가이드
### 1차
- `useEmailVerificationFlow` 도입
  - state: `sent`, `verified`, `deadline`, `remainingSeconds`, `sending`, `confirming`
  - action: `sendCode(email, type)`, `confirmCode(email, code)`, `reset()`

### 2차
- 메시지/유효성 검사 정책도 옵션 주입 방식으로 통일
- `AuthFlow`, `MyPage`는 화면별 UI만 유지

## 완료 조건(Definition of Done)
- 이메일 인증 핵심 로직이 공통 훅 1개로 통합
- 화면은 입력/표시/UI 제어만 담당
- 만료/재발송/확인 동작이 두 화면에서 동일하게 동작
