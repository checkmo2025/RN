# 표준화 14: 화면별 에러 메시지 Resolver 통합

## 범위
- 기존 추가 제안 6번

## 문제 요약
`resolve*ErrorMessage` 형태 함수가 화면마다 유사하게 존재합니다. 상태코드 매핑은 거의 동일한데 문구/분기만 조금씩 달라 관리 포인트가 늘어납니다.

## 코드 근거
- 유사 resolver 중복
  - `src/screens/HomeScreen.tsx:92`
  - `src/screens/NewsScreen.tsx:122`
  - `src/screens/MyPageScreen.tsx:322`
  - `src/screens/StoryScreen.tsx:246`
  - `src/screens/meeting/mappers.ts:87`

## 업계 표준 대비 차이
표준은 공통 에러 매퍼를 두고, 화면은 fallback 메시지와 도메인별 1~2개 예외만 오버라이드합니다.

## 리스크
- 같은 에러에 서로 다른 문구 노출
- 문구 정책 변경 시 누락
- 중복 코드 증가

## 개선 가이드
### 단기
- `src/utils/errorMessage.ts`에 공통 status 매핑 유틸 정의
- 화면 resolver는 공통 유틸 래퍼로 축소

### 중기
- 도메인별 사전(`story/news/meeting`)만 유지
- 상태코드 외 커스텀 code 매핑도 중앙화

## DoD
- 화면별 resolver 중복 축소
- 상태코드 문구 매핑 단일 소스화
