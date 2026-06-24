# 긴 입력/글자수 필드 전수 조사

> 조사일: 2026-06-25 KST
> 범위: 책이야기 본문, 신고 내용, 모임 소개글, 발제/한줄평, 공지 제목, 공지 내용
> 정책: RN-BE 길이 불일치는 이번 작업에서 수정하지 않고 문서화한다. public API/wire payload와 `INPUT_LIMITS` 값은 유지한다.

## 요약

| 대상 | BE 입력 가능 | RN 입력 가능 | 카운터 | 초과 시 액션 | 긴 입력 가시성 조치 | 불일치 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 책이야기 본문 | 제한 없음: DTO `@Size` 없음, entity `TEXT` | 5000 | 있음 | `FormTextInput` clamp + 토스트 | 내부 스크롤 명시, 하단/우측 여백 보강 | 있음 |
| 신고 내용 | 500 | 500 | 있음 | `FormTextInput` clamp + 토스트 | 내부 스크롤 명시, 입력 박스 maxHeight/여백 보강 | 없음 |
| 모임 소개글 | 500 | 500 | 있음 | `FormTextInput` clamp + 토스트 | 생성/수정 공통 textArea minHeight/여백 보강 | 없음 |
| 발제/한줄평 | 300 | 300 | 있음 | `FormTextInput` clamp + 토스트 | 내부 스크롤 명시, composer minHeight/여백 보강 | 없음 |
| 공지 제목 | 40 | 50 | 있음 | `FormTextInput` clamp + 토스트 | 내부 스크롤 명시, 제목 입력 하단 여백 보강 | 있음 |
| 공지 내용 | 1000 | 2000 | 있음 | `FormTextInput` clamp + 토스트 | 내부 스크롤 명시, 내용 입력 하단 여백 보강 | 있음 |

## 상세 조사표

| 화면 | 입력 필드 | API/DTO | BE 제한 근거 | RN 제한 근거 | 카운터/초과 액션 | 긴 입력 가시성 | 후속 결정 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 책이야기 작성/수정 | 본문 | `POST/PATCH /book-stories`, `BookStoryRequestDTO.description` | DTO에 `@Size` 없음. `BookStory.description`은 `@Column(columnDefinition = "TEXT")` | `INPUT_LIMITS.BOOK_STORY_CONTENT = 5000`, `StoryScreen` 본문 `FormTextInput` | `{body.length}/5000`, 5000자 초과 clamp + `"책이야기 본문은 5000자 이하여야 합니다."` | `scrollEnabled`, `textAlignVertical="top"` 명시. `bodyInput` 하단 여백 추가 | BE에 길이 정책을 둘지, RN 5000 제한만 유지할지 결정 필요 |
| 신고 모달 | 내용 | `POST /reports`, `ReportRequestDTO.Create.content` | `@Size(max = 500)`, `Report.content @Column(length = 500)` | `INPUT_LIMITS.REPORT_CONTENT = 500`, `ReportMemberModal` 내용 `FormTextInput` | `{content.length}/500`, 500자 초과 clamp + `"신고 내용은 500자 이하여야 합니다."` | 입력 박스 `minHeight/maxHeight` 정리, 내부 스크롤/상단 정렬/하단 여백 명시 | 없음 |
| 모임 생성 | 소개글 | `POST /clubs`, `ClubRequestDTO.ClubDetail.description` | `@NotBlank`, `@Size(max = 500)`. entity column 길이는 별도 지정 없음 | `INPUT_LIMITS.CLUB_DESCRIPTION = 500`, `MeetingScreen` 생성 폼 | `{desc.length}/500`, 500자 초과 clamp + `"모임 소개글은 500자 이하여야 합니다."` | 공통 `textArea`를 `minHeight/maxHeight`로 정리하고 하단 여백 추가 | 없음 |
| 모임 정보 수정 | 소개글 | `PUT /clubs/{clubId}`, `ClubRequestDTO.ClubDetail.description` | `@NotBlank`, `@Size(max = 500)`. entity column 길이는 별도 지정 없음 | `INPUT_LIMITS.CLUB_DESCRIPTION = 500`, `GroupManagementOverlay` 수정 폼 | `{editDraft.description.length}/500`, 500자 초과 clamp + `"모임 소개글은 500자 이하여야 합니다."` | 생성 폼과 같은 공통 `textArea` 보정 적용 | 없음 |
| 책장 상세 | 발제 | `POST/PATCH /clubs/{clubId}/meetings/{meetingId}/topics`, `BookShelfRequestDTO.TopicCreate.description` | `@NotBlank`, `@Size(max = 300)` | `INPUT_LIMITS.BOOKSHELF_COMPOSER = 300`, `MeetingScreen` bookshelf composer | `{bookshelfComposerInput.length}/300`, 300자 초과 clamp + `"내용은 300자 이하여야 합니다."` | composer 입력 `minHeight/maxHeight`, 내부 스크롤/상단 정렬/하단 여백 명시 | 없음 |
| 책장 상세 | 한줄평 | `POST/PATCH /clubs/{clubId}/meetings/{meetingId}/reviews`, `BookShelfRequestDTO.BookReviewCreate.description` | `@NotBlank`, `@Size(max = 300)` | `INPUT_LIMITS.BOOKSHELF_COMPOSER = 300`, `MeetingScreen` bookshelf composer | `{bookshelfComposerInput.length}/300`, 300자 초과 clamp + `"내용은 300자 이하여야 합니다."` | 발제와 같은 composer 보정 적용 | 없음 |
| 공지 작성/수정 | 제목 | `POST/PATCH /clubs/{clubId}/notices`, `ClubNoticeRequestDTO.*.title` | `@NotBlank`, `@Size(max = 40)`. `Notice.title`은 column 길이 지정 없음 | `INPUT_LIMITS.NOTICE_TITLE = 50`, `MeetingScreen` 공지 작성/수정 | `{noticeDraft.title.length}/50`, 50자 초과 clamp + `"공지 제목은 50자 이하여야 합니다."` | 내부 스크롤/상단 정렬 명시, 하단 여백 추가 | BE 40/RN 50 불일치. 서버 400 가능성이 있어 정책 결정 필요 |
| 공지 작성/수정 | 내용 | `POST/PATCH /clubs/{clubId}/notices`, `ClubNoticeRequestDTO.*.content` | `@NotNull`, `@Size(max = 1000)`, `Notice.content @Column(length = 1000)` | `INPUT_LIMITS.NOTICE_CONTENT = 2000`, `MeetingScreen` 공지 작성/수정 | `{noticeDraft.content.length}/2000`, 2000자 초과 clamp + `"공지 내용은 2000자 이하여야 합니다."` | 내부 스크롤/상단 정렬 명시, 하단 여백 추가 | BE 1000/RN 2000 불일치. 서버 400 가능성이 있어 정책 결정 필요 |

## 공통 동작

- `FormTextInput`은 `maxLength`를 직접 `TextInput`에 넘기지 않고, `onChangeText`에서 초과 문자열을 `slice(0, maxLength)`로 잘라 저장한다.
- 직접 입력/붙여넣기 모두 초과 시 동일하게 clamp된다.
- 이미 제한 길이에 도달한 상태에서 추가 키 입력 시 `onKeyPress`로 초과 토스트를 한 번 노출한다.
- 초과 알림은 입력값이 제한 미만으로 줄어들기 전까지 중복 노출을 막는다.

## iOS/Android 육안 QA 체크리스트

각 대상 필드에서 아래 케이스를 iOS와 Android에서 모두 확인한다.

| 케이스 | 확인 기준 |
| ------ | ------ |
| `max-1`, `max`, `max+1` 직접 입력 | 카운터가 즉시 갱신되고, `max+1`은 저장되지 않으며 토스트가 보인다. |
| `max+1` 이상 긴 텍스트 붙여넣기 | 입력값이 max로 잘리고, 마지막 줄과 커서가 입력칸 안에서 보인다. |
| 긴 한 줄 | 가로 잘림 없이 입력칸 내부에서 편집 가능하고 카운터와 겹치지 않는다. |
| 줄바꿈 많은 텍스트 | 내부 스크롤이 가능하고 부모 스크롤과 충돌하지 않는다. |
| 한글/이모지 포함 텍스트 | 카운터와 clamp가 앱 기준 문자열 길이로 일관되게 동작한다. |
| 키보드 열린 상태 | 입력칸, 마지막 줄, 커서, 카운터, 토스트가 키보드에 가려지지 않는다. |

## 계약 불일치

- 책이야기 본문: RN은 5000자로 제한하지만 BE DTO에는 `@Size`가 없고 entity는 `TEXT`다. 현재는 RN UX 제한만 존재한다.
- 공지 제목: RN은 50자를 허용하지만 BE DTO는 40자를 허용한다.
- 공지 내용: RN은 2000자를 허용하지만 BE DTO/entity는 1000자를 허용한다.
- 위 3건은 이번 작업에서 코드 정책을 바꾸지 않는다. 다음 결정 시 RN 제한을 BE에 맞출지, BE validation을 RN에 맞출지 별도 확정해야 한다.
