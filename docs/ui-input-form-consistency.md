# UI 입력 폼 규격 통일 가이드 (4번 항목)

> 기준 문서: `docs/ui-consistency-top10.md`의 4번 항목  
> 범위: RN `src/**/*.tsx` `TextInput`/폼 레이아웃/검증 메시지

## 1) 점검 목적
- 입력 필드의 시각 규격과 동작 규칙을 통일해 학습 비용을 줄인다.
- 인증/프로필/모임 생성 등 폼 많은 화면에서 유지보수성을 높인다.

## 2) 현재 현황 요약 (RN 기준)
- `<TextInput` 사용: 53건
- 공용 입력 컴포넌트: 사실상 부재 (`TextInput` 직접 사용 중심)
- placeholder 색상:
  - `colors.gray3`: 49건
  - `colors.gray2`: 1건
- `keyboardType` 사용:
  - `email-address`: 4건
  - `number-pad`: 3건
  - `phone-pad`: 2건
- `secureTextEntry`: 6건
- `multiline`: 9건
- `maxLength`: 17건
- `editable={false}`: 1건 (`AuthFlow`의 조회 결과 필드)

## 3) 통일 정책 (초안)

### A. 필드 타입
- `text`: 일반 입력
- `email`: 이메일/아이디
- `phone`: 전화번호
- `number`: 인증번호/숫자
- `password`: 비밀번호
- `multiline`: 소개/신고/본문
- `readonly`: 조회 결과 표시

### B. 시각 규격
- 단일행 기본 높이: 56
- 멀티라인 기본 최소 높이: 88
- 공통 스타일: `borderWidth 1`, `borderColor gray2`, `radius md`, `paddingHorizontal md`
- placeholder 색상: `colors.gray3`로 통일

### C. 동작 규칙
- `email/password/id` 성격 필드:
  - `autoCapitalize="none"`
  - `autoCorrect={false}`
- 숫자 입력은 목적에 맞는 `keyboardType` 사용
- `maxLength`는 상수화(하드코딩 최소화)하고 placeholder/도움말과 동일 값 유지

### D. 상태/검증 규칙
- `default`, `focus`, `error`, `disabled`, `readonly` 상태를 문서화
- 에러/도움말은 입력 바로 아래 고정 위치에 표시
- 입력 불가 상태는 색상과 터치 동작 모두에서 명확히 구분

## 4) 1차 정리 대상
- `AuthFlowScreen`, `MyPageScreen`, `MeetingScreen`의 공통 입력 스타일을 역할별로 통합
- placeholder 색상 `gray2` 사용 지점 정리
- `maxLength` 문구와 실제 제한값 불일치 점검

## 5) 2차 정리 대상
- `InputField` 공용 컴포넌트(라벨/도움말/에러/우측 액션 포함) 도입 검토
- 비밀번호 토글, 인증번호 타이머, 중복확인 버튼과의 결합 패턴 공통화
- 폼 제출 전 유효성/포맷팅 파이프라인 표준화

## 6) 완료 조건
- 폼 화면 간 입력 필드 높이/간격/상태 표현이 통일됨
- placeholder/keyboardType/autoCorrect 규칙 위반 0건
- `maxLength`와 안내 문구가 일치하고 상수 기반으로 관리됨
