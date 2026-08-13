# 책이야기 좋아요 회원 목록 구현 계획

> 작성일: 2026-07-23
> 범위: `checkmo_rn` 모바일 앱 + `ref_code/BE` 백엔드 참고 구현
> 목표: 책이야기의 좋아요 영역을 길게 누르면 해당 책이야기를 좋아요한 회원 목록을 확인할 수 있게 한다.

## 1. 결론

구현 가능하다. 현재 백엔드에는 `book_story_liked` 관계와 좋아요 토글 API가 이미 있으므로 DB 테이블 추가나 마이그레이션은 필요하지 않다. 다만 특정 책이야기를 좋아요한 회원을 조회하는 GET API가 없기 때문에 백엔드 API 추가가 선행되어야 한다.

권장 사용자 동작은 다음과 같다.

- 좋아요 영역을 짧게 누름: 현재와 동일하게 좋아요/취소
- 좋아요 영역을 길게 누름: 좋아요한 회원 목록 바텀시트 열기
- 목록의 회원을 누름: 해당 회원 프로필로 이동
- 좋아요가 없을 때: 빈 목록 안내 표시

## 2. 현재 구조 확인

### 백엔드

- `BookStoryController`에 `POST /api/v1/book-stories/{bookStoryId}/like` 토글 API가 있다.
- `BookStoryLiked`는 `memberId`와 `BookStory`를 보유하며 `(member_id, book_story_id)` 유니크 제약이 있다.
- `BookStoryLikedRepository`에는 내 좋아요 여부 확인과 책이야기 삭제 시 관계 삭제 기능만 있고, 좋아요 회원 목록 조회 기능은 없다.
- `BookStory`의 `likes` 필드가 총 좋아요 수를 관리한다.
- `MemberAPI`에 회원 기본 정보 및 팔로우 상태의 배치 조회 기능이 이미 있다.
- 목록 API는 보통 `CursorPagingHelper`를 사용하고 `hasNext`, `nextCursor`를 반환한다.

### 모바일 앱

- `src/services/api/bookStoryApi.ts`에는 좋아요 토글 함수만 있고 회원 목록 조회 함수는 없다.
- `BookStoryCard`, `BookStoryFeedCard`의 좋아요 영역은 현재 `Pressable.onPress`로 토글한다.
- 홈의 `HomePostCard`, 책이야기 화면, 검색 헤더의 책이야기 목록까지 공통 카드 계층을 통해 좋아요 동작이 연결되어 있다.

## 3. 권장 API 계약

### 요청

```http
GET /api/v1/book-stories/{bookStoryId}/likes?cursorId={lastLikeId}
```

- 인증: 필요
- 정렬: 최근 좋아요 순 (`book_story_liked.id DESC`)
- 페이지 크기: 기존 책이야기/팔로우 목록과 동일하게 서버 기본값 10개 사용
- 커서: 회원 ID가 아니라 `book_story_liked.id` 사용
  - 한 회원은 책이야기 하나에 좋아요 관계가 하나뿐이므로 안정적으로 페이징할 수 있다.
  - 첫 요청에서는 `cursorId`를 생략한다.

### 성공 응답 예시

```json
{
  "isSuccess": true,
  "code": "COMMON200",
  "message": "성공입니다.",
  "result": {
    "likeMembers": [
      {
        "nickname": "reader01",
        "profileImageUrl": "https://example.com/profile.jpg",
        "following": true
      }
    ],
    "totalCount": 12,
    "hasNext": true,
    "nextCursor": 321,
    "pageSize": 10
  }
}
```

### 응답 필드

| 필드 | 설명 |
| --- | --- |
| `likeMembers` | 좋아요 회원 요약 목록 |
| `nickname` | 프로필 이동에 사용할 공개 식별자 |
| `profileImageUrl` | 프로필 이미지, 없으면 `null` |
| `following` | 현재 로그인 회원 기준 팔로우 여부 |
| `totalCount` | 책이야기의 전체 좋아요 수 |
| `hasNext` | 다음 페이지 존재 여부 |
| `nextCursor` | 다음 요청에 전달할 좋아요 관계 ID |
| `pageSize` | 서버가 적용한 페이지 크기 |

### 오류 정책

| HTTP 상태 | 조건 | 앱 처리 |
| --- | --- | --- |
| `401` | 비로그인 또는 만료된 인증 | 공통 로그인/세션 만료 처리 |
| `404` | 책이야기 없음, 삭제됨, 또는 공개되지 않은 초안 | 시트를 닫고 “책이야기를 찾을 수 없습니다” 안내 |
| `403` | 차단 관계 등 조회 정책상 접근 불가 | 시트를 닫고 접근 불가 안내 |

## 4. 백엔드 구현 계획

### 4.1 DTO 추가

`BookStoryResponseDTO`에 다음 응답 모델을 추가한다.

- `LikeMemberList`
  - `List<MemberExternalDTO.BasicInfoWithFollow> likeMembers`
  - `int totalCount`
  - `boolean hasNext`
  - `Long nextCursor`
  - `int pageSize`

회원 정보는 기존 `MemberExternalDTO.BasicInfoWithFollow`를 재사용한다. 별도 회원 상세 정보나 내부 `memberId`는 노출하지 않는다.

### 4.2 저장소 조회 추가

`BookStoryLikedRepository`에 아래 조건의 조회를 추가한다.

- 대상 책이야기 ID 일치
- 커서가 있으면 `BookStoryLiked.id < cursorId`
- 조회자와 차단 관계인 회원 ID 제외
- `BookStoryLiked.id DESC`
- 페이지 크기보다 1개 더 조회해 `hasNext` 계산

빈 차단 목록을 `NOT IN`에 그대로 전달하면 JPQL/DB별 문제가 생길 수 있으므로, 빈 목록일 때는 제외 조건 없는 조회 메서드를 사용하거나 QueryDSL 조건을 동적으로 생략한다.

### 4.3 조회 서비스와 파사드 추가

`BookStoryQueryService`에 좋아요 관계 페이지 조회 메서드를 추가한다. `BookStoryQueryFacade`에서는 다음 순서로 조합한다.

1. 책이야기가 존재하고 공개 상태인지 확인한다.
2. 조회자와 작성자 사이의 프로필 접근 가능 여부를 검증한다.
3. `memberAPI.fetchBlockRelatedMemberIds(memberId)`로 조회자와 차단 관계인 회원을 구한다.
4. `CursorPagingHelper`로 좋아요 관계를 커서 페이징한다.
5. 현재 페이지의 `memberId`들을 추출한다.
6. `memberAPI.fetchMemberBasicInfoWithFollowByMemberId(...)`로 프로필과 팔로우 상태를 한 번에 배치 조회한다.
7. Map을 바로 순회하지 말고 좋아요 관계 목록 순서대로 DTO를 재조립해 최신순을 보존한다.
8. `BookStory.likes`를 `totalCount`로 함께 반환한다.

이 방식이면 페이지당 회원별 개별 조회를 피할 수 있다.

### 4.4 컨트롤러 추가

`BookStoryController`에 다음 메서드를 추가한다.

```java
@GetMapping("/{bookStoryId}/likes")
public ApiResponse<BookStoryResponseDTO.LikeMemberList> getBookStoryLikeMembers(
        @CurrentId Long memberId,
        @PathVariable Long bookStoryId,
        @RequestParam(required = false) Long cursorId
)
```

Swagger 설명과 `200`, `401`, `403`, `404` 응답 문서도 함께 추가한다.

### 4.5 차단·탈퇴 회원 정책

권장 기본 정책은 다음과 같다.

- 조회자와 어느 방향으로든 차단 관계인 회원은 목록에서 제외한다.
- 조회자와 책이야기 작성자가 차단 관계이면 목록 API 자체를 거부한다.
- 비활성/탈퇴 회원 관계가 DB에 남아 있으면 기존 `MemberAPI` 정책대로 `탈퇴한 회원`, 이미지 없음, `following=false`로 표시하고 프로필 이동은 막는다.
- 차단 회원을 제외하더라도 `totalCount`는 책이야기의 전체 좋아요 수를 유지한다. 따라서 보이는 행 수와 총 좋아요 수가 다를 수 있다.

탈퇴 회원을 목록에서 완전히 제외하려면 제품 정책을 별도로 확정해야 한다. 제외할 경우 커서 페이지의 실제 표시 개수가 부족해지지 않도록 저장소 조회 단계에서 활성 회원 조건을 적용하는 편이 안전하다.

## 5. 모바일 앱 구현 계획

### 5.1 API 모델과 함수

`src/services/api/bookStoryApi.ts`에 다음을 추가한다.

- `BookStoryLikeMember`
  - `nickname`
  - `profileImageUrl`
  - `following`
- `BookStoryLikeMemberPage`
  - `likeMembers`
  - `totalCount`
  - `hasNext`
  - `nextCursor`
  - `pageSize`
- `fetchBookStoryLikeMembers(bookStoryId, cursorId?)`

기존 API 파서 방식에 맞춰 누락/비정상 필드를 안전하게 정규화한다.

### 5.2 공통 목록 UI

재사용 가능한 `BookStoryLikeMembersSheet`를 만든다.

- 제목: `좋아요 {totalCount}`
- 회원 행: 프로필 이미지, 닉네임, 필요 시 팔로우 상태
- 회원 행 선택: `UserProfileScreen`으로 이동
- 최초 로딩: 스켈레톤 또는 로딩 인디케이터
- 빈 상태: `아직 좋아요한 회원이 없습니다.`
- 오류 상태: 오류 문구와 재시도 버튼
- 목록 끝 도달: `nextCursor`로 추가 조회
- 중복 요청 방지: `loadingMore` 중에는 다음 페이지 요청 차단
- 시트를 닫거나 대상 책이야기가 바뀌면 이전 요청 결과를 초기화

별도 바텀시트 라이브러리를 새로 추가하기보다 현재 앱에서 사용하는 React Native `Modal` 패턴을 우선 재사용한다. 이후 공통 바텀시트 기반이 생기면 교체할 수 있다.

### 5.3 길게 누르기 연결

좋아요 `Pressable`에 다음 계약을 추가한다.

- `onPress`: 기존 좋아요 토글
- `onLongPress`: 좋아요 회원 목록 열기
- `delayLongPress`: 450~500ms
- 카드 전체 선택 이벤트가 실행되지 않도록 이벤트 전파 차단

일부 플랫폼/React Native 버전에서 긴 누르기 후 `onPress`가 함께 실행되는지 실기기에서 확인한다. 함께 실행되면 `useRef` 플래그로 긴 누르기 직후의 `onPress` 한 번을 무시해 의도치 않은 좋아요 토글을 막는다.

다음 컴포넌트 경로에 콜백을 전달한다.

- `BookStoryCard`
- `BookStoryFeedCard`
- `HomePostCard` → `HomeScreen`
- `StoryScreen`의 목록/상세 표시 영역
- `AppHeader`의 도서 검색 결과 내 책이야기 영역

각 화면에 목록 시트를 중복 구현하지 않고, 공통 훅 또는 컨트롤러에서 `bookStoryId`, 표시 여부, 첫 페이지/추가 페이지 상태를 관리한다.

### 5.4 접근성과 다국어

- 접근성 라벨에 현재 좋아요 수와 “길게 눌러 회원 목록 보기” 힌트를 제공한다.
- 한국어 신규 문구를 `src/i18n/translations.ts`에 추가하고 영어 번역도 함께 넣는다.
- 긴 누르기 성공 시 가벼운 햅틱 피드백은 선택 사항으로 둔다. 새 의존성이 필요하면 이번 범위에서는 생략한다.

## 6. 구현 순서

1. 백엔드 API 계약 확정
2. 백엔드 저장소/서비스/DTO/컨트롤러 구현
3. 백엔드 통합 테스트 및 Swagger 반영
4. 백엔드 배포 후 실제 응답 확인
5. 모바일 API 타입/파서/조회 함수 구현
6. 공통 좋아요 회원 목록 시트 구현
7. 모든 책이야기 카드의 긴 누르기 연결
8. i18n, 접근성, 오류/빈 상태 처리
9. 정적 검사 및 iOS/Android 실기기 또는 시뮬레이터 검증

백엔드 배포 전 앱이 새 API를 호출하면 항상 실패하므로 배포 순서는 반드시 BE → 앱 순서로 한다.

## 7. 검증 계획

### 백엔드 자동 테스트

- 좋아요 회원이 없는 책이야기: 빈 목록, `hasNext=false`
- 좋아요 회원이 1명/여러 명인 경우: 최신 좋아요 순서 확인
- 10개 초과: 첫 페이지와 다음 커서 페이지가 중복/누락 없이 연결됨
- 동일 회원은 한 번만 반환됨
- `following`이 현재 조회자 기준으로 정확함
- 차단 관계 회원이 목록에서 제외됨
- 책이야기 작성자와 조회자의 차단 관계에 따른 접근 거부
- 삭제된 책이야기와 다른 사용자의 초안은 `404`
- 비로그인 요청은 `401`
- 탈퇴 회원 표시 정책 확인
- 회원 정보가 배치 조회되어 N+1 쿼리가 발생하지 않는지 확인

기존 `BookStoryNewsReportNotificationImageApiTest`의 책이야기 CRUD/좋아요 시나리오에 목록 조회 성공 및 실패 케이스를 추가하고 API 테스트 커버리지 문서도 갱신한다.

### 모바일 검증

- 짧게 누르면 기존처럼 좋아요 수와 아이콘이 즉시 변경됨
- 길게 누르면 좋아요 상태가 바뀌지 않고 목록만 열림
- 카드 본문 화면 이동이 긴 누르기와 동시에 발생하지 않음
- 홈, 책이야기 목록/상세, 도서 검색 결과에서 동일하게 동작함
- 빈 상태, 네트워크 오류, 재시도, 추가 페이지 로딩 확인
- 회원 선택 시 올바른 프로필로 이동
- 탈퇴 회원 행은 프로필 이동이 비활성화됨
- 시트 닫기, Android 뒤로 가기, iOS 스와이프/바깥 영역 닫기 확인
- 빠르게 여러 번 열거나 스크롤해도 요청과 행이 중복되지 않음
- `npm run check` 통과

## 8. 완료 기준

- 새 좋아요 회원 목록 API가 Swagger와 백엔드 통합 테스트에 반영되어 있다.
- 좋아요 수가 0명부터 여러 페이지인 경우까지 안정적으로 조회된다.
- 차단 및 탈퇴 회원 정책이 API와 앱에서 일관되게 적용된다.
- 앱의 모든 책이야기 좋아요 영역에서 짧게 누르기와 길게 누르기가 충돌하지 않는다.
- 목록의 로딩, 빈 상태, 오류, 추가 페이지, 프로필 이동이 동작한다.
- iOS와 Android에서 직접 제스처 검증을 완료하고 정적 검사를 통과한다.

## 9. 구현 전 확정할 제품 정책

아래는 구현을 막지는 않으며, 별도 지시가 없으면 권장 기본값으로 진행한다.

| 항목 | 권장 기본값 |
| --- | --- |
| 목록 조회 인증 | 로그인 필요 |
| 정렬 | 최근 좋아요 순 |
| 페이지 크기 | 10명 |
| 차단 관계 회원 | 목록에서 제외 |
| 탈퇴 회원 | `탈퇴한 회원`으로 표시, 프로필 이동 차단 |
| 짧게 누르기 | 좋아요 토글 유지 |
| 길게 누르기 | 회원 목록 열기 |
| 좋아요 0개 | 빈 목록 시트 표시 |
