# 사용자 입력 글자수/저장 한계 전수 감사

작성일: 2026-06-27  
범위: RN 앱 코드, 참조 BE 코드(`ref_code/BE`), 참조 WEB 코드(`ref_code/FE`)  
주의: DB 한계는 실제 운영 DB 직접 조회가 아니라 BE Flyway migration 파일 기준이다.

## 결론

- Spring/JPA에서 `String` 필드에 `@Column(length = N)` 또는 `columnDefinition`을 명시하지 않으면 Hibernate 기본 DDL은 보통 `VARCHAR(255)`가 된다.
- 이 레포의 BE migration에도 기본 문자열 컬럼이 다수 `VARCHAR(255)`로 생성되어 있다.
- 가장 심각한 현재 이슈는 **API DTO/RN/WEB 안내는 500 또는 300인데 DB가 255인 필드**다.
- “한글이라서 2자/3자로 세는 문제”가 아니라, 실제 저장 컬럼 길이가 255인 문제가 우선이다. 영어도 256자 이상이면 같은 방식으로 실패할 수 있다.
- RN과 WEB은 같은 API를 쓰지만 제한 구현이 서로 다르다. RN에서 막히지 않는 입력, WEB에서만 더 짧게 막는 입력, 양쪽 모두 제한이 없는 입력이 섞여 있다.
- 이 문서는 심사 이후 DB/DTO/RN/WEB을 장기적으로 동기화할 때 사용할 수정 후보 정리다.

## 우선순위

| 우선순위 | 항목 | 현재 증상 | 권장 |
| --- | --- | --- | --- |
| P0 | 모임 소개글 `club.description` | BE DTO/RN은 500, DB는 `VARCHAR(255)`. 256자 이상 저장 실패 가능. | UX 500 유지 시 BE entity `@Column(length = 500)` + DB migration `VARCHAR(500)`. 아니면 BE/RN/WEB 모두 255로 낮춤. |
| P0 | 모임 가입 메시지 `club_member.join_message` | BE DTO/RN/WEB은 300, DB는 `VARCHAR(255)`. 256~300 실패 가능. | UX 300 유지 시 entity + DB를 300으로 확장. 아니면 모든 클라이언트/DTO를 255로 낮춤. |
| P0 | 책이야기 댓글 `comment.content` | BE DTO `@Size` 없음, RN/WEB 제한 없음, DB는 `VARCHAR(255)`. 256자 이상 저장 실패 가능. | 정책 결정 필요. 255로 명시하거나, 댓글을 300/500으로 늘리고 DB migration. |
| P1 | 공지사항 댓글 | DB/entity/RN은 300, BE DTO에는 `@Size(max=300)` 없음, WEB 제한 없음. | BE DTO와 WEB에 300자 제한 추가. |
| P1 | 채팅 메시지 | BE STOMP DTO는 400, WEB submit guard 400, RN 제한 없음. DB는 `TEXT`. | RN 입력/submit에 400자 제한 추가. |
| P1 | 책이야기 본문 | RN은 5000, WEB placeholder는 5000이지만 실제 제한 없음, BE DTO `@Size` 없음, DB는 `TEXT`. | 제품 기준 5000을 BE DTO/WEB에도 명시. |
| P1 | 책이야기 제목 | RN은 100, WEB 제한 없음, BE DTO `@Size` 없음, DB는 `VARCHAR(255)`. | 제품 기준 100 또는 255 결정 후 BE/WEB 동기화. |
| P1 | 웹 모임 생성/수정 | “500자 제한”, “40자 제한” 안내만 있고 실제 `maxLength`가 없는 필드 있음. | WEB에도 `maxLength`/submit guard 추가. |
| P2 | 신고 내용 | BE/RN은 500, WEB은 400으로 더 짧게 제한. | 400 유지 의도인지 확인. 아니면 WEB을 500으로 맞춤. |
| P2 | 이미지 URL류 | 일부 DB 255, 일부 500. 업로드 URL이 길어지면 저장 실패 가능. | S3 응답 URL 길이 기준 확정 후 DTO/DB/RN/WEB 동기화. |

## BE 저장 한계 참고

| 테이블.컬럼 | migration 기준 | entity 기준 | 비고 |
| --- | ---: | --- | --- |
| `club.description` | `VARCHAR(255)` | `private String description` | DTO 500과 불일치. |
| `club_member.join_message` | `VARCHAR(255)` | `private String joinMessage` | DTO 300과 불일치. |
| `comment.content` | `VARCHAR(255)` | `private String content` | DTO 제한 없음. |
| `notice_comment.content` | `VARCHAR(300)` | `@Column(length = 300, nullable = false)` | DTO 제한 없음. |
| `book_review.description` | 초기 255, migration 후 `VARCHAR(300) NOT NULL` | `private String description` | DTO 300과 DB는 일치, entity length 명시는 없음. |
| `topic.description` | 초기 255, migration 후 `VARCHAR(300) NOT NULL` | `private String description` | DTO 300과 DB는 일치, entity length 명시는 없음. |
| `notice.content` | `VARCHAR(1000)` | `@Column(length = 1000)` | DTO/RN 1000과 일치. |
| `book_story.description` | `TEXT` | `@Column(columnDefinition = "TEXT")` | RN 5000은 DB 저장 가능 범위 내로 보임. |
| `team_chat_message.content` | `TEXT` | `@Column(columnDefinition = "TEXT")` | BE DTO 400이 실질 제한. |
| `report.content` | `VARCHAR(500)` | `@Column(length = 500)` | BE/RN 500과 일치. |
| `member.description` | migration 후 `VARCHAR(40)` | `@Column(length = 40)` | BE/RN 40과 일치. |

## 전수 감사 표

### 계정/프로필

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 이메일 회원가입 `email` | `@NotBlank`, `@Email`, 길이 제한 없음 | `auth_user.email VARCHAR(255)` | 명시 max 확인 못함 | 명시 max 확인 못함 | P2. 이메일은 255를 넘기기 드물지만 DTO에 `@Size(max=255)` 추가 권장. |
| 비밀번호 `password` | `@Size(min=6,max=24)`, 패턴 | `auth_user.password VARCHAR(255)` | `maxLength={24}` | password constants 6~24 | 정상. |
| 닉네임 `nickname` | `@Size(max=20)`, 영어 소문자/숫자/특수문자 패턴 | `member.nick_name VARCHAR(20)`, `auth_user.nick_name VARCHAR(20)` | `INPUT_LIMITS.NICKNAME=20`, 필터/중복확인 | `slice(0,20)` | 정상. |
| 이름 `name` | `@Size(max=10)` | `member.name VARCHAR(10)` | `INPUT_LIMITS.USER_NAME=10` | `slice(0,10)` | 정상. |
| 전화번호 `phoneNumber` | 정규식, 길이 제한 없음 | `member.phone_number VARCHAR(255)` | 형식 입력 | `maxLength=13` 또는 formatter | 정상 범위. DTO `@Size(max=13)` 추가 가능. |
| 프로필 소개 `description` | `@Size(max=40)` | `member.description VARCHAR(40)` | `INPUT_LIMITS.USER_DESCRIPTION=40` | 회원가입 40, 프로필 편집은 `maxLength=20` + 저장 시 `intro.slice(0,20)` | P2. WEB 프로필 편집만 20자로 더 짧게 막음. 의도 확인 필요. |
| 프로필 이미지 URL `imgUrl` | 제한 없음 | `member.img_url VARCHAR(255)` | 업로드 URL 전송, 명시 길이 guard 없음 | 업로드 URL 전송, 명시 길이 guard 없음 | P2. S3 URL이 255 초과 가능하면 DTO/DB 확장 또는 URL 정책 필요. |

### 모임 생성/수정/검색/가입

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 모임 검색 키워드 | record 생성자에서 40자 초과 예외 | 저장 없음 | `MEETING_SEARCH_KEYWORD_MAX_LENGTH=CLUB_NAME=40` | 관리자 목록 검색은 `slice(0,40)` 확인 | 정상. |
| 모임 이름 `club.name` | `@NotBlank`, `@Size(min=1,max=40)` | `club.name VARCHAR(255)` | `INPUT_LIMITS.CLUB_NAME=40` | 생성/수정 입력에 `maxLength` 없음, 중복확인만 있음 | P1. WEB에 40자 제한 추가 권장. DB는 여유 있음. |
| 모임 소개글 `club.description` | `@NotBlank`, `@Size(max=500)` | `club.description VARCHAR(255)` | `INPUT_LIMITS.CLUB_DESCRIPTION=500`, 생성/수정 maxLength 500 | 생성/수정 placeholder는 500, 실제 `maxLength` 없음 | P0. DTO/RN/WEB 안내와 DB 불일치. 500 유지 시 DB migration 필수. |
| 모임 프로필 이미지 URL | `@Size(max=255)` | `club.profile_img_url VARCHAR(255)` | 저장 전 255 guard 필요 | 업로드 URL 전송, 별도 길이 guard 확인 못함 | P2. S3 URL 길이 정책 필요. |
| 활동 지역 `club.region` | `@NotBlank`, `@Size(max=40)` | `club.region VARCHAR(255)` | `INPUT_LIMITS.CLUB_REGION=40` | placeholder는 40, 실제 `maxLength` 없음 | P1. WEB에 40자 제한 추가 권장. |
| 카테고리 `category` | `@Size(min=1,max=6)` | element collection `category VARCHAR(50)` | 6개 제한 | 6개 제한 | 정상. |
| 대상 `participantTypes` | `@Size(min=1,max=6)` | element collection `participant_type VARCHAR(50)` | 선택지가 6개라 실질 최대 6개 | 6개 제한 | 정상. |
| 문의 링크 URL `links[].link` | `@NotBlank`, `@Size(max=100)` | `club_contacts.link VARCHAR(100)` | 생성/수정 100 제한, 빈 링크 필터 | 생성/수정 `maxLength=100` | 정상. |
| 문의 링크 라벨 `links[].label` | `@Size(max=20)` | `club_contacts.label VARCHAR(20)` | 생성 20 제한, 수정은 기존 링크 보존/검증 | 생성/수정 `maxLength=20` | 정상. |
| 문의 링크 개수 | `@Size(max=4)` | 저장 row 수 | RN 생성은 `.slice(0,4)`, 수정 guard 있음 | WEB 생성/수정은 추가 버튼 개수 제한 없음 | P1. WEB에 4개 제한 추가 필요. |
| 가입 메시지 `joinMessage` | `@NotNull`, `@Size(max=300)` | `club_member.join_message VARCHAR(255)` | `INPUT_LIMITS.APPLY_REASON=300` | 모달 `maxLength=300` 또는 `slice(0,300)` | P0. 256~300자 저장 실패 가능. DB 300 확장 또는 전체 255로 하향 필요. |

### 책이야기

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 책이야기 ISBN | `@Pattern(13 digits)` | `book_story.book_id VARCHAR(255)` | 책 선택 기반 | 책 선택 기반 | 정상. |
| 책이야기 제목 `title` | `@NotBlank`, 길이 제한 없음 | `book_story.title VARCHAR(255)` | `INPUT_LIMITS.BOOK_STORY_TITLE=100` | 생성 입력 `maxLength` 없음, 수정은 제목 읽기 전용 | P1. 제품 기준 100이면 BE/WEB에 100 추가. 255까지 허용할 거면 RN 상향. |
| 책이야기 본문 `description` | 길이 제한 없음 | `book_story.description TEXT` | `INPUT_LIMITS.BOOK_STORY_CONTENT=5000` | placeholder는 5000, 생성/수정 모두 실제 제한 없음 | P1. 5000 정책이면 BE DTO `@Size(max=5000)` + WEB `maxLength=5000` 추가. |
| 책이야기 임시저장 본문 | 동일 | 동일 | RN 5000 | WEB 제한 없음 | P1. 발행/임시저장 모두 같은 제한 필요. |
| 책이야기 댓글 `comment.content` | `@NotBlank`, 길이 제한 없음 | `comment.content VARCHAR(255)` | 댓글/대댓글 입력 `maxLength` 없음 | `CommentInput`, `CommentEditForm` 제한 없음 | P0. 256자 이상 저장 실패 가능. 제품 기준 결정 필요. |
| 책이야기 대댓글 | 댓글과 동일 | 댓글과 동일 | 제한 없음 | 제한 없음 | P0. 댓글과 같이 처리 필요. |

### 책장/정기모임/발제/한줄평

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 책장 생성/수정 정기모임 이름 `meeting.title` | `@Size(max=12)`, 필수 아님 | `meeting.title VARCHAR(255)` | 12자 제한, 선택 필드로 안내 수정됨 | 생성/수정은 필수처럼 `canSubmit`에 포함, `maxLength` 없음 | P1. WEB/RN 정책 차이. WEB 필수 여부와 12자 제한 정렬 필요. |
| 책장 생성/수정 장소 `meeting.location` | `@Size(max=12)`, 필수 아님 | `meeting.location VARCHAR(255)` | 12자 제한, 선택 필드 | WEB 필수처럼 처리, `maxLength` 없음 | P1. WEB/RN 정책 차이. |
| 책장 생성/수정 날짜 `meetingTime` | 제한 없음, 필수 아님 | datetime | RN 선택 필드 | WEB 필수처럼 처리 | P2. 글자수 이슈는 아니지만 정책 불일치. |
| 책장 기수 `generation` | `@Min(1)` | integer | 숫자 sanitize | 드롭다운 1~20 또는 1~10 | P2. WEB 생성/수정 범위 차이 확인. |
| 책장 태그 `meeting.tag` | `@Size(max=10)`, 필수 아님 | `meeting.tag VARCHAR(255)` | 태그 선택 기반 | 태그 선택 기반 | 정상. |
| 발제 `topic.description` | `@NotBlank`, `@Size(max=300)` | migration 후 `topic.description VARCHAR(300) NOT NULL` | `INPUT_LIMITS.BOOKSHELF_COMPOSER=300` | `LongtermInput` 제한 없음 | P1. WEB에 300 제한 추가. Entity에도 `@Column(length=300)` 명시 권장. |
| 한줄평 `book_review.description` | `@NotBlank`, `@Size(max=300)` | migration 후 `book_review.description VARCHAR(300) NOT NULL` | `INPUT_LIMITS.BOOKSHELF_COMPOSER=300` | `LongtermInput` 제한 없음 | P1. WEB에 300 제한 추가. Entity에도 `@Column(length=300)` 명시 권장. |

### 공지사항/투표/댓글

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 공지 제목 `notice.title` | `@NotBlank`, `@Size(max=40)` | `notice.title VARCHAR(255)` | `INPUT_LIMITS.NOTICE_TITLE=40` | 생성/수정 `maxLength` 없음 | P1. WEB에 40 제한 추가. |
| 공지 내용 `notice.content` | `@NotNull`, `@Size(max=1000)` | `notice.content VARCHAR(1000)`, entity length 1000 | `INPUT_LIMITS.NOTICE_CONTENT=1000` | `slice(0,1000)`, `maxLength=1000` | 정상. |
| 공지 이미지 개수 | `@Size(max=5)` | `notice_image` row | RN 최대 5 | WEB 이미지 처리 있음 | 정상. |
| 공지 이미지 URL | list element `@NotBlank`, 길이 제한 없음 | `notice_image.image_url VARCHAR(255)` | 업로드 URL 전송, 길이 guard 없음 | 업로드 URL 전송, 길이 guard 없음 | P2. S3 URL이 255 초과 가능하면 DTO/DB 확장 필요. |
| 투표 제목 | `@NotBlank`, `@Size(max=255)` | `vote.title VARCHAR(255)` | RN은 공지 제목/별도 poll UI, 항목 255 guard 있음 | WEB은 dummy `"투표 DUMMY값"` 전송 | 정상/확인 필요. |
| 투표 내용 | `@Size(max=255)` | `vote.content VARCHAR(255)` | RN 별도 입력 여부 확인 필요 | WEB dummy `"투표 DUMMY값"` | 정상/확인 필요. |
| 투표 항목 1~6 | 각 `@Size(max=255)`, 1/2는 `@NotNull` | `vote.item1..6 VARCHAR(255)` | `NOTICE_POLL_OPTION_MAX_LENGTH=255`, 최대 6개 | WEB 항목 입력 제한 없음, 최대 6개만 제한 | P1. WEB에 항목 255 제한 추가. |
| 투표 선택 항목 수 | `@Size(max=6)`, 중복 금지 | 저장 없음 | RN 처리 있음 | WEB 처리 있음 | 정상. |
| 공지 댓글 `notice_comment.content` | `@NotBlank`, 길이 제한 없음 | `notice_comment.content VARCHAR(300)`, entity length 300 | `INPUT_LIMITS.NOTICE_COMMENT=300` | `CommentInput`/edit 제한 없음 | P1. BE DTO `@Size(max=300)` + WEB `maxLength=300` 추가. |

### 채팅/신고

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 조별 채팅 메시지 | STOMP `ChatRequestMessage.content @Size(max=400)` | `team_chat_message.content TEXT` | `MeetingChatOverlay` 입력 `maxLength` 없음, submit guard 없음 | `useMeetingRealtime`에서 400자 초과 throw | P1. RN에 400 제한/토스트 추가. |
| 신고 내용 `report.content` | `@Size(max=500)` | `report.content VARCHAR(500)`, entity length 500 | `INPUT_LIMITS.REPORT_CONTENT=500` | `ReportModal`은 400자까지만 setState, placeholder도 400 | P2. WEB만 더 짧음. 정책 확인 후 500으로 맞추거나 BE/RN을 400으로 낮춤. |
| 신고 대상 ID `targetId` | `@NotBlank`, 길이 제한 없음 | `report.target_id VARCHAR(255)` | 시스템 생성 | 시스템 생성 | P2. MEMBER 닉네임은 20이라 안전. 다른 ID 문자열도 안전. |

### 관리자/운영성 입력

| 기능 | BE DTO 검증 | BE 저장 한계 | RN 처리 | WEB 처리 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 뉴스 제목 | `@NotBlank`, `@Size(max=40)` | `news.title VARCHAR(40)` | RN 입력 없음 | Admin `NewForm` maxLength 40 | 정상. |
| 뉴스 내용 | `@NotBlank`, 길이 제한 없음 | `news.content TEXT` | RN 입력 없음 | Admin `NewForm` maxLength 5000 | P2. WEB 정책이 5000이면 BE DTO에도 `@Size(max=5000)` 추가 권장. |
| 뉴스 썸네일 URL | 길이 제한 없음 | `news.thumbnail_url VARCHAR(500)` | RN 입력 없음 | Admin image flow | P2. DTO `@Size(max=500)` 권장. |
| 뉴스 원문 링크 | 길이 제한 없음 | `news.original_link VARCHAR(500)` | RN 입력 없음 | Admin input 확인 필요 | P2. DTO/WEB `max=500` 권장. |
| 뉴스 이미지 URL | list 개수 `@Size(max=5)`, element 길이 제한 없음 | `news_image.image_url VARCHAR(500)` | RN 입력 없음 | Admin image flow | P2. DTO element `@Size(max=500)` 권장. |
| S3 업로드 파일명 | `@NotBlank`, 길이 제한 없음 | 직접 저장 아님 | RN image upload | WEB image upload | P3. 파일명 길이 제한/정규화는 인프라 정책으로 별도 결정. |

## DB 스키마 변경 후보

### 강력 후보

제품이 기존 UI 문구와 RN 제한을 유지하려면 아래 DB 변경이 필요하다.

```sql
ALTER TABLE club
  MODIFY COLUMN description VARCHAR(500);

ALTER TABLE club_member
  MODIFY COLUMN join_message VARCHAR(300);
```

그리고 BE entity에도 명시하는 것이 좋다.

```java
@Column(length = 500)
private String description;

@Column(length = 300)
private String joinMessage;
```

### 정책 결정 후보

책이야기 댓글은 현재 명확한 제품 정책이 없다. 선택지는 둘 중 하나다.

1. 댓글을 255자로 확정
   - BE DTO: `@Size(max = 255)`
   - RN/WEB: `maxLength=255`
   - DB 변경 없음

2. 댓글을 300자 또는 500자로 확장
   - BE DTO: `@Size(max = 300 또는 500)`
   - Entity: `@Column(length = 300 또는 500)`
   - DB: `ALTER TABLE comment MODIFY COLUMN content VARCHAR(300 또는 500);`
   - RN/WEB: 동일 제한 적용

공지 댓글과 통일하려면 300자가 가장 자연스럽다.

```sql
ALTER TABLE comment
  MODIFY COLUMN content VARCHAR(300);
```

### 명시성 개선 후보

현재 migration으로는 맞지만 entity에 길이가 빠진 항목이다. 운영 DB 생성은 Flyway 기준이지만, entity에도 명시하면 문서/DDL/검증이 덜 흔들린다.

```java
@Column(length = 300, nullable = false)
private String description; // Topic

@Column(length = 300, nullable = false)
private String description; // BookReview
```

## 클라이언트 수정 후보

### RN

- 모임 소개글: DB를 500으로 늘리지 않는다면 `INPUT_LIMITS.CLUB_DESCRIPTION`을 255로 낮춰야 한다.
- 가입 신청 사유: DB를 300으로 늘리지 않는다면 `INPUT_LIMITS.APPLY_REASON`을 255로 낮춰야 한다.
- 책이야기 댓글/대댓글: 제품 기준 확정 후 `maxLength`와 카운터/토스트 추가.
- 채팅 메시지: `maxLength=400` + submit guard + 카운터 또는 토스트 추가.
- 공지 이미지 URL/프로필 이미지 URL: 업로드 결과 URL 길이 guard 또는 BE/DB 확장.

### WEB

- 모임 생성/수정: 이름 40, 소개글 결정값, 지역 40에 `maxLength`와 submit guard 추가.
- 모임 가입 신청: DB를 유지한다면 255로 낮추고, DB를 늘린다면 현 300 유지.
- 책이야기 작성/수정: 제목/본문 제한을 실제 `maxLength`로 적용.
- 책이야기 댓글/대댓글: 제품 기준 제한 적용.
- 공지 작성/수정: 제목 40, 투표 항목 255 제한 추가.
- 공지 댓글: 300 제한 추가.
- 책장 생성/수정: 정기모임 이름 12, 장소 12 제한 추가. 필수/선택 정책을 RN/BE와 맞춤.
- 발제/한줄평: 300 제한 추가.
- 신고: 400 유지 의도가 없으면 500으로 상향.

## 추천 결정안

1. 모임 소개글은 사용자 기대가 이미 500으로 노출되어 있으므로 DB를 500으로 늘린다.
2. 가입 신청 사유는 이미 RN/WEB이 300으로 노출하고 있으므로 DB를 300으로 늘린다.
3. 책이야기 댓글은 공지 댓글과 맞춰 300자로 정하고, DB/DTO/RN/WEB을 모두 300으로 맞춘다.
4. 책이야기 본문은 5000자로 제품 기준을 확정하고, BE DTO/WEB에 명시한다.
5. 나머지 URL류는 S3가 반환하는 최종 URL 길이를 기준으로 255 유지 가능 여부를 확인한다. 255를 초과할 수 있으면 URL 컬럼을 500 이상으로 통일한다.

## 주요 근거 파일

- BE DTO
  - `ref_code/BE/src/main/java/checkmo/clubManagement/web/dto/ClubRequestDTO.java`
  - `ref_code/BE/src/main/java/checkmo/bookStory/web/dto/BookStoryRequestDTO.java`
  - `ref_code/BE/src/main/java/checkmo/clubNotice/web/dto/ClubNoticeRequestDTO.java`
  - `ref_code/BE/src/main/java/checkmo/clubMeeting/web/dto/bookshelf/BookShelfRequestDTO.java`
  - `ref_code/BE/src/main/java/checkmo/realtime/web/websocket/message/ChatRequestMessage.java`
  - `ref_code/BE/src/main/java/checkmo/report/web/dto/ReportRequestDTO.java`
  - `ref_code/BE/src/main/java/checkmo/member/web/dto/MemberRequestDTO.java`
- BE entity/migration
  - `ref_code/BE/src/main/java/checkmo/clubManagement/internal/entity/Club.java`
  - `ref_code/BE/src/main/java/checkmo/clubManagement/internal/entity/ClubMember.java`
  - `ref_code/BE/src/main/java/checkmo/bookStory/internal/entity/Comment.java`
  - `ref_code/BE/src/main/java/checkmo/clubNotice/internal/entity/NoticeComment.java`
  - `ref_code/BE/src/main/resources/db/migration/V1__init_schema.sql`
  - `ref_code/BE/src/main/resources/db/migration/V20260124_2__extend_review_topic_content.sql`
- RN
  - `src/constants/inputLimits.ts`
  - `src/screens/StoryScreen.tsx`
  - `src/screens/MeetingScreen.tsx`
  - `src/screens/meeting/GroupManagementOverlay.tsx`
  - `src/screens/meeting/useNoticeState.ts`
  - `src/screens/meeting/useBookshelfState.ts`
  - `src/screens/meeting/MeetingChatOverlay.tsx`
  - `src/screens/meeting/useMeetingChatState.ts`
- WEB
  - `ref_code/FE/src/app/(main)/groups/create/CreateGroupPageClient.tsx`
  - `ref_code/FE/src/app/(main)/groups/[id]/admin/edit/page.tsx`
  - `ref_code/FE/src/app/(main)/stories/new/StoryNewPageClient.tsx`
  - `ref_code/FE/src/app/(main)/stories/[id]/edit/StoryEditPageClient.tsx`
  - `ref_code/FE/src/components/base-ui/Comment/comment_input.tsx`
  - `ref_code/FE/src/components/base-ui/Comment/comment_edit_form.tsx`
  - `ref_code/FE/src/app/(main)/groups/[id]/admin/notice/new/page.tsx`
  - `ref_code/FE/src/app/(main)/groups/[id]/admin/notice/[noticeId]/page.tsx`
  - `ref_code/FE/src/components/base-ui/LongtermInput.tsx`
  - `ref_code/FE/src/hooks/realtime/useMeetingRealtime.ts`
  - `ref_code/FE/src/components/common/modals/report-block/ReportModal.tsx`
