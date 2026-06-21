# 관리자 회원 신고 목록 Backend 구현 계획

> 작성 기준일: 2026-06-21 KST
> 기준 코드: `reference_code/BE`의 `develop`
> 화면 의미: 관리자 회원 상세에서 **해당 회원이 제출한 신고**를 조회한다.

## 1. 목표

관리자가 회원 상세 화면의 `신고 목록` 탭에서 선택한 회원이 작성한 신고를 최신순으로 조회한다.

각 신고는 다음 정보를 제공한다.

- 신고 사유와 신고 내용
- 신고 대상 종류와 식별 정보
- 신고 대상을 설명할 표시 문구
- 현재 대상 페이지를 열 수 있는지 여부
- 열 수 있을 때 사용할 FE 상대 경로
- 신고 일시

삭제되었거나 현재 FE에서 이동할 수 없는 대상 때문에 목록 전체가 실패하면 안 된다. 이 경우 신고 이력은 유지하고 대상 링크만 비활성화한다.

## 2. 현재 코드 조사 결과

### 관리자 endpoint 부재

현재 `MemberAdminController`에는 회원 목록·상세 endpoint만 있고 FE가 호출 중인 아래 endpoint는 존재하지 않는다.

```text
GET /api/v1/admin/members/{nickname}/reports
```

따라서 현재 FE 신고 탭은 항상 404 또는 API 오류 상태가 된다.

### 미병합 구현의 문제

원격 `origin/feat/213/admin-report`의 커밋 `e3f6d1ea`에 같은 endpoint 구현이 있지만 `develop`에는 병합되지 않았다.

해당 구현은 다음 이유로 그대로 적용하지 않는다.

- `member` controller가 `report.internal`과 `report.web.dto`를 직접 import해 Modulith 경계를 위반한다.
- 선택 회원을 신고자로 조회하면서 응답 필드명을 `reportedMemberNickname`으로 제공한다.
- 실제 신고 대상 대신 신고자의 닉네임·프로필을 모든 행에 반복한다.
- pagination 없이 모든 신고를 한 번에 조회한다.
- 대상이 삭제된 경우를 구분하지 않는다.

### 현재 신고 데이터 특성

`report` 테이블은 `report_target_type`, `target_id`, `redirect_url`을 `NOT NULL`로 저장한다. 과거 `member_report` 데이터도 `V20260524__create_report.sql`에서 모두 `MEMBER` 대상으로 변환됐다.

따라서 DB 레코드 자체에는 대상 타입과 ID가 있다. 다만 다음 경우에는 실제로 열 수 있는 대상 페이지가 없을 수 있다.

- 신고 이후 대상 게시물·댓글·모임 항목이 삭제됨
- 저장된 redirect가 현재 FE route와 다름
- 발제·한줄평·채팅처럼 부모 모임/정기모임 context가 필요한 대상

`ReportResponseDTO.ReportInfo.targetSummary`는 선언돼 있지만 `ReportConverter`에서 값을 넣지 않아 현재 항상 null이다.

## 3. API 계약

### 요청

```http
GET /api/v1/admin/members/{nickname}/reports?cursorId={reportId}
Cookie: access token
```

- 관리자만 호출할 수 있다.
- `nickname`은 상세 화면에서 조회 중인 회원 닉네임이며 이 회원이 신고자다.
- `cursorId`는 선택값이고 최초 요청에서는 생략한다.
- page size는 기존 신고 목록과 동일하게 20으로 고정한다.

### 응답

```json
{
  "isSuccess": true,
  "code": "COMMON_200",
  "message": "성공입니다.",
  "result": {
    "reports": [
      {
        "reportId": 101,
        "reason": "ABUSE",
        "reasonDescription": "욕설/비방",
        "content": "반복적으로 비방성 댓글을 작성했습니다.",
        "targetType": "BOOK_STORY_COMMENT",
        "targetTypeDescription": "책 이야기 댓글",
        "targetId": "55",
        "targetLabel": "책 이야기 댓글 #55",
        "targetAvailable": true,
        "targetUrl": "/stories/12?commentId=55",
        "reportedAt": "2026-06-21T20:15:30"
      }
    ],
    "hasNext": false,
    "nextCursor": null
  }
}
```

대상을 찾지 못하면 신고 행은 유지하고 다음처럼 반환한다.

```json
{
  "targetType": "BOOK_STORY_COMMENT",
  "targetTypeDescription": "책 이야기 댓글",
  "targetId": "55",
  "targetLabel": "삭제되었거나 확인할 수 없는 대상",
  "targetAvailable": false,
  "targetUrl": null
}
```

`content`는 DB상 nullable이므로 null을 허용한다. FE는 null 또는 빈 문자열을 `입력된 신고 내용 없음`으로 표시한다.

## 4. 파일별 수정 계획

### 신규: `report/web/controller/ReportAdminController.java`

- report 모듈 안에 관리자 전용 controller를 신설한다.
- class mapping은 `/api/v1/admin/members`, method mapping은 `/{nickname}/reports`로 둔다.
- class에 `@PreAuthorize("hasRole('ADMIN')")`를 적용한다.
- `nickname`, optional `cursorId`를 받아 `ReportQueryService.retrieveMemberReportsForAdmin()`을 호출한다.
- Swagger에 200, 403, 404 응답과 cursor 의미를 명시한다.

URL이 회원 하위에 있더라도 구현 책임은 report 모듈에 둔다. `MemberAdminController`에서 report 내부 클래스를 import하지 않는다.

### `report/web/dto/ReportResponseDTO.java`

`AdminMemberReportInfo`와 `AdminMemberReportList`를 추가한다.

```java
AdminMemberReportInfo
- Long reportId
- String reason
- String reasonDescription
- String content
- String targetType
- String targetTypeDescription
- String targetId
- String targetLabel
- boolean targetAvailable
- String targetUrl       // nullable
- LocalDateTime reportedAt

AdminMemberReportList
- List<AdminMemberReportInfo> reports
- boolean hasNext
- Long nextCursor        // nullable
```

기존 사용자용 `ReportInfo`, `MyReportList` 계약은 변경하지 않는다.

### `report/internal/repository/ReportRepositoryCustom.java`

관리자 조회용 메서드를 추가한다.

```java
List<Report> findReportsByReporterId(
    String reporterId,
    Long cursorId,
    int pageSize
);
```

### `report/internal/repository/ReportRepositoryCustomImpl.java`

- `report.reporterId.eq(reporterId)`로 선택 회원이 작성한 신고만 조회한다.
- `cursorId`가 있으면 `report.id.lt(cursorId)`를 적용한다.
- `report.id.desc()` 최신순으로 정렬한다.
- `CursorPagingHelper`가 `hasNext`를 판단할 수 있도록 전달받은 size만큼 제한한다.
- 별도의 member join을 추가하지 않는다. 닉네임은 service에서 member ID로 한 번 변환한다.

### `report/internal/service/query/ReportQueryService.java`

`retrieveMemberReportsForAdmin(String nickname, Long cursorId)`를 추가한다.

처리 순서:

1. `memberAPI.fetchMemberId(nickname)`으로 신고자 ID를 구하고 존재하지 않는 회원이면 404를 유지한다.
2. repository와 `CursorPagingHelper`로 20개 cursor page를 조회한다.
3. 각 report의 대상 타입·ID를 이용해 대상 존재 여부와 이동 context를 조회한다.
4. 대상이 존재하면 현재 FE route에 맞는 `targetUrl`과 `targetLabel`을 만든다.
5. 대상 조회가 404면 해당 행만 `targetAvailable=false`, `targetUrl=null`로 변환한다.
6. 5xx 또는 예상하지 못한 예외는 대상 없음으로 숨기지 않고 요청 전체 오류로 전달한다.

대상 없음 처리는 `GeneralException`의 HTTP status가 `NOT_FOUND`인 경우와 잘못된 과거 숫자 ID에 한정한다. 광범위한 `RuntimeException` catch는 사용하지 않는다.

### `report/internal/converter/ReportConverter.java`

- entity, 안전하게 해석한 target 정보로 `AdminMemberReportInfo`를 생성하는 converter를 추가한다.
- `reason`에는 enum name, `reasonDescription`에는 사용자 표시 문구를 넣는다.
- target 조회 실패 시에도 entity의 `targetType`, `targetId`, 신고 내용과 신고 일시는 보존한다.
- 기존 `toReportInfo()`에는 누락된 `targetSummary` 값을 넣어 사용자 신고 목록의 null 필드도 함께 바로잡는다.

### `report/internal/entity/ReportTargetType.java`

신규 신고에 저장되는 redirect가 현재 FE route와 일치하도록 다음 경로를 수정한다.

| 타입 | target URL |
|---|---|
| `MEMBER` | `/profile/{nickname}` |
| `CLUB` | `/groups/{clubId}` |
| `BOOK_STORY` | `/stories/{bookStoryId}` |
| `BOOK_STORY_COMMENT` | `/stories/{bookStoryId}?commentId={commentId}` |
| `CLUB_NOTICE` | `/groups/{clubId}/notice/{noticeId}` |
| `CLUB_NOTICE_COMMENT` | `/groups/{clubId}/notice/{noticeId}?commentId={commentId}` |
| `CLUB_TOPIC` | `/groups/{clubId}/bookcase/{meetingId}?tab=topic&topicId={topicId}` |
| `CLUB_BOOK_REVIEW` | `/groups/{clubId}/bookcase/{meetingId}?tab=review&reviewId={reviewId}` |
| `CHAT` | `/groups/{clubId}/bookcase/{meetingId}/meeting?teamId={teamId}&messageId={messageId}` |

현재 `notices`, `/topics`, `/reviews`, `/chat` redirect는 실제 FE page route와 일치하지 않는다.

### `report/internal/service/command/ReportCommandService.java`

- `CLUB_TOPIC`, `CLUB_BOOK_REVIEW` redirect 생성 시 기존 외부 DTO에 이미 있는 `meetingId`를 context에 추가한다.
- `CHAT`은 `meetingId`, `teamId`를 context에 추가한다.
- notice 경로는 `ReportTargetType`의 수정된 singular `/notice` 규칙을 사용한다.
- 생성 시 대상 검증 로직과 자기 자신 신고 방지 로직은 유지한다.

### 신규 migration: `db/migration/V...__normalize_report_redirect_urls.sql`

기존 report의 저장 URL도 가능한 범위에서 현재 FE route로 보정한다.

- notice와 notice comment의 `/notices/`를 `/notice/`로 변경한다.
- `topic`과 `meeting`을 join해 발제 URL에 `meeting_id`를 넣는다.
- `book_review`와 `meeting`을 join해 한줄평 URL에 `meeting_id`를 넣는다.
- `team_chat_message`를 join해 채팅 URL에 `meeting_id`, `team_id`를 넣는다.
- 대상 row가 이미 삭제되어 join되지 않는 report는 변경하지 않는다. 관리자 응답에서는 안전 resolver가 링크를 null로 반환한다.

마이그레이션 이름은 구현 시점의 가장 최신 Flyway 버전 다음 번호를 사용한다.

### `src/test/java/checkmo/admin/AdminApiTest.java`

다음 통합 테스트를 추가한다.

- 관리자가 특정 회원이 작성한 신고만 최신순으로 조회한다.
- 다른 회원이 작성한 신고는 결과에 포함되지 않는다.
- 일반 사용자는 403, 비로그인은 401을 받는다.
- 없는 회원 닉네임은 404를 받는다.
- cursor 다음 페이지가 중복 없이 이어진다.
- 대상이 존재하면 `targetAvailable=true`와 FE 상대 경로를 반환한다.
- 대상 삭제 후에도 신고 행은 남고 `targetAvailable=false`, `targetUrl=null`이 된다.
- `content=null`인 신고도 200 응답에 포함된다.

### `src/test/java/checkmo/book/BookStoryNewsReportNotificationImageApiTest.java`

- 신규 신고 생성 시 target type별 redirect context가 올바르게 저장되는지 보강한다.
- 기존 `/api/v1/reports/me` 계약이 유지되는지 회귀 테스트한다.
- `targetSummary`가 더 이상 null로 반환되지 않는지 확인한다.

## 5. 구현 순서

1. DTO와 repository cursor 조회를 추가한다.
2. 안전 target resolver와 converter를 추가한다.
3. report 모듈에 관리자 controller를 추가한다.
4. redirect 생성 규칙과 command context를 수정한다.
5. 기존 redirect 보정 migration을 추가한다.
6. 관리자 API와 report 회귀 테스트를 실행한다.
7. BE를 먼저 배포하고 운영 Swagger에서 endpoint 응답을 확인한다.

## 6. 완료 기준

- `GET /api/v1/admin/members/{nickname}/reports`가 관리자에게 200을 반환한다.
- 선택 회원이 작성한 신고만 조회된다.
- 신고 내용, 대상 설명, 신고 일시가 FE 요구 형태로 제공된다.
- 삭제되거나 열 수 없는 대상 하나 때문에 목록 전체가 실패하지 않는다.
- 열 수 있는 대상만 올바른 FE 상대 URL을 제공한다.
- Modulith 검증과 전체 API 테스트가 통과한다.

검증 명령:

```bash
./gradlew test --tests checkmo.admin.AdminApiTest
./gradlew test --tests checkmo.book.BookStoryNewsReportNotificationImageApiTest
./gradlew test --tests checkmo.CheckmoApplicationTests
./gradlew test
```

