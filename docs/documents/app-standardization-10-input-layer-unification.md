# 표준화 10: 입력 레이어 통일 (FormTextInput + 길이 제한 메시지)

## 범위
- 기존 추가 제안 1번 + 2번 통합
- 입력 컴포넌트 통일, 길이 제한 피드백 통일

## 문제 요약
입력 필드가 `FormTextInput`과 raw `TextInput`으로 분산되어 있습니다. 길이 제한 토스트 메시지도 공용 컴포넌트 메시지와 레거시 유틸 메시지가 공존합니다.

## 코드 근거
- raw `TextInput` 다수 사용
  - `src/screens/MeetingScreen.tsx:9616`
  - `src/screens/MyPageScreen.tsx:2205`
  - `src/screens/StoryScreen.tsx:1841`
- 공용 입력 컴포넌트는 별도 존재
  - `src/components/common/FormTextInput.tsx:73`
  - `src/components/common/FormTextInput.tsx:78`
- 메시지가 다른 구형 유틸 존재(미사용)
  - `src/utils/input.ts:3`
  - `src/utils/input.ts:10`

## 업계 표준 대비 차이
표준은 입력 검증/길이 제한/피드백 정책을 공용 입력 프리미티브에서 일원화합니다. 화면별 raw 입력 구현은 예외 케이스만 허용합니다.

## 리스크
- 입력 UX 일관성 저하
- 같은 제한 정책 변경 시 다중 수정 필요
- 안내 문구/토스트 회귀 위험

## 개선 가이드
### 단기
- raw `TextInput` 중 단순 폼 입력부터 `FormTextInput`로 치환
- `src/utils/input.ts` 정리(삭제 또는 `FormTextInput` 내부로 흡수)

### 중기
- 입력 타입(이메일/비밀번호/URL/검색)별 표준 props 세트 정의
- 길이 제한, 키보드 타입, 보조문구를 프리셋화

## DoD
- 일반 폼 입력 경로에서 raw `TextInput` 제거
- 길이 제한 초과 토스트 메시지 단일화
- 레거시 입력 유틸 중복 제거
