# 앱 아키텍처 이슈 09: 이미지 업로드 파이프라인 중복 구현

## 범위
- 본 문서는 이전 진단의 9번 항목만 다룹니다.

## 문제 요약
이미지 선택/권한 요청/presigned URL 발급/PUT 업로드 흐름이 여러 화면에 반복 구현되어 있습니다.

## 현재 코드 근거
- 모임 화면 업로드 로직
  - `src/screens/MeetingScreen.tsx:289`
  - `src/screens/MeetingScreen.tsx:306`
- 마이페이지 업로드 로직
  - `src/screens/MyPageScreen.tsx:973`
  - `src/screens/MyPageScreen.tsx:992`
- 회원가입 흐름 업로드 로직
  - `src/screens/AuthFlowScreen.tsx:591`

## 업계 표준 대비 차이
표준은 공통 훅/서비스로 추상화하여 다음을 일원화합니다.
- 권한 체크
- mime 추론
- presigned 업로드
- 공통 에러 처리

현재는 화면별 구현이 미세하게 달라, 버그 수정/정책 변경 시 중복 수정이 필요합니다.

## 리스크
- 한 화면만 수정되고 다른 화면은 누락되는 불일치
- 업로드 정책 변경 시 회귀 범위 확대
- 사용자 메시지/실패 처리 UX 편차

## 개선 가이드
### 단기
- `useImageUpload` 또는 `uploadImageWithPresignedUrl` 공통 유틸 도입
- 입력 파라미터만 화면별로 주입
  - 업로드 타입(CLUB/NOTICE/PROFILE)
  - 성공 후 반영 콜백

### 중기
- 업로드 실패 코드 표준화
- 재시도/취소 정책 공통화
- 이미지 리사이즈/압축 정책 일원화(필요 시)

## 완료 조건
- 화면 내 중복 업로드 절차 제거
- 공통 모듈 한 곳에서 정책 변경 가능
- 화면별 차이는 파라미터와 후처리만 유지
