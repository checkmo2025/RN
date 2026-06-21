# 앱 아키텍처 이슈 03: 도메인 로직이 표시 문자열에 결합됨

## 범위
- 본 문서는 이전 진단의 3번 항목만 다룹니다.

## 문제 요약
권한/멤버십 같은 도메인 판단이 API status enum이 아니라 한국어 UI 문구 문자열에 의존하고 있습니다.

## 현재 코드 근거
- 멤버 판정이 문구 비교로 수행됨
  - `src/screens/MeetingScreen.tsx:5105`
  - `managedGroup.applicationStatus === '가입 완료되었습니다'`
- status -> 문구 매핑은 별도 함수로 존재
  - `src/screens/meeting/mappers.ts:74`

## 업계 표준 대비 차이
표준 구조에서는 다음을 분리합니다.
- 도메인 판단: enum/코드(`MEMBER`, `STAFF`, `OWNER`) 기반
- 표시 문자열: locale/copy 레이어

현재는 표시 레이어 문자열이 도메인 판단 입력으로 역류하여, copy 변경이 비즈니스 로직에 영향을 주는 구조입니다.

## 리스크
- 카피 변경 시 권한 로직 오작동 가능
- 다국어 도입 시 로직 대규모 재작업 필요
- QA 난이도 증가: “문구 변경”이 기능 회귀를 유발

## 개선 가이드
### 단기
- `applicationStatus`와 별개로 `membershipStatus`(원본 enum) state 유지
- `isMember` 계산은 enum만 사용
- 문구는 렌더링 직전 변환

### 중기
- `Group` UI 모델에서 도메인 필드와 표시 필드 분리
  - 예: `membershipStatus`, `applicationStatusLabel`
- 매퍼 계층에서 label 생성 책임 고정

## 완료 조건
- 문자열 비교 기반 권한 판단 제거
- 역할/권한 계산은 enum 비교만 사용
- 문구 변경이 기능에 영향 없음
