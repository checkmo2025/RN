# 표준화 12: 도메인 상수 중앙화 (정규식/팔레트/MIME/기본 이미지)

## 범위
- 기존 추가 제안 4번

## 문제 요약
동일 의미 상수(이메일/비밀번호 regex, 프로필 팔레트, MIME 판별, 기본 이미지)가 여러 화면에 중복 선언되어 있습니다.

## 코드 근거
- regex 중복
  - `src/screens/AuthFlowScreen.tsx:87`
  - `src/screens/MyPageScreen.tsx:223`
- MIME 판별 중복
  - `src/screens/AuthFlowScreen.tsx:101`
  - `src/screens/MyPageScreen.tsx:266`
  - `src/screens/meeting/formatters.ts:59`
- 기본 이미지 상수 분산
  - `src/components/feature/groups/MeetingListCard.tsx:9`
  - `src/screens/MeetingScreen.tsx:255`
  - `src/screens/HomeScreen.tsx:69`

## 업계 표준 대비 차이
표준은 상수/규칙을 `constants` 또는 `domain/policies` 계층으로 모읍니다. 화면은 읽기만 하고 재선언하지 않습니다.

## 리스크
- 정책 변경 누락
- validation mismatch
- 파일별 미세 차이로 인한 버그

## 개선 가이드
### 단기
- `src/constants/validation.ts`, `src/constants/media.ts`, `src/constants/defaultAssets.ts` 분리
- 기존 중복 선언 치환

### 중기
- 입력 정책(`INPUT_LIMITS`)처럼 중앙 상수 체계 확장
- 상수 네이밍/소유 도메인 규칙 정의

## DoD
- 동일 regex/MIME/기본이미지 선언 단일 소스화
- 화면 파일에서 중복 상수 제거
