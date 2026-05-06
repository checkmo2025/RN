# 앱 아키텍처 이슈 05: 비동기 레이스 방지 전략 불일치

## 범위
- 본 문서는 이전 진단의 5번 항목만 다룹니다.

## 문제 요약
일부 비동기 흐름은 stale response 방어가 있으나, 다른 흐름은 debounce만 있고 요청 취소/최신성 보장이 없어 레이스 대응이 일관되지 않습니다.

## 현재 코드 근거
- 검색: 300ms debounce만 존재, 요청 최신성 보장 로직 없음
  - `src/screens/MeetingScreen.tsx:620`
- 워크스페이스 로딩: requestId 기반 stale guard 존재
  - `src/screens/MeetingScreen.tsx:5483`

## 업계 표준 대비 차이
표준은 화면 단위로 정책을 섞기보다, 공통된 비동기 최신성 규칙을 둡니다.
- AbortController cancel
- request sequence gate
- query key 기반 최신 응답만 반영

현재는 기능별로 제각각이라, 같은 앱 내에서도 레이스 체감 품질이 달라질 수 있습니다.

## 리스크
- 느린 이전 검색 응답이 최신 결과를 덮어쓰는 현상
- 간헐적 재현으로 QA 누락 가능성 높음
- 사용자가 “검색이 튄다/되돌아간다”로 인지

## 개선 가이드
### 단기
- 검색 API 호출에 요청 시퀀스 id 또는 AbortController 도입
- 응답 반영 전 latest token 일치 여부 확인

### 중기
- 비동기 정책 공통 유틸화
  - `withLatestOnly`, `createAbortableTask` 같은 패턴
- 화면별 임의 구현 제거

## 완료 조건
- 검색/공지/책장 등 주요 fetch 경로에 최신성 보장 적용
- stale 응답이 state를 덮어쓰지 않음
- 동일 정책을 다른 화면에서도 재사용 가능
