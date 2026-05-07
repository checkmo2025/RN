# 표준화 18: 도메인 라벨/코드 사전 중앙화 (카테고리/참여대상)

## 범위
- 카테고리/참여대상의 `code ↔ label` 매핑 중복을 통합합니다.

## 문제 요약
동일 도메인 사전이 화면/헬퍼/훅 파일마다 재선언되어 변경 비용이 누적됩니다.

## 현재 코드 근거
- 카테고리 라벨 맵 중복
  - `src/screens/AuthFlowScreen.tsx:106`
  - `src/screens/MyPageScreen.tsx:157`
  - `src/screens/UserProfileScreen.tsx:100`
  - `src/screens/meeting/helpers.ts:53`
- 카테고리/참여대상 코드 맵 중복
  - `src/screens/MeetingScreen.tsx:833`
  - `src/screens/MeetingScreen.tsx:851`
  - `src/screens/meeting/useManagementState.ts:40`
  - `src/screens/meeting/useManagementState.ts:58`

## 업계 표준 대비 차이
표준은 도메인 사전을 한 모듈에서 선언하고, UI/서비스는 조회만 합니다.

## 리스크
- 카피/코드 변경 시 파일별 누락
- 화면 간 라벨 불일치
- 신규 기능에서 동일 상수 재복제

## 개선 가이드
### 1차
- `src/constants/domain/category.ts` 생성
  - `CATEGORY_CODE_TO_LABEL`
  - `CATEGORY_LABEL_TO_CODE`
  - `CATEGORY_ORDER`
- `src/constants/domain/participant.ts` 생성
  - `PARTICIPANT_CODE_TO_LABEL`
  - `PARTICIPANT_LABEL_TO_CODE`

### 2차
- 색상 정책(`categoryChipColorByCode`)도 도메인 사전과 연결
- 화면별 임시 라벨 오버라이드는 명시적 예외로 제한

## 완료 조건(Definition of Done)
- category/participant 매핑이 단일 파일로 수렴
- 중복 선언 제거
- 라벨/코드 변환 로직이 화면에서 재선언되지 않음
