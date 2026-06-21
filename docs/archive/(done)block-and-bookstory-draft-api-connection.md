# 차단/책이야기 임시저장 API 연결 정리

- 작성일: 2026-05-20 KST
- 확인 기준: [CheckMo Swagger UI](https://api.checkmo.co.kr/swagger-ui/index.html#/)
- 스펙 원본: `GET https://api.checkmo.co.kr/v3/api-docs`

## 1) 차단 화면 API

### 차단 목록 조회
- 메서드/경로: `GET /api/members/me/blocks`
- 쿼리: `cursorId` (optional, int64)
- operationId: `getBlockedMemberList`
- 응답 모델: `MemberResponseDTO$BlockedMemberList`
  - `blocks[]`: `memberId`, `nickname`, `profileImageUrl`
  - `hasNext`, `nextCursor`

### 사용자 차단
- 메서드/경로: `POST /api/members/{memberNickname}/block`
- operationId: `blockMember`
- 설명: 특정 회원 차단 + 기존 양방향 팔로우 관계 삭제

### 사용자 차단 해제
- 메서드/경로: `DELETE /api/members/{memberNickname}/block`
- operationId: `unblockMember`

## 2) 책이야기 임시저장 API

### 임시저장 생성
- 메서드/경로: `POST /api/book-stories`
- operationId: `createBookStory`
- 요청 스키마: `BookStoryRequestDTO$BookStoryCreate`
  - 필수: `isbn`, `title`
  - 선택: `description`, `status`
  - `status` enum: `DRAFT` | `PUBLISHED`

### 임시저장 수정/이어쓰기
- 메서드/경로: `PATCH /api/book-stories/{bookStoryId}`
- operationId: `updateBookStory`
- 요청 스키마: `BookStoryRequestDTO$BookStoryUpdate`
  - 필수: `title`
  - 선택: `isbn`, `description`, `status`
  - `status` enum: `DRAFT` | `PUBLISHED`

### 확인 포인트
- 별도 `/draft` 전용 엔드포인트는 없고 `status: DRAFT`로 임시저장 상태를 표현.
- 목록/상세 응답 모델(`BookStoryResponseDTO$BasicInfo`, `DetailInfo`)에 `status`가 포함되어 DRAFT/PUBLISHED 구분 가능.

## 3) RN 연결 시 체크리스트

- 차단 화면
  - `GET /api/members/me/blocks` 커서 페이지네이션 반영 (`nextCursor`, `hasNext`).
  - 사용자 프로필/목록에서 차단(`POST`) 및 차단해제(`DELETE`) 액션 연결.
  - 낙관적 UI 적용 여부 결정(즉시 반영 vs 재조회) 및 실패 시 롤백/토스트 처리.

- 책이야기 작성 화면
  - 임시저장 버튼: 신규는 `POST`, 기존 draft 수정은 `PATCH`.
  - 임시저장 시 `status: DRAFT`, 발행 시 `status: PUBLISHED` 명시.
  - 재진입 시 내 글 목록/상세에서 DRAFT를 로드해 이어쓰기 UX 연결.
