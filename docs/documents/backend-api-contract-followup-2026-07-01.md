# Backend API Contract Follow-up

- Date: 2026-07-01 KST
- BE 기준: `ref_code/BE` `develop` branch, latest commit `8eeb0633`
- 목적: RN 앱 연동 중 남은 BE/Swagger/응답 계약 이슈를 백엔드에 전달하기 위한 정리
- 검토 범위: BE 전체 파일 목록 스캔 후, 이슈와 연결되는 `SecurityConfig`, controller, DTO, converter, service, exception, migration 파일을 코드 기준으로 확인
- 경로 표기: 아래 파일 경로는 BE 레포 루트 기준

## 요약

1. 앱 버전 정책 API는 구현됐지만 iOS `store_url` seed 값이 placeholder입니다. RN 업데이트 버튼이 App Store로 열리지 않는 직접 원인일 가능성이 큽니다.
2. 공개 API인데 Swagger에 401이 남아 있거나, 인증 필수 API인데 Swagger에 401이 빠진 항목이 다수 있습니다.
3. `/api/v1/clubs/search`의 `keyword` 40자 초과는 코드상 400 의도가 있으나, 실서버에서 500으로 관측된 이력이 있어 회귀 테스트와 예외 경로 정규화가 필요합니다.
4. `LocalDateTime`, `nextCursor`, `currentPage` 등 응답 스키마가 실제 JSON과 Swagger에서 다르게 보일 수 있습니다. 날짜 포맷과 nullable 정책을 명시해야 합니다.
5. 책 검색/추천의 "결과 없음"은 현재 코드 기준 200 + 빈 배열 또는 500 계열로 동작하며, Swagger의 404 설명과 맞지 않습니다.

## 공통 근거

### 인증/공개 정책

`src/main/java/checkmo/authentication/internal/config/SecurityConfig.java`

- `GET /api/v1/books/me/likes`만 인증 필수, 그 외 `GET /api/v1/books/**`는 공개: lines 59-60
- `GET /api/v1/book-stories/me`, `/following`, `/clubs/**`는 인증 필수: line 61
- `GET /api/v1/book-stories`, `/sitemap`, `/*`, `/search/*`, `/members/*`는 공개: line 62
- `GET /api/v1/news/me`는 인증 필수, `/news/sitemap`, `/news/**`는 공개: lines 63-64
- `GET /api/v1/app/version`은 공개: line 65
- `GET /api/v1/members/me`, `/members/me/**`는 인증 필수: line 67
- `GET /api/v1/members/*`는 공개: line 68
- 공개 모임 조회: `GET /api/v1/clubs`, `/clubs/sitemap`, `/clubs/*/home`, `/clubs/search`: line 72
- 최신 공지 1건만 공개: `GET /api/v1/clubs/*/notices/latest`: line 73
- 그 외 요청은 인증 필수: line 74

`@CurrentId`는 공개 API에서도 optional 사용자 컨텍스트로 쓰입니다.

- `CurrentMemberArgumentResolver`는 인증 정보가 없으면 `null` 반환: `src/main/java/checkmo/authentication/internal/resolver/CurrentMemberArgumentResolver.java` lines 35-40
- 따라서 공개 API에 `@CurrentId String memberId`가 있어도 보안 설정이 `permitAll`이면 비로그인 200이 가능합니다.

### 401 응답 형식

현재 `SecurityConfig`의 authentication entrypoint는 표준 `ApiResponse`가 아니라 아래 형태를 직접 씁니다.

- `{"code": "UNAUTHORIZED", "message": "로그인이 필요합니다."}`
- 근거: `src/main/java/checkmo/authentication/internal/config/SecurityConfig.java` lines 76-81

Swagger에 401을 추가할 때 이 응답 형식까지 명시할지, 공통 `ApiResponse` 형태로 통일할지도 함께 결정이 필요합니다.

## P0. 앱 버전 정책 운영 데이터 수정

### APP-VERSION-01. iOS storeUrl placeholder 교체

현재 코드:

- API: `GET /api/v1/app/version?platform=ios|android`
- Controller: `src/main/java/checkmo/appVersion/web/controller/AppVersionController.java` lines 16-41
- Security: `GET /api/v1/app/version` 공개 허용, `SecurityConfig.java` line 65
- Migration seed:
  - iOS `store_url`: `https://apps.apple.com/app/id000000000`
  - Android `store_url`: `https://play.google.com/store/apps/details?id=kr.co.checkmo.app`
  - 근거: `src/main/resources/db/migration/V20260628__create_app_version_policy.sql` lines 23-38

RN 기대값:

- iOS 실제 App Store URL: `https://apps.apple.com/app/id6777671102`
- Android: `https://play.google.com/store/apps/details?id=kr.co.checkmo.app`

요청:

- 운영 DB의 iOS `app_version_policy.store_url`을 실제 App Store URL로 교체해 주세요.
- 이미 migration이 적용된 환경이 있을 수 있으므로, 기존 migration 수정만으로는 부족할 수 있습니다. 별도 migration 또는 운영 데이터 패치가 필요합니다.
- `min_supported_version`, `latest_version`의 초기값도 출시 버전 정책과 맞는지 확인해 주세요. 현재 seed는 둘 다 `1.0.2`입니다.

권장 migration 예시:

```sql
UPDATE app_version_policy
SET store_url = 'https://apps.apple.com/app/id6777671102',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE platform = 'IOS';
```

DoD:

- `GET /api/v1/app/version?platform=ios` 200 응답의 `result.storeUrl`이 실제 App Store URL입니다.
- `GET /api/v1/app/version?platform=android` 200 응답의 `result.storeUrl`이 Play Store URL입니다.
- RN에서 강제/권장 업데이트 모달의 `업데이트하기` 버튼이 각 스토어로 이동합니다.

## P1. Swagger 권한 문서 정리

아래 항목은 서버 보안 설정과 Swagger 응답 정의가 맞지 않는 케이스입니다.

| ID | Endpoint | 현재 코드 기준 정책 | 현재 문서/코드 문제 | 요청 |
| --- | --- | --- | --- | --- |
| `BOOK-04` | `GET /api/v1/book-stories`, `/book-stories/{bookStoryId}`, `/book-stories/members/{nickname}`, `/book-stories/search/{bookId}` | 공개 조회. `SecurityConfig.java` line 62 | Controller에 401이 포함되어 공개 정책과 혼동됩니다. `BookStoryController.java` lines 57-63, 105-114, 159-165, 303-312 | 공개 API라면 401 제거 또는 "로그인 시 개인화 필드 포함, 비로그인도 조회 가능"으로 설명을 바꿔 주세요. |
| `BOOKS-03` | `GET /api/v1/books/{memberNickname}/likes` | 공개 조회. `GET /api/v1/books/**` permitAll, 단 `/me/likes`만 인증 필수 | Controller는 401을 명시합니다. `BookController.java` lines 120-126 | 공개 정책 유지 시 401 제거. 비공개 정책이면 `SecurityConfig`에서 이 경로를 인증 필수로 바꿔 주세요. |
| `NEWS-04` | `GET /api/v1/news`, `/api/v1/news/{newsId}` | 공개 조회. `SecurityConfig.java` line 64 | Controller는 401을 명시합니다. `NewsController.java` lines 31-35, 78-83 | 공개 API로 고정하고 401 제거를 권장합니다. |
| `MEET-SEARCH-02` | `GET /api/v1/clubs/recommendations` | 인증 필수. 공개 whitelist에 없어서 `anyRequest().authenticated()` 적용 | Controller는 200만 명시합니다. `ClubController.java` lines 151-155 | 401 응답과 인증 필수 설명을 추가해 주세요. |
| `MYPAGE-01` | `GET /api/v1/me/clubs` | 인증 필수. 공개 whitelist에 없음 | Controller는 200/400만 명시합니다. `MyClubController.java` lines 25-30 | 401 응답을 추가해 주세요. |
| `MEET-HOME-02` | `GET /api/v1/clubs/{clubId}/me` | 인증 필수. `/clubs/*/home`만 공개이며 `/me`는 공개 아님 | Controller는 200/404만 명시합니다. `ClubController.java` lines 196-204 | 401 응답을 추가해 주세요. |
| `MEET-NOTICE-01` | `GET /api/v1/clubs/{clubId}/notices`, `/{noticeId}`, `/{noticeId}/comments`, votes, write/update/delete | `GET /notices/latest`만 공개. 나머지는 인증 필수 | 여러 공지 API가 403/404 중심이고 401이 빠져 있습니다. `ClubNoticeController.java` lines 50-56, 67-73, 82-88, 98-105, 116-123, 133-139, 151-157, 168-175, 186-194, 206-214 | 공지 목록/상세/댓글/투표/작성/수정/삭제에 401을 추가해 주세요. |
| `MEET-BOOKSHELF-01` | `/api/v1/clubs/{clubId}/bookshelves*`, `/api/v1/clubs/{clubId}/meetings*` | 인증 필수. 공개 whitelist에 없음 | 책장/정기모임 API 대부분이 403/404 중심이고 401이 빠져 있습니다. `ClubBookshelfController.java`, `ClubMeetingController.java` | 책장 목록/상세/생성/수정/삭제, 발제/한줄평, 정기모임/팀 API에 401을 추가해 주세요. |
| `AUTH-02` | `GET /api/v1/members/me/login-status` | 인증 필수. `SecurityConfig.java` line 67 | Controller에 `@ApiResponses`가 없습니다. `MemberController.java` lines 362-368 | 200/401/404 또는 실제 에러 케이스를 명시해 주세요. |
| `MEM-07` | `GET /api/v1/members/me/follow-count`, `/members/me/blocks`, `PATCH /members/me/update-password` 등 | 인증 필수. `SecurityConfig.java` line 67 또는 `anyRequest` | 일부 내 계정 API에 응답 문서가 없거나 401이 빠져 있습니다. `MemberController.java` lines 230-238, 304-310, 337-345 | 내 계정 API 전반에 401을 추가해 주세요. |
| `MEET-MGMT-05` | `POST /api/v1/clubs`, `PUT/DELETE /api/v1/clubs/{clubId}`, `/clubs/{clubId}/members*` | 인증 필수. 공개 whitelist에 없음 | 운영/관리 API 일부에 401이 빠져 있습니다. `ClubController.java` lines 53-58, 67-76, 116-125, 212-232, 262-272 | 운영/관리 API에 401을 추가하고 운영진 권한 403과 인증 실패 401을 분리해 주세요. |
| `CHAT-03` | `GET /api/v1/clubs/{clubId}/meetings/{meetingId}/teams/{teamId}/chat/messages` | 인증 필수. 공개 whitelist에 없음 | Controller는 200/400만 명시합니다. `ChatHistoryController.java` lines 21-27 | 401을 추가하고, 팀 접근 실패는 403 또는 현재 실제 코드에 맞는 에러를 명시해 주세요. |

DoD:

- 공개 API에는 401을 제거하거나 optional auth 정책을 설명합니다.
- 인증 필수 API에는 401 응답을 명시합니다.
- 운영진/멤버 권한 부족 403과 비로그인 401을 Swagger에서 분리합니다.
- Swagger UI와 `/v3/api-docs`에서 RN이 실제 분기할 수 있는 상태코드가 확인됩니다.

## P1. 검색 입력 검증 오류 정규화

### MEET-SEARCH-05. `/clubs/search` keyword 40자 초과 시 400 보장

현재 코드:

- `ClubRequestDTO.ClubSearchFilter` record compact constructor에서 keyword를 trim하고 40자 초과 시 `ClubManagementException(CLUB_SEARCH_KEYWORD_TOO_LONG)`을 throw합니다.
- 근거: `src/main/java/checkmo/clubManagement/web/dto/ClubRequestDTO.java` lines 82-109
- 해당 에러는 `HttpStatus.BAD_REQUEST`, code `CLUB_402`로 정의되어 있습니다.
- 근거: `src/main/java/checkmo/clubManagement/internal/excepetion/ClubManagementErrorStatus.java` lines 13-16
- `ExceptionAdvice`에는 `GeneralException` handler가 있습니다.
- 근거: `src/main/java/checkmo/common/apiPayload/exception/ExceptionAdvice.java` lines 105-110

문제:

- RN/QA 이력상 40자 초과 요청에서 400 대신 500(`COMMON_500`)이 관측됐습니다.
- 현재 코드 의도는 400이지만, `@ModelAttribute @ParameterObject` record 생성자에서 발생한 예외가 Spring binding 과정에서 다른 예외로 wrapping되면 공통 `Exception` handler로 빠질 가능성이 있습니다.

요청:

- `GET /api/v1/clubs/search?keyword=<41자>`에 대한 API 테스트를 추가해 400 + `CLUB_402` 또는 합의된 검증 에러 포맷을 보장해 주세요.
- record 생성자 throw 방식이 불안정하면 아래 중 하나로 정리해 주세요.
  - `keyword`에 Bean Validation `@Size(max = 40)`를 직접 적용하고 binding/validation 예외를 400으로 통일
  - `BindException`, `MethodArgumentTypeMismatchException` 등 query binding 예외를 `ExceptionAdvice`에서 400으로 처리
  - Controller 진입 후 명시적으로 검증해 `ClubManagementException`이 안정적으로 `GeneralException` handler를 타도록 변경

DoD:

- 40자 이하 keyword: 기존처럼 200
- 41자 이상 keyword: HTTP 400
- 응답 body에 사용자가 이해 가능한 메시지 포함
- Sentry/서버 로그에서 정상 검증 오류로 분류되고 5xx로 잡히지 않음

## P2. 날짜 포맷 문서/응답 정책

### BOOK-05. `date-time` 스키마와 실제 날짜 문자열 포맷 불일치

현재 코드에서 날짜 응답 포맷이 혼재합니다.

- 책이야기 목록/상세/댓글: `yyyy-MM-dd HH:mm`
  - `src/main/java/checkmo/bookStory/web/dto/BookStoryResponseDTO.java` lines 64-65, 88-89, 138-139
- 책이야기 관리자 목록: `yyyy.MM.dd`
  - `BookStoryResponseDTO.java` lines 125-126
- 소식 공개일: `yyyy-MM-dd`
  - `src/main/java/checkmo/news/web/dto/NewsResponseDTO.java` lines 57-58, 74-75
- 알림 생성일: `yyyy-MM-dd HH:mm`
  - `src/main/java/checkmo/notification/web/dto/NotificationResponseDTO.java` lines 51-52
- 공지/정기모임/책장/채팅 일부 `LocalDateTime` 필드는 별도 `@JsonFormat`이 없습니다.
  - 예: `ClubNoticeResponseDTO.java` lines 59, 95, 117-118, 158-159
  - 예: `MeetingResponseDTO.java` lines 40, 60
  - 예: `BookShelfResponseDTO.java` line 79
  - 예: `ChatResponseDTO.java` line 31

요청:

- BE 정책을 하나로 정해 주세요.
  - 옵션 A: RFC3339/ISO-8601 `date-time`으로 통일
  - 옵션 B: 현재 한국형 문자열 포맷을 유지하되 Swagger `@Schema(type = "string", example = "...", pattern = "...")`로 명확히 표기
- RN이 이미 받는 포맷이 있는 엔드포인트는 breaking change가 될 수 있으므로, 포맷 변경 시 앱 반영 일정과 함께 조정이 필요합니다.

DoD:

- Swagger의 date/date-time schema와 실제 JSON 문자열이 일치합니다.
- 같은 도메인 내 날짜 필드 포맷이 일관됩니다.
- RN에서 날짜 parsing fallback을 줄일 수 있습니다.

## P2. nullable 응답 스키마 명시

### BOOKS-04. `currentPage`, `nextCursor` nullable 문서 누락

현재 코드:

- `BookResponseDTO.BookList.currentPage`는 `Integer`라 null 가능입니다.
  - `src/main/java/checkmo/book/web/dto/BookResponseDTO.java` lines 30-35
- 추천 책 응답은 `currentPage(null)`로 생성합니다.
  - `src/main/java/checkmo/book/internal/service/BookRecommendationService.java` lines 110-114, 130-134, 169-174
- 빈/비정상 알라딘 응답도 `currentPage(null)`로 생성됩니다.
  - `src/main/java/checkmo/book/internal/converter/BookConverter.java` lines 115-121
- cursor pagination의 `nextCursor`는 다음 페이지가 없으면 null입니다.
  - `src/main/java/checkmo/common/template/CursorPagingHelper.java` lines 36-43
  - `src/main/java/checkmo/common/template/CursorResult.java` lines 12-16

영향 범위:

- 책 검색/추천: `currentPage`
- 책 좋아요 목록: `nextCursor`
- 공지 댓글, 책이야기, 신고, 책장, 채팅, 회원 팔로우, 모임 목록, 소식 등 cursor 기반 응답 대부분의 `nextCursor`

요청:

- nullable을 허용할 필드는 DTO에 `@Schema(nullable = true, description = "...")`를 추가해 주세요.
- 또는 서버 응답 정책을 바꿔 항상 숫자를 내려주는 방식으로 고정해 주세요. 다만 cursor 기반 API에서는 `nextCursor=null`이 자연스러운 종료 신호라 nullable 명시가 더 적합합니다.

DoD:

- `hasNext=false`인 마지막 페이지의 `nextCursor=null`이 Swagger에 표현됩니다.
- 추천 책의 `currentPage=null` 또는 대체값 정책이 Swagger와 일치합니다.
- RN 타입에서 불필요한 방어 로직을 줄일 수 있습니다.

## P2. 책 검색/추천 결과 없음 정책

### BOOKS-05. 404 문서와 200 빈 배열 응답 정책 불일치

현재 코드:

- `GET /api/v1/books/search` Swagger는 404 "책 정보를 찾을 수 없음"을 명시합니다.
  - `src/main/java/checkmo/book/web/controller/BookController.java` lines 36-45
- 검색 keyword가 비었으면 200 + 빈 목록을 반환합니다.
  - `src/main/java/checkmo/book/internal/service/query/AladinApiService.java` lines 40-43, 70-77
- 알라딘 검색 응답이 null/items null이면 200 + 빈 목록을 반환합니다.
  - `src/main/java/checkmo/book/internal/converter/BookConverter.java` lines 79-92, 111-121
- `GET /api/v1/books/recommend` Swagger도 404를 명시하지만, 추천 실패는 `ALADIN_API_ERROR` 계열로 처리됩니다.
  - Controller: `BookController.java` lines 69-75
  - Service: `BookRecommendationService.java` lines 39-57, 91-115

요청:

- 검색 결과 없음은 200 + 빈 배열 정책으로 문서화하는 것을 권장합니다.
- `GET /books/search`의 404는 실제 상세 조회(`/books/{isbn}`)와 구분해 제거하거나, 정확히 발생하는 조건이 있을 때만 유지해 주세요.
- 추천 API의 404도 실제 코드와 맞지 않으면 제거하고, 캐시/알라딘 실패 시 500 또는 서비스 오류 응답을 명시해 주세요.

DoD:

- 검색 결과 없음: Swagger와 실제 응답이 모두 200 + `detailInfoList: []`, `hasNext: false`로 일치
- 책 상세 ISBN 없음: 404 유지 가능
- 추천 실패: 실제 코드와 같은 에러 코드/상태코드로 문서화

## P2. 공개 조회 API 설명 정리

아래 API들은 비로그인도 조회 가능하지만, 로그인 사용자가 호출하면 `likedByMe`, `writtenByMe`, `follow` 등 개인화 필드가 달라질 수 있습니다.

- 책이야기 공개 조회: `GET /api/v1/book-stories`, `/book-stories/{bookStoryId}`, `/book-stories/members/{nickname}`, `/book-stories/search/{bookId}`
- 책 검색/추천/상세: `GET /api/v1/books/search`, `/books/recommend`, `/books/{isbn}`
- 다른 회원 좋아요 책 목록: `GET /api/v1/books/{memberNickname}/likes`
- 소식 공개 조회: `GET /api/v1/news`, `/news/{newsId}`

요청:

- Swagger 설명에 "비회원 가능"과 "로그인 시 개인화 필드 포함"을 분리해 적어 주세요.
- 공개 API의 `@CurrentId`는 필수 파라미터가 아니라 optional auth context임을 문서 설명에 반영해 주세요.

## 권장 처리 순서

1. `APP-VERSION-01`: iOS `store_url` 운영 데이터 수정
2. `MEET-SEARCH-05`: keyword 40자 초과 400 회귀 테스트 추가
3. 인증 필수 API의 401 Swagger 추가
4. 공개 API에서 잘못 남은 401 Swagger 제거
5. 날짜 포맷/nullable/결과 없음 정책 문서화

## 백엔드 완료 확인 체크리스트

- [ ] `GET /api/v1/app/version?platform=ios`의 `storeUrl`이 실제 App Store URL입니다.
- [ ] 인증 필수 API는 Swagger에 401이 있습니다.
- [ ] 공개 API는 Swagger에서 401이 제거되었거나 optional auth 정책이 설명되어 있습니다.
- [ ] `/api/v1/clubs/search?keyword=<41자>`가 400으로 고정됩니다.
- [ ] `nextCursor`, `currentPage` nullable 정책이 Swagger에 반영됩니다.
- [ ] 날짜 필드의 실제 JSON 포맷과 Swagger schema/example이 일치합니다.
- [ ] 책 검색 결과 없음 정책이 200 빈 배열 또는 404 중 하나로 고정되고 RN과 합의됩니다.
