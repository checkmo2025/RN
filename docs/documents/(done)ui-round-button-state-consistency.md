# UI round(버튼/상태) 전수 정리

> 범위: RN `src/**/*.tsx` 스타일 중 `button/chip/tab/badge/filter/toggle/pill` 키 전수 점검
> 목적: 버튼별 round 기준 + 상태별(style state) round 유지 여부를 한 번에 확인

## 1) 통일 기준
- 기본: `radius` 토큰(`xs/sm/md/lg/pill`) 사용
- 상태 스타일(`Pressed/Disabled/Selected/Active/Inactive`)은 색/투명도만 바꾸고 round를 재정의하지 않음
- 예외: 원형/아이콘 배지(width/2) 또는 컴포넌트 전용 shape 값은 숫자 허용

## 2) 집계 요약
- 점검 대상 스타일 키: **313개**
- round(`borderRadius`) 정의 키: **85개**
- round 미정의 키(상위 컨테이너/공통 스타일 상속): **228개**
- 하드코딩 round(예외형): **8개**

### round 분포
| round 값 | 개수 |
|---|---:|
| radius.md | 37 |
| radius.sm | 27 |
| radius.lg | 11 |
| 18 | 3 |
| radius.pill | 2 |
| 16 | 2 |
| 13 | 1 |
| 23 | 1 |
| 9 | 1 |

### 상태 키 분포
| 상태 suffix | 개수 |
|---|---:|
| Active | 51 |
| Disabled | 18 |
| Inactive | 9 |
| Selected | 5 |
| Pressed | 2 |

### 파일별 요약
| 파일 | 키 수 | round 정의 | 하드코딩 round | 상태 키 |
|---|---:|---:|---:|---:|
| `src/screens/MeetingScreen.tsx` | 136 | 43 | 5 | 34 |
| `src/screens/MyPageScreen.tsx` | 54 | 13 | 1 | 16 |
| `src/screens/StoryScreen.tsx` | 31 | 8 | 0 | 9 |
| `src/components/common/AppHeader.tsx` | 11 | 4 | 1 | 2 |
| `src/components/feature/groups/MeetingListCard.tsx` | 7 | 3 | 0 | 2 |
| `src/screens/UserProfileScreen.tsx` | 26 | 3 | 0 | 10 |
| `src/screens/AuthFlowScreen.tsx` | 18 | 3 | 1 | 4 |
| `src/components/feature/home/HomeColumns.tsx` | 4 | 2 | 0 | 0 |
| `src/components/common/ReportMemberModal.tsx` | 8 | 2 | 0 | 3 |
| `src/components/feature/member/SubscribeUserItem.tsx` | 7 | 1 | 0 | 3 |
| `src/components/feature/bookstory/BookStoryCard.tsx` | 1 | 1 | 0 | 0 |
| `src/components/feature/bookstory/BookStoryFeedCard.tsx` | 4 | 1 | 0 | 2 |
| `src/screens/NewsScreen.tsx` | 1 | 1 | 0 | 0 |

## 3) 공용 버튼 컴포넌트 상태 매트릭스

| 컴포넌트 | round | 상태 분기 | round 변경 여부 |
|---|---|---|---|
| `AppButton` (`src/components/common/PrimaryButton.tsx`) | `radius.md` (`styles.base`) | `primary/secondary/outline/danger`, `disabled`, `pressed`, `loading` | 없음 |
| `IconButton` (`src/components/common/IconButton.tsx`) | 없음(패딩형 터치영역) | `disabled`, `pressed` | 해당 없음 |
| `FloatingActionButton` (`src/components/common/FloatingActionButton.tsx`) | `radius.pill` | `pressed` | 없음 |
| `FeedbackPressable` (`src/components/common/FeedbackPressable.tsx`) | 상위 스타일 상속 | `state.pressed` | 상위 스타일 유지 |

## 4) 하드코딩 round 예외 목록
| 파일:라인 | 스타일 키 | round | 비고 |
|---|---|---:|---|
| `src/components/common/AppHeader.tsx:1470` | `dropdownRecoHeartBadge` | 13 | 원형/배지/아이콘 계열 예외 |
| `src/screens/AuthFlowScreen.tsx:1673` | `editBadge` | 16 | 원형/배지/아이콘 계열 예외 |
| `src/screens/MeetingScreen.tsx:1687` | `createProfileCameraBadge` | 23 | 원형/배지/아이콘 계열 예외 |
| `src/screens/MeetingScreen.tsx:2317` | `teamManageAddButton` | 18 | 원형/배지/아이콘 계열 예외 |
| `src/screens/MeetingScreen.tsx:3600` | `bookshelfCalendarMonthButton` | 18 | 원형/배지/아이콘 계열 예외 |
| `src/screens/MeetingScreen.tsx:4005` | `bookshelfPanelAddButton` | 16 | 원형/배지/아이콘 계열 예외 |
| `src/screens/MeetingScreen.tsx:4461` | `regularChatSendButton` | 18 | 원형/배지/아이콘 계열 예외 |
| `src/screens/MyPageScreen.tsx:3273` | `toggleThumb` | 9 | 원형/배지/아이콘 계열 예외 |

> 확인 결과: 상태 키(`*Active`, `*Disabled`, `*Selected`, `*Pressed`, `*Inactive`)에서 round 재정의는 **0건**

## 5) 버튼별/상태별 round 매트릭스 (round 정의 키 전수)
| 파일 | 베이스 스타일 키 | round | 연결 상태 키 |
|---|---|---|---|
| `src/components/common/AppHeader.tsx:1396` | `notiAllButton` | radius.sm | - |
| `src/components/common/AppHeader.tsx:1470` | `dropdownRecoHeartBadge` | 13 | - |
| `src/components/common/AppHeader.tsx:1560` | `searchMoreButton` | radius.pill | searchMoreButtonPressed |
| `src/components/common/AppHeader.tsx:1625` | `resultWriteButton` | radius.pill | resultWriteButtonPressed |
| `src/components/common/ReportMemberModal.tsx:249` | `typeButton` | radius.sm | typeButtonActive, typeButtonTextActive |
| `src/components/common/ReportMemberModal.tsx:290` | `submitButton` | radius.sm | submitButtonDisabled |
| `src/components/feature/bookstory/BookStoryCard.tsx:191` | `subscribeChip` | radius.lg | - |
| `src/components/feature/bookstory/BookStoryFeedCard.tsx:228` | `subButton` | radius.sm | subButtonActive, subButtonInactive |
| `src/components/feature/groups/MeetingListCard.tsx:266` | `applyButton` | radius.md | applyButtonDisabled, applyButtonTextDisabled |
| `src/components/feature/groups/MeetingListCard.tsx:284` | `visitButton` | radius.md | - |
| `src/components/feature/groups/MeetingListCard.tsx:316` | `applySubmitButton` | radius.md | - |
| `src/components/feature/home/HomeColumns.tsx:121` | `secondaryButton` | radius.md | - |
| `src/components/feature/home/HomeColumns.tsx:137` | `primaryButton` | radius.md | - |
| `src/components/feature/member/SubscribeUserItem.tsx:109` | `subscribeButton` | radius.sm | subscribeButtonActive, subscribeButtonTextActive, subscribeButtonTextInactive |
| `src/screens/AuthFlowScreen.tsx:1673` | `editBadge` | 16 | - |
| `src/screens/AuthFlowScreen.tsx:1729` | `chip` | radius.lg | chipActive, chipTextActive |
| `src/screens/AuthFlowScreen.tsx:1787` | `outlineButton` | radius.md | outlineButtonActive, outlineButtonDisabled |
| `src/screens/MeetingScreen.tsx:1390` | `createButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:1427` | `outputFilterButton` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:1441` | `outputFilterMenu` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:1553` | `groupButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:1687` | `createProfileCameraBadge` | 23 | - |
| `src/screens/MeetingScreen.tsx:1710` | `createProfileActionButton` | radius.md | createProfileActionButtonDisabled, createProfileActionButtonSelected |
| `src/screens/MeetingScreen.tsx:1847` | `addLinkButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:1901` | `chip` | radius.lg | chipActive, chipTextActive |
| `src/screens/MeetingScreen.tsx:1923` | `dupCheckButton` | radius.sm | dupCheckButtonDisabled |
| `src/screens/MeetingScreen.tsx:1951` | `secondaryButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:1968` | `buttonFlex` | radius.md | - |
| `src/screens/MeetingScreen.tsx:1974` | `buttonGrow` | radius.md | - |
| `src/screens/MeetingScreen.tsx:1981` | `buttonSingle` | radius.md | - |
| `src/screens/MeetingScreen.tsx:2011` | `pillNavItem` | radius.md | pillNavItemActive |
| `src/screens/MeetingScreen.tsx:2132` | `detailButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:2299` | `teamManageDropChip` | radius.lg | teamManageDropChipActive |
| `src/screens/MeetingScreen.tsx:2317` | `teamManageAddButton` | 18 | - |
| `src/screens/MeetingScreen.tsx:2361` | `teamManageMemberChip` | radius.md | teamManageMemberChipSelected |
| `src/screens/MeetingScreen.tsx:2427` | `teamManageSaveButton` | radius.lg | teamManageSaveButtonActive, teamManageSaveButtonDisabled, teamManageSaveButtonTextDisabled |
| `src/screens/MeetingScreen.tsx:2474` | `managementCountBadge` | radius.lg | - |
| `src/screens/MeetingScreen.tsx:2542` | `managementGhostButton` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:2556` | `managementPrimarySmallButton` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:2581` | `managementRoleBadge` | radius.lg | - |
| `src/screens/MeetingScreen.tsx:2599` | `managementWideButton` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:2633` | `managementToggleChip` | radius.md | managementToggleChipActive, managementToggleChipTextActive |
| `src/screens/MeetingScreen.tsx:2662` | `managementFooterButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:2915` | `noticePageButton` | radius.sm | noticePageButtonActive |
| `src/screens/MeetingScreen.tsx:3109` | `noticePollSubmitButton` | radius.md | noticePollSubmitButtonDisabled |
| `src/screens/MeetingScreen.tsx:3213` | `noticeCommentAuthorBadge` | radius.lg | - |
| `src/screens/MeetingScreen.tsx:3265` | `noticeComposerToggle` | radius.md | noticeComposerToggleActive, noticeComposerToggleTextActive |
| `src/screens/MeetingScreen.tsx:3288` | `noticeComposerPinButton` | radius.md | noticeComposerPinButtonActive, noticeComposerPinButtonTextActive |
| `src/screens/MeetingScreen.tsx:3320` | `noticeComposerLinkButton` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:3335` | `noticeComposerAddOptionButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:3355` | `noticeComposerChoiceChip` | radius.lg | noticeComposerChoiceChipActive, noticeComposerChoiceChipTextActive |
| `src/screens/MeetingScreen.tsx:3429` | `noticeComposerFooterButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:3600` | `bookshelfCalendarMonthButton` | 18 | - |
| `src/screens/MeetingScreen.tsx:3675` | `bookshelfCalendarTodayButton` | radius.md | - |
| `src/screens/MeetingScreen.tsx:3834` | `bookshelfSessionChip` | radius.md | bookshelfSessionChipActive |
| `src/screens/MeetingScreen.tsx:3886` | `bookshelfSessionBadge` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:3892` | `bookshelfCategoryBadge` | radius.sm | - |
| `src/screens/MeetingScreen.tsx:4005` | `bookshelfPanelAddButton` | 16 | - |
| `src/screens/MeetingScreen.tsx:4182` | `bookshelfGroupChip` | radius.sm | bookshelfGroupChipActive, bookshelfGroupChipTextActive |
| `src/screens/MeetingScreen.tsx:4461` | `regularChatSendButton` | 18 | regularChatSendButtonDisabled |
| `src/screens/MyPageScreen.tsx:2922` | `profileImageActionButton` | radius.sm | - |
| `src/screens/MyPageScreen.tsx:2947` | `categoryChip` | radius.sm | categoryChipSelected |
| `src/screens/MyPageScreen.tsx:3046` | `emailVerificationButton` | radius.md | emailVerificationButtonActive, emailVerificationButtonTextActive |
| `src/screens/MyPageScreen.tsx:3078` | `submitButton` | radius.md | submitButtonDisabled |
| `src/screens/MyPageScreen.tsx:3099` | `reportTypeChip` | radius.lg | reportTypeChipActive, reportTypeChipTextActive |
| `src/screens/MyPageScreen.tsx:3132` | `reportBadge` | radius.lg | - |
| `src/screens/MyPageScreen.tsx:3243` | `guestPromptButton` | radius.sm | - |
| `src/screens/MyPageScreen.tsx:3262` | `toggleTrack` | radius.md | - |
| `src/screens/MyPageScreen.tsx:3273` | `toggleThumb` | 9 | - |
| `src/screens/MyPageScreen.tsx:3367` | `followButton` | radius.sm | followButtonActive, followButtonInactive, followButtonTextActive, followButtonTextInactive |
| `src/screens/MyPageScreen.tsx:3390` | `followDeleteButton` | radius.sm | followDeleteButtonDisabled |
| `src/screens/MyPageScreen.tsx:3455` | `primaryButton` | radius.md | - |
| `src/screens/MyPageScreen.tsx:3467` | `secondaryButton` | radius.md | - |
| `src/screens/NewsScreen.tsx:917` | `detailLinkButton` | radius.sm | - |
| `src/screens/StoryScreen.tsx:2490` | `bookSelectButton` | radius.md | - |
| `src/screens/StoryScreen.tsx:2619` | `secondaryButton` | radius.md | - |
| `src/screens/StoryScreen.tsx:2631` | `primaryButton` | radius.md | - |
| `src/screens/StoryScreen.tsx:2643` | `draftButton` | radius.md | - |
| `src/screens/StoryScreen.tsx:2721` | `chipButton` | radius.sm | - |
| `src/screens/StoryScreen.tsx:2989` | `commentAuthorBadge` | radius.sm | - |
| `src/screens/StoryScreen.tsx:3044` | `reportTypeButton` | radius.sm | reportTypeButtonActive, reportTypeButtonTextActive |
| `src/screens/StoryScreen.tsx:3080` | `reportSubmitButton` | radius.sm | reportSubmitButtonDisabled |
| `src/screens/UserProfileScreen.tsx:1105` | `primaryButton` | radius.md | primaryButtonDisabled |
| `src/screens/UserProfileScreen.tsx:1123` | `secondaryButton` | radius.md | - |
| `src/screens/UserProfileScreen.tsx:1387` | `followButton` | radius.sm | followButtonActive, followButtonDisabled, followButtonInactive, followButtonTextActive, followButtonTextInactive |

## 6) 통일 적용 체크포인트
- 신규 버튼/칩/탭 작성 시 먼저 `radius.md`(기본 CTA), `radius.sm`(보조/칩), `radius.lg`(큰 칩/배지) 중 선택
- 상태 스타일은 `borderRadius`를 건드리지 않고 색/테두리/opacity만 변경
- 원형 버튼은 반드시 `width === height` + `borderRadius = width / 2` 패턴으로 명시
- `MeetingScreen`/`MyPageScreen` 신규 UI 추가 시 본 문서의 기존 키와 round를 우선 재사용
