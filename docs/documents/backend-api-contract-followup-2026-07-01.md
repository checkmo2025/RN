# Backend API Contract Follow-up

- Date: 2026-07-08 KST
- BE 기준: `ref_code/BE` `develop` branch, latest commit `9e31ae69`
- 최신화: `develop`을 `31f853b3` -> `9e31ae69`로 fast-forward pull
- 목적: RN 앱 연동 중 발견된 BE/Swagger/응답 계약 이슈를 "나중에 유지보수하기 쉬운 공통 응답 정책" 관점으로 다시 정리
- 검토 범위: 최신 BE 코드 기준 `SecurityConfig`, REST controller, DTO, converter, service, exception advice, WebSocket error handler, migration 파일 확인
- 경로 표기: 아래 파일 경로는 BE 레포 루트 기준

## 요약

1. 이번 정리의 핵심은 개별 엔드포인트 땜질보다 **응답 형식 통일**입니다. RN이 `ApiResponse` 한 가지 형태를 기본으로 파싱할 수 있어야 유지보수성이 좋아집니다.
2. 일반 REST 성공/실패는 대체로 `ApiResponse { isSuccess, code, message, result }`를 쓰지만, Spring Security 401 entrypoint와 STOMP/WebSocket 오류는 다른 body shape입니다.
3. `ExceptionAdvice`와 `GeneralExceptionHandler`가 겹치는 예외 핸들러를 갖고 있어 validation/general error 응답 코드와 `result` 형태가 흔들릴 수 있습니다.
4. 공개 API인데 Swagger에 401이 남아 있거나, 인증 필수 API인데 Swagger에 401이 빠진 항목이 여전히 있습니다.
5. 날짜 포맷, `nextCursor/currentPage` nullable, 책 검색 결과 없음 정책은 실제 JSON과 Swagger schema를 맞춰야 RN 방어 코드가 줄어듭니다.
6. 최신 pull의 신규 커밋은 관리자 모임 목록 owner/member 조회 안정화 중심이라, 아래 API 계약 이슈 대부분은 여전히 유효합니다.

## P0. 공통 응답 형식 정규화

### 목표

REST API의 성공/실패 응답을 아래 top-level shape로 통일합니다.

```json
{
  "isSuccess": false,
  "code": "COMMON_401",
  "message": "인증이 필요합니다.",
  "result": null
}
```

검증 오류처럼 상세 정보가 필요한 경우에도 top-level shape는 유지하고, 상세 정보는 `result` 아래에 둡니다.

```json
{
  "isSuccess": false,
  "code": "COMMON_400",
  "message": "잘못된 요청입니다.",
  "result": {
    "fieldErrors": {
      "keyword": "검색 키워드는 40자 이하로 입력해주세요."
    }
  }
}
```

### 현재 코드 기준

- 표준 REST wrapper: `src/main/java/checkmo/common/apiPayload/ApiResponse.java`
  - `@JsonPropertyOrder({"isSuccess", "code", "message", "result"})`
  - `result`는 null이면 JSON에서 빠질 수 있음
- 대부분의 controller는 `ApiResponse.onSuccess(...)` 반환
- `ExceptionAdvice`는 `ApiResponse.onFailure(code, message, result)` 형태 사용
  - 파일: `src/main/java/checkmo/common/apiPayload/exception/ExceptionAdvice.java`
- Spring Security authentication entrypoint는 `ApiResponse`를 거치지 않고 직접 JSON 문자열을 씀
  - 파일: `src/main/java/checkmo/authentication/internal/config/SecurityConfig.java` lines 79-82
  - 현재 body: `{"code": "UNAUTHORIZED", "message": "로그인이 필요합니다."}`
  - 누락: `isSuccess`, `result`
- 별도 `GeneralExceptionHandler`도 존재하며 `ExceptionAdvice`와 역할이 겹침
  - 파일: `src/main/java/checkmo/common/apiPayload/exception/handler/GeneralExceptionHandler.java`
  - validation code가 `"400"`으로 내려가거나, `GeneralException`의 상세 DTO가 `result`로 내려가는 등 `ExceptionAdvice`와 shape/코드 정책이 다를 수 있음
- STOMP/WebSocket 오류는 REST `ApiResponse`가 아니라 별도 record 사용
  - 파일: `src/main/java/checkmo/realtime/web/websocket/error/RealtimeErrorMessage.java`
  - 현재 body: `{ "code": "...", "message": "...", "fieldErrors": [] }`

### 요청

- REST 인증 실패/권한 실패/검증 실패/비즈니스 예외/서버 예외의 top-level body를 `ApiResponse`로 통일해 주세요.
- `SecurityConfig.authenticationEntryPoint`와 필요한 filter-level 에러 응답도 같은 serializer/helper를 타도록 정리해 주세요.
- `ExceptionAdvice`와 `GeneralExceptionHandler` 중 하나로 책임을 모으거나, `@Order`/scope를 명확히 분리해 중복 처리를 없애 주세요.
- validation 오류 상세 구조를 하나로 정해 주세요.
  - 권장: `result.fieldErrors` 또는 `result.errors`
  - 필드 단위 오류와 query/path/body 오류가 같은 위치에 오도록 통일
- WebSocket/STOMP 오류는 REST와 완전히 같게 만들지 않더라도, RN이 별도 parser를 명확히 둘 수 있도록 문서화해 주세요.
  - 권장: `code`, `message`, `fieldErrors` 유지 시 Swagger/README 또는 WebSocket 문서에 REST와 다른 계약임을 명시

### DoD

- 모든 REST 4xx/5xx 응답이 `isSuccess`, `code`, `message`, `result` 규칙을 따릅니다.
- 비로그인 401도 `ApiResponse`와 같은 top-level 필드를 갖습니다.
- validation error의 상세 위치가 API마다 다르지 않습니다.
- RN 에러 파서가 REST 기준 한 경로로 처리 가능합니다.
- Swagger/OpenAPI에 공통 error schema가 등록되어 400/401/403/404/500 응답에서 재사용됩니다.

## P1. Swagger 권한 문서 정리

### 공통 근거

`src/main/java/checkmo/authentication/internal/config/SecurityConfig.java`

- `GET /api/v1/books/me/likes`만 인증 필수, 그 외 `GET /api/v1/books/**`는 공개: lines 61-62
- `GET /api/v1/book-stories/me`, `/following`, `/clubs/**`는 인증 필수: line 63
- 공개 책이야기 조회: `GET /api/v1/book-stories`, `/sitemap`, `/*`, `/search/*`, `/members/*`: line 64
- `GET /api/v1/news/me`는 인증 필수, `/news/sitemap`, `/news/**`는 공개: lines 65-66
- `GET /api/v1/app/version`, `/terms`는 공개: lines 67-68
- `GET /api/v1/members/me`, `/members/me/**`는 인증 필수: line 69
- `GET /api/v1/members/*`는 공개: line 70
- 공개 모임 조회: `GET /api/v1/clubs`, `/clubs/sitemap`, `/clubs/*/home`, `/clubs/search`: line 74
- 최신 공지 1건만 공개: `GET /api/v1/clubs/*/notices/latest`: line 75
- 그 외 요청은 인증 필수: line 76

`@CurrentId`는 공개 API에서도 optional 사용자 컨텍스트로 쓰입니다.

- 인증 정보가 없으면 `CurrentMemberArgumentResolver`가 `null` 반환
- 따라서 공개 API에 `@CurrentId`가 있어도 보안 설정이 `permitAll`이면 비로그인 200이 가능합니다.

### 정리 대상

| ID | Endpoint | 현재 코드 기준 정책 | 현재 문서/코드 문제 | 요청 |
| --- | --- | --- | --- | --- |
| `BOOK-04` | `GET /api/v1/book-stories`, `/book-stories/{bookStoryId}`, `/book-stories/members/{nickname}`, `/book-stories/search/{bookId}` | 공개 조회 | Controller 응답 문서에 401이 남아 공개 정책과 혼동됩니다. `BookStoryController.java` lines 57-64, 105-115, 159-166, 303-313 | 공개 API라면 401 제거. 대신 "비회원 조회 가능, 로그인 시 개인화 필드 포함" 설명 추가 |
| `BOOKS-03` | `GET /api/v1/books/{memberNickname}/likes` | 공개 조회. `/books/me/likes`만 인증 필수 | Controller는 401을 명시합니다. `BookController.java` lines 115-123 | 공개 정책 유지 시 401 제거. 비공개 정책이면 `SecurityConfig`를 인증 필수로 변경 |
| `NEWS-04` | `GET /api/v1/news`, `/api/v1/news/{newsId}` | 공개 조회 | Controller는 401을 명시합니다. `NewsController.java` lines 29-35, 76-85 | 공개 API로 고정하고 401 제거 |
| `MEET-SEARCH-02` | `GET /api/v1/clubs/recommendations` | 인증 필수. 공개 whitelist에 없음 | Controller는 200만 명시합니다. `ClubController.java` lines 151-155 | 401 응답과 인증 필수 설명 추가 |
| `MYPAGE-01` | `GET /api/v1/me/clubs` | 인증 필수. 공개 whitelist에 없음 | Controller는 200/400만 명시합니다. `MyClubController.java` lines 25-28 | 401 응답 추가 |
| `MEET-HOME-02` | `GET /api/v1/clubs/{clubId}/me` | 인증 필수. `/clubs/*/home`만 공개 | Controller는 200/404만 명시합니다. `ClubController.java` lines 196-204 | 401 응답 추가 |
| `MEET-NOTICE-01` | `/api/v1/clubs/{clubId}/notices*` 단, `GET /notices/latest` 제외 | 인증 필수 | 목록/상세/작성/수정/삭제/투표/댓글 API가 403/404 중심이고 401이 빠져 있습니다. `ClubNoticeController.java` lines 50-214 | 공지 목록/상세/댓글/투표/작성/수정/삭제에 401 추가 |
| `MEET-BOOKSHELF-01` | `/api/v1/clubs/{clubId}/bookshelves*`, `/api/v1/clubs/{clubId}/meetings*` | 인증 필수 | 책장/정기모임 API 대부분이 403/404 중심이고 401이 빠져 있습니다. `ClubBookshelfController.java`, `ClubMeetingController.java` | 책장 목록/상세/생성/수정/삭제, 발제/한줄평, 정기모임/팀 API에 401 추가 |
| `AUTH-02` | `GET /api/v1/members/me/login-status` | 인증 필수 | Controller에 `@ApiResponses`가 없습니다. `MemberController.java` lines 362-363 | 200/401/404 또는 실제 에러 케이스 명시 |
| `MEM-07` | `/api/v1/members/me/**` 일부 | 인증 필수 | `follow-count`, `blocks`, `update-password` 등 일부 내 계정 API에 응답 문서가 없거나 401이 빠져 있습니다. `MemberController.java` lines 230-238, 304-310, 337-345 | 내 계정 API 전반에 401 추가 |
| `MEET-MGMT-05` | `POST /api/v1/clubs`, `PUT/DELETE /api/v1/clubs/{clubId}`, `/clubs/{clubId}/members*` | 인증 필수 | 운영/관리 API 일부에 401이 빠져 있습니다. `ClubController.java` lines 53-58, 67-76, 116-125, 212-232, 262-287 | 운영/관리 API에 401 추가, 운영진 권한 403과 인증 실패 401 분리 |
| `CHAT-03` | `GET /api/v1/clubs/{clubId}/meetings/{meetingId}/teams/{teamId}/chat/messages` | 인증 필수 | Controller는 200/400만 명시합니다. `ChatHistoryController.java` lines 21-27 | 401 추가. 팀 접근 실패는 403 또는 현재 실제 에러 정책에 맞춰 명시 |

### DoD

- 공개 API에는 401이 제거되었거나 optional auth 정책이 설명됩니다.
- 인증 필수 API에는 401 응답이 명시됩니다.
- 운영진/멤버 권한 부족 403과 비로그인 401이 문서에서 분리됩니다.
- `/v3/api-docs`에서 RN이 실제 분기할 수 있는 상태코드가 확인됩니다.

## P1. 검색 입력 검증 오류 정규화

### MEET-SEARCH-05. `/clubs/search` keyword 40자 초과 시 400 보장

현재 코드 의도:

- `ClubRequestDTO.ClubSearchFilter` record compact constructor에서 keyword를 trim하고 40자 초과 시 `ClubManagementException(CLUB_SEARCH_KEYWORD_TOO_LONG)` throw
- 파일: `src/main/java/checkmo/clubManagement/web/dto/ClubRequestDTO.java` lines 82-109
- 에러 정의: `ClubManagementErrorStatus.CLUB_SEARCH_KEYWORD_TOO_LONG`
  - HTTP 400
  - code `CLUB_402`
  - 파일: `src/main/java/checkmo/clubManagement/internal/excepetion/ClubManagementErrorStatus.java`

문제:

- 코드 의도는 400이지만, query binding/record 생성 과정에서 예외가 wrapping되면 공통 500 또는 다른 400 shape로 빠질 수 있습니다.
- RN/QA 이력상 40자 초과 요청에서 400 대신 500(`COMMON_500`)이 관측된 적이 있습니다.

요청:

- `GET /api/v1/clubs/search?keyword=<41자>` API 테스트를 추가해 HTTP 400 + 합의된 error body를 고정해 주세요.
- 가능한 정리 방향:
  - `keyword`에 Bean Validation `@Size(max = 40)` 적용
  - query binding 예외를 `ExceptionAdvice`에서 400으로 통일
  - Controller/service 진입 후 명시 검증해 `GeneralException` 경로로 고정

DoD:

- 40자 이하 keyword: 200
- 41자 이상 keyword: 400
- 응답 body는 P0 공통 error shape를 따름
- Sentry/서버 로그에서 정상 검증 오류로 분류되고 5xx로 잡히지 않음

## P2. 날짜/시간 응답 정책 통일

### BOOK-05. Swagger `date-time`과 실제 문자열 포맷 불일치

현재 코드에서 날짜 응답 포맷이 섞여 있습니다.

- 책이야기 목록/상세/댓글: `yyyy-MM-dd HH:mm`
  - `BookStoryResponseDTO.java` lines 64-65, 88-89, 138-139
- 책이야기 관리자 목록: `yyyy.MM.dd`
  - `BookStoryResponseDTO.java` lines 125-126
- 소식 공개일/생성일: `yyyy-MM-dd`
  - `NewsResponseDTO.java` lines 57-58, 74-75, 99-106, 123-130
- 알림 생성일: `yyyy-MM-dd HH:mm`
  - `NotificationResponseDTO.java` lines 51-52
- 공지/정기모임/책장/채팅 일부 `LocalDateTime` 필드는 별도 `@JsonFormat`이 없습니다.
  - `ClubNoticeResponseDTO.java` lines 59, 95, 117-118, 158-159
  - `MeetingResponseDTO.java` lines 40, 60
  - `BookShelfResponseDTO.java` line 79
  - `ChatResponseDTO.java` line 31

요청:

- BE 표준을 하나로 정해 주세요.
  - 옵션 A: RFC3339/ISO-8601 `date-time`으로 통일
  - 옵션 B: 현재 한국형 문자열 포맷을 유지하되 Swagger `@Schema(type = "string", example = "...", pattern = "...")`로 명확히 표기
- 기존 RN 파싱과 호환성이 필요하므로, 포맷 변경 시 RN 반영 일정과 같이 조정해 주세요.

DoD:

- Swagger schema/example과 실제 JSON 문자열이 일치합니다.
- 같은 도메인 내 날짜 필드 포맷이 일관됩니다.
- RN의 날짜 parsing fallback을 줄일 수 있습니다.

## P2. nullable/cursor 응답 정책 명시

### BOOKS-04. `currentPage`, `nextCursor` nullable 문서 누락

현재 코드:

- `BookResponseDTO.BookList.currentPage`는 `Integer`라 null 가능입니다.
  - `BookResponseDTO.java` lines 32-33
- 추천 책 응답은 `currentPage(null)`로 생성합니다.
  - `BookRecommendationService.java` lines 110-113, 130-133, 169-173
- 빈/비정상 알라딘 응답도 `currentPage(null)` 가능
  - `BookConverter.java` lines 115-119
- cursor pagination의 `nextCursor`는 다음 페이지가 없으면 null입니다.
  - `CursorPagingHelper.java` lines 37-43
  - `CursorResult.java` lines 12-15
- `nextCursor` 필드는 책/소식/모임/공지댓글/책이야기/신고/책장/채팅/회원 팔로우 등 여러 DTO에 반복됩니다.

요청:

- nullable 필드에는 `@Schema(nullable = true, description = "...")` 또는 공통 pagination schema를 적용해 주세요.
- cursor 기반 API는 `hasNext=false`일 때 `nextCursor=null`을 종료 신호로 명확히 문서화하는 것을 권장합니다.

DoD:

- `hasNext=false` 마지막 페이지의 `nextCursor=null`이 Swagger에 표현됩니다.
- 추천 책의 `currentPage=null` 또는 대체값 정책이 Swagger와 일치합니다.
- RN 타입에서 불필요한 `number | null | undefined` 방어를 줄일 수 있습니다.

## P2. 책 검색/추천 결과 없음 정책

### BOOKS-05. 404 문서와 200 빈 배열 응답 정책 불일치

현재 코드:

- `GET /api/v1/books/search` Swagger는 404 "책 정보를 찾을 수 없음"을 명시합니다.
  - `BookController.java` lines 36-43
- keyword가 비었으면 200 + 빈 목록을 반환합니다.
  - `AladinApiService.java` lines 40-43, 70-77
- 알라딘 응답이 비었거나 변환 불가한 경우에도 빈 목록을 만드는 경로가 있습니다.
  - `BookConverter.java` lines 115-119
- `GET /api/v1/books/recommend` Swagger도 404를 명시하지만, 추천 실패는 `ALADIN_API_ERROR` 계열 500으로 처리되는 경로가 있습니다.
  - `BookController.java` lines 69-72
  - `BookRecommendationService.java` lines 39-57, 91-115

요청:

- 검색 결과 없음은 200 + 빈 배열 정책으로 문서화하는 것을 권장합니다.
- `GET /books/search`의 404는 실제 발생 조건이 없다면 제거해 주세요.
- `GET /books/{isbn}` 상세 조회의 ISBN 없음 404와 검색 결과 없음은 분리해 주세요.
- 추천 API의 404도 실제 코드와 맞지 않으면 제거하고, 캐시/알라딘 실패 시 실제 에러 코드/상태코드를 명시해 주세요.

DoD:

- 검색 결과 없음: Swagger와 실제 응답이 모두 200 + `detailInfoList: []`, `hasNext: false`로 일치
- 책 상세 ISBN 없음: 404 유지 가능
- 추천 실패: 실제 코드와 같은 에러 코드/상태코드로 문서화

## P2. 공개 조회 API optional auth 설명

아래 API들은 비로그인도 조회 가능하지만, 로그인 사용자가 호출하면 `likedByMe`, `writtenByMe`, `follow` 등 개인화 필드가 달라질 수 있습니다.

- 책이야기 공개 조회: `GET /api/v1/book-stories`, `/book-stories/{bookStoryId}`, `/book-stories/members/{nickname}`, `/book-stories/search/{bookId}`
- 책 검색/추천/상세: `GET /api/v1/books/search`, `/books/recommend`, `/books/{isbn}`
- 다른 회원 좋아요 책 목록: `GET /api/v1/books/{memberNickname}/likes`
- 소식 공개 조회: `GET /api/v1/news`, `/news/{newsId}`
- 모임 공개 조회: `GET /api/v1/clubs`, `/clubs/{clubId}/home`, `/clubs/search`, `/clubs/{clubId}/notices/latest`

요청:

- Swagger 설명에 "비회원 가능"과 "로그인 시 개인화 필드 포함"을 분리해 적어 주세요.
- 공개 API의 `@CurrentId`는 필수 파라미터가 아니라 optional auth context임을 문서에 반영해 주세요.

## 별도 운영 데이터 확인

### APP-VERSION-01. iOS storeUrl seed placeholder

이 항목은 응답 통일과는 별개지만, 신규 환경/재배포 때 재발할 수 있어 유지합니다.

- API: `GET /api/v1/app/version?platform=ios|android`
- Controller: `src/main/java/checkmo/appVersion/web/controller/AppVersionController.java` lines 24-39
- Migration seed:
  - iOS `store_url`: `https://apps.apple.com/app/id000000000`
  - Android `store_url`: `https://play.google.com/store/apps/details?id=kr.co.checkmo.app`
  - 파일: `src/main/resources/db/migration/V20260628__create_app_version_policy.sql` lines 15-38

요청:

- 운영 DB 및 신규 환경 seed에서 iOS `storeUrl`을 실제 App Store URL로 맞춰 주세요.
- 이미 운영 데이터가 수동 수정되어 있더라도, 신규 환경 seed가 placeholder인 상태면 같은 이슈가 재발할 수 있습니다.

## 권장 처리 순서

1. P0 공통 REST error shape 결정
2. `SecurityConfig` 401 entrypoint를 공통 error shape로 통일
3. `ExceptionAdvice`/`GeneralExceptionHandler` 중복 책임 정리
4. Swagger 공통 error schema 등록 및 401/403/404 문서 정리
5. `/clubs/search` 41자 초과 400 회귀 테스트 추가
6. 날짜/nullable/검색 결과 없음 정책 문서화
7. optional auth 공개 API 설명 정리
8. app version 운영 seed placeholder 확인

## 백엔드 완료 확인 체크리스트

- [ ] REST 오류 응답 top-level shape가 `isSuccess`, `code`, `message`, `result`로 통일됩니다.
- [ ] 비로그인 401도 공통 `ApiResponse` shape를 따릅니다.
- [ ] validation error 상세 위치가 API마다 다르지 않습니다.
- [ ] `ExceptionAdvice`/`GeneralExceptionHandler` 중복 처리 리스크가 제거됩니다.
- [ ] 인증 필수 API는 Swagger에 401이 있습니다.
- [ ] 공개 API는 Swagger에서 401이 제거되었거나 optional auth 정책이 설명되어 있습니다.
- [ ] `/api/v1/clubs/search?keyword=<41자>`가 400으로 고정됩니다.
- [ ] `nextCursor`, `currentPage` nullable 정책이 Swagger에 반영됩니다.
- [ ] 날짜 필드의 실제 JSON 포맷과 Swagger schema/example이 일치합니다.
- [ ] 책 검색 결과 없음 정책이 200 빈 배열 또는 404 중 하나로 고정되고 RN과 합의됩니다.
- [ ] iOS app version `storeUrl` seed/운영 데이터가 실제 App Store URL입니다.
