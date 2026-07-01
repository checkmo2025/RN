# Checkmo i18n Glossary

작성일: 2026-07-02

## 1. 목적

이 문서는 Checkmo의 한국어/영어 번역 기준 용어집이다. RN 앱과 FE 웹에서 동일한 제품 용어를 사용하기 위한 source of truth로 둔다.

원칙:

- 한국어는 source locale로 유지한다.
- 영어는 이 문서의 glossary를 우선 적용한다.
- API enum/code는 번역하지 않고, 화면 label만 번역한다.
- 사용자 생성 콘텐츠, 책 제목, 모임명, 닉네임, 게시글 본문은 자동 번역하지 않는다.
- 법률/정책 문구는 별도 검토 후 확정한다.

## 2. 브랜드

| 한국어 | 영어 | 기준 |
| --- | --- | --- |
| 책모 | Checkmo | 앱/스토어/브랜드 공식명 |
| 책모 앱 | Checkmo app | 문장 안에서 앱을 지칭할 때 사용 |
| 책모 운영팀 | Checkmo Team | 공지, 이메일, 안내 문구에서 사용 |
| 책모 이용약관 | Checkmo Terms of Service | 법률 문서명, 최종 문구는 별도 검토 |

표기 규칙:

- 제품명은 항상 `Checkmo`로 표기한다.
- 앱 표시 이름, App Store 앱 이름, Google Play 앱 이름은 `Checkmo`로 통일한다.
- 문장 중 일반명사로 앱을 말할 때만 `Checkmo app`을 사용한다.

## 3. 핵심 도메인

| 한국어 | 영어 | 기준 |
| --- | --- | --- |
| 모임 | club | 조직/커뮤니티 단위 |
| 조 | group | club 안의 하위 조 |
| 모임장 | club owner | club을 만든 대표 권한자 |
| 운영진 | club admin | 운영 권한자 |
| 멤버 | member | club 소속 사용자 |
| 참여자 | participant | meeting/group/activity 참여 사용자 |
| 가입 신청 / 참여 신청 | join request | 명사형 |
| 참여 신청하기 | Request to join | 버튼/CTA |
| 가입 승인 | approve | 버튼/동작 label |
| 가입 거절 | reject | 버튼/동작 label |
| 탈퇴 | leave club | club에서 나가는 동작 |
| 강퇴 | remove member | 운영자가 멤버를 내보내는 동작 |

주의:

- `club`은 조직 단위이고, `meeting`은 일정/행사 단위이다.
- 코드 이름이 `meeting`이어도 사용자 노출 문구에서는 의미에 따라 `club` 또는 `meeting`으로 번역한다.

## 4. 모임 일정과 회차

| 한국어 | 영어 | 기준 |
| --- | --- | --- |
| 모임 일정 | club meeting | club 안에서 열리는 일정 |
| 모임 날짜 | meeting date | 날짜 label |
| 모임 장소 | meeting location | 장소 label |
| 정기 모임 | regular meeting | 반복/정기 일정 |
| 회차 | session | n회차를 표현할 때 사용 |
| 이번 모임 | upcoming meeting | 다가오는 모임 |
| 지난 모임 | past meeting | 이미 지난 모임 |

표기 예:

- `Upcoming meeting`
- `Past meetings`
- `Meeting date`
- `Session 3`

## 5. 책과 독서

| 한국어 | 영어 | 기준 |
| --- | --- | --- |
| 책장 | bookshelf | 사용자의 책 모음 |
| 책 이야기 | book story | 기능명/콘텐츠 유형 |
| 뉴스 | news | 책/서비스 관련 뉴스 |
| 도서 검색 | book search | 검색 기능 |
| 선정 도서 | selected book | club/meeting에서 선정한 책 |
| 읽는 책 | current book | 현재 읽는 책 |
| 읽은 책 | finished book | 다 읽은 책 |
| 관심 책 | saved book | 사용자가 저장한 관심 도서 |
| 독서 기록 | reading log | 기록형 콘텐츠 |
| 한줄평 | short review | 짧은 리뷰 |
| 감상 | reflection | 독서 감상 |
| 리뷰 | review | 일반 리뷰 |

표기 규칙:

- 탭/제목에서는 필요 시 Title Case를 쓴다. 예: `Book Story`, `Bookshelf`
- 문장 안에서는 sentence case를 쓴다. 예: `Add a book story.`

## 6. 게시글, 공지, 소통

| 한국어 | 영어 | 기준 |
| --- | --- | --- |
| 공지 | notice | 공지 기능의 기본 명칭 |
| 일반 공지 | general | category/filter label |
| 고정 공지 | pinned | category/filter label |
| 일반 공지 글 | general notice | 문장/상세 문맥 |
| 고정 공지 글 | pinned notice | 문장/상세 문맥 |
| 댓글 | comment | 댓글 |
| 답글 | reply | 댓글의 답글 |
| 신고 | report | 신고 동작 |
| 차단 | block | 사용자 차단 |
| 공유 | share | 공유 |
| 좋아요 | like | 좋아요 |
| 저장 / 북마크 | save | 저장 동작 |

주의:

- enum label에는 `general`, `pinned`처럼 짧은 label을 쓴다.
- 화면 설명이나 빈 상태 문구에서는 `general notice`, `pinned notice`처럼 전체 의미를 풀어 쓴다.

## 7. 사용자와 계정

| 한국어 | 영어 | 기준 |
| --- | --- | --- |
| 마이페이지 | Profile | 탭/화면명 |
| 내 정보 | My Profile | 내 프로필 정보 영역 |
| 프로필 | profile | 일반명사 |
| 닉네임 | nickname | 사용자 표시 이름 |
| 관심 카테고리 | interests | 설정/프로필 섹션 |
| 선호 장르 | preferred genres | 장르 선택 |
| 계정 설정 | settings | 화면/탭 label |
| 로그아웃 | log out | 동사형 |
| 회원 탈퇴 | delete account | 계정 삭제 |

표기 규칙:

- 탭 이름은 `Profile`, `Settings`처럼 짧게 쓴다.
- 버튼은 `Log out`, `Delete account`처럼 동작 중심으로 쓴다.

## 8. 권한, 앱 이름, 스토어

### 8.1 네이티브 앱 표시 이름

| 항목 | 한국어 | 영어 |
| --- | --- | --- |
| iOS display name | 책모 | Checkmo |
| Android app name | 책모 | Checkmo |
| App Store app name | 책모 | Checkmo |
| Google Play app name | 책모 | Checkmo |

### 8.2 권한 문구

| 항목 | 영어 |
| --- | --- |
| 사진 접근 권한 | Allow photo access to add a profile image. |
| 카메라 접근 권한 | Allow camera access to take a profile image. |

### 8.3 스토어 메타데이터 초안

| 항목 | 영어 초안 |
| --- | --- |
| App Store subtitle | Book clubs made easy |
| Google Play short description | Book clubs made easy |
| 첫 문장 | Checkmo helps readers find clubs, plan meetings, share book stories, and manage book clubs in one place. |
| 릴리즈 노트 기본형 | This update includes bug fixes and usability improvements. |

주의:

- 스토어 설명은 출시 전 별도 마케팅 문구로 다듬는다.
- 스크린샷은 영어 UI가 실제로 보이는 빌드에서 캡처한다.
- App Store Connect와 Google Play Console의 localized metadata는 앱 내부 번역과 별개로 관리한다.

## 9. 톤앤매너

영어 UI 기준:

- 버튼은 짧고 동작 중심으로 쓴다.
- 에러 문구는 원인과 다음 행동을 함께 쓴다.
- 안내문은 친근하지만 과하게 캐주얼하지 않게 쓴다.
- 한국식 직역보다 모바일 앱에서 자연스러운 문장을 우선한다.

예:

| 한국어 | 영어 |
| --- | --- |
| 저장하기 | Save |
| 수정하기 | Edit |
| 삭제하기 | Delete |
| 다시 시도 | Try again |
| 모임을 불러오지 못했어요. 다시 시도해 주세요. | Could not load clubs. Please try again. |

## 10. 법률/정책 문구

아래 항목은 나중에 별도 검토 후 확정한다.

- Terms of Service
- Privacy Policy
- Marketing Consent
- Push Notification Consent
- Account Deletion Notice
- Data Retention Notice

## 11. 1차 확정 핵심 Glossary

```text
책모 = Checkmo
모임 = club
조 = group
회차 = session
모임장 = club owner
운영진 = club admin
멤버 = member
참여자 = participant
가입/참여 신청 = join request
가입 승인 = approve
가입 거절 = reject
모임 일정 = club meeting
이번 모임 = upcoming meeting
지난 모임 = past meeting
책장 = bookshelf
책 이야기 = book story
관심 책 = saved book
공지 = notice
일반 공지 = general
고정 공지 = pinned
마이페이지 = Profile
계정 설정 = Settings
회원 탈퇴 = delete account
```
