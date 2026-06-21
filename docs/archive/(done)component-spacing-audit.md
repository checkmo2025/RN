# RN 컴포넌트 간 간격 인벤토리 (외부 간격 기준)

- 작성일: 2026-04-28
- 기준: `src/theme/spacing.ts`
  - `xxs=4`, `xs=8`, `sm=12`, `md=16`, `lg=20`, `xl=24`, `xxl=32`
- 해석 기준
  - 포함: 리스트 아이템 간격, 섹션 간격, 카드 간 간격, 탭/행 간격, 화면 content container 간격
  - 제외: 카드/컴포넌트 내부 텍스트-아이콘 정렬용 간격, 입력창 내부 패딩

## 1) 홈 (Home)

- `src/screens/HomeScreen.tsx:601` `listContent.paddingTop = spacing.md (16)`
- `src/screens/HomeScreen.tsx:605` `postItemSeparator.height = spacing.sm (12)`
  - 홈 피드 카드(책이야기) 사이 실제 간격
- `src/screens/HomeScreen.tsx:608` `headerContainer.gap = spacing.md (16)`
- `src/screens/HomeScreen.tsx:622` `userRecommendationList.gap = spacing.sm (12)`
- `src/screens/HomeScreen.tsx:641` `headerToStorySpacer.height = spacing.sm (12)`

참고(카드 재사용 컴포넌트 외부 여백)
- `src/components/feature/bookstory/BookStoryFeedCard.tsx:190` `card.marginHorizontal = 18`
- `src/components/feature/bookstory/BookStoryCard.tsx:153` `card.marginVertical = spacing.xs (8)`
- `src/components/feature/bookstory/BookStoryCardLarge.tsx:104` `card.marginVertical = spacing.xs (8)`

## 2) 책이야기 (Story)

목록/탭 영역
- `src/screens/StoryScreen.tsx:2403` `listContent.paddingBottom = spacing.xl (24)`
- `src/screens/StoryScreen.tsx:2406` `storyItemSeparator.height = spacing.sm (12)`
  - 책이야기 카드 사이 실제 간격
- `src/screens/StoryScreen.tsx:2409` `secondaryHeader.marginBottom = spacing.md (16)`
- `src/screens/StoryScreen.tsx:2416` `secondaryHeader.gap = spacing.sm (12)`
- `src/screens/StoryScreen.tsx:2418` `filterRow.gap = spacing.sm (12)`

작성/상세/선택 모달
- `src/screens/StoryScreen.tsx:2752` `composeContent.gap = spacing.md (16)`
- `src/screens/StoryScreen.tsx:2768` `detailContent.gap = spacing.md (16)`
- `src/screens/StoryScreen.tsx:2877` `commentSection.marginTop = spacing.lg (20)`
- `src/screens/StoryScreen.tsx:2879` `commentSection.gap = spacing.sm (12)`
- `src/screens/StoryScreen.tsx:2595` `bookPickerContent.gap = spacing.sm (12)`

## 3) 소식 (News)

메인 목록
- `src/screens/NewsScreen.tsx:697` `listContent.gap = spacing.sm (12)`
  - 소식 카드 사이 실제 간격
- `src/screens/NewsScreen.tsx:702` `headerWrap.marginBottom = spacing.md (16)`
- `src/screens/NewsScreen.tsx:743` `recommendedSection.marginTop = spacing.md (16)`
- `src/screens/NewsScreen.tsx:745` `recommendedSection.gap = spacing.sm (12)`
- `src/screens/NewsScreen.tsx:751` `recommendedRow.gap = spacing.sm (12)`
- `src/screens/NewsScreen.tsx:785` `newsListTitle.marginTop = spacing.md (16)`

상세
- `src/screens/NewsScreen.tsx:866` `detailContent.gap = spacing.md (16)`

프로모션 캐러셀
- `src/components/feature/news/NewsPromotionCarousel.tsx:143` `promoWrapper.marginRight = spacing.sm (12)`
  - 캐러셀 카드 간격
- `src/components/feature/news/NewsPromotionCarousel.tsx:172` `dots.gap = spacing.xs (8)`

## 4) 모임 (Meeting)

### 4-1. 모임 검색/진입
- `src/screens/MeetingScreen.tsx:1366` `content.gap = spacing.md (16)`
- `src/screens/MeetingScreen.tsx:1485` `groupList.gap = spacing.sm - 2 (10)`
  - 모임 검색 카드(클럽) 사이 실제 간격
- `src/components/feature/groups/MeetingListCard.tsx:263` `actions.gap = 6`
  - `가입신청하기` / `방문하기` 버튼 간격
- `src/components/feature/groups/MeetingListCard.tsx:300` `applySection.gap = 8`

### 4-2. 모임 홈 상단/탭
- `src/screens/MeetingScreen.tsx:1992` `groupHomeHeaderRow.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:1998` `groupHomeTitle.marginTop = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:2002` `pillNav.gap = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:2004` `pillNav.marginTop = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:2031` `detailCard.gap = spacing.md (16)`

### 4-3. 모임 관리
- `src/screens/MeetingScreen.tsx:2261` `managementScreenContent.gap = spacing.md (16)`
- `src/screens/MeetingScreen.tsx:2339` `teamManageContent.gap = spacing.md (16)`
- `src/screens/MeetingScreen.tsx:2497` `managementCardList.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:2623` `managementEditSection.gap = spacing.md (16)`
- `src/screens/MeetingScreen.tsx:2681` `managementFooterButtonRow.gap = spacing.sm (12)`

### 4-4. 공지
- `src/screens/MeetingScreen.tsx:2849` `noticeList.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:3185` `noticeCommentList.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:3325` `noticeComposerSection.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:3346` `noticeComposerPollOptionList.gap = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:3457` `noticeBookSelectorList.gap = spacing.sm (12)`

### 4-5. 책장
- `src/screens/MeetingScreen.tsx:3839` `bookshelfSection.gap = spacing.md (16)`
- `src/screens/MeetingScreen.tsx:3842` `bookshelfSessionRow.gap = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:3981` `bookshelfDetailTabRow.gap = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:4105` `bookshelfPostList.gap = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:4195` `bookshelfGroupChipRow.gap = spacing.xs (8)`
- `src/screens/MeetingScreen.tsx:4221` `bookshelfGroupSection.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:4322` `bookshelfGroupPostList.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:3517` `bookshelfBookSearchList.gap = spacing.sm (12)`

### 4-6. 정기 채팅
- `src/screens/MeetingScreen.tsx:4396` `regularChatGroupList.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:4416` `regularChatMessagesContent.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:4418` `regularChatMessagesContent.paddingVertical = spacing.sm (12)`

### 4-7. 모임 생성 플로우
- `src/screens/MeetingScreen.tsx:1384` `createBody.gap = spacing.md (16)`
- `src/screens/MeetingScreen.tsx:1585` `stepRow.gap = spacing.xs + 2 (10)`
- `src/screens/MeetingScreen.tsx:1856` `navRow.gap = spacing.sm (12)`
- `src/screens/MeetingScreen.tsx:1859` `navRow.marginTop = spacing.lg (20)`

## 5) 마이페이지 (MyPage)

전체/설정 컨테이너
- `src/screens/MyPageScreen.tsx:2808` `scrollContent.gap = spacing.md (16)`
- `src/screens/MyPageScreen.tsx:2825` `settingsContent.gap = spacing.md (16)`
- `src/screens/MyPageScreen.tsx:2831` `settingsSection.gap = spacing.sm (12)`
- `src/screens/MyPageScreen.tsx:2843` `settingsItems.gap = spacing.xs (8)`
- `src/screens/MyPageScreen.tsx:2854` `settingsDetailWrap.gap = spacing.sm (12)`

마이 탭별 리스트/그리드
- `src/screens/MyPageScreen.tsx:3495` `gridContent.gap = spacing.sm (12)`
- `src/screens/MyPageScreen.tsx:3499` `cardWrap.gap = spacing.sm (12)`
- `src/screens/MyPageScreen.tsx:3562` `bookWrap.gap = spacing.sm (12)`
- `src/screens/MyPageScreen.tsx:3603` `listContainer.gap = spacing.xs (8)`
  - 내 모임 / 내 알림 / 내 소식 목록 간격
- `src/screens/MyPageScreen.tsx:3107` `detailList.gap = spacing.sm (12)`
- `src/screens/MyPageScreen.tsx:3110` `reportList.gap = spacing.sm (12)`

팔로우 페이지
- `src/screens/MyPageScreen.tsx:3268` `followPageWrap.gap = spacing.md (16)`
- `src/screens/MyPageScreen.tsx:3318` `followListWrap.gap = spacing.xs (8)`

## 6) 다른사람 프로필 (UserProfile)

메인 컨테이너
- `src/screens/UserProfileScreen.tsx:1041` `content.gap = spacing.md (16)`
- `src/screens/UserProfileScreen.tsx:1061` `profileRow.gap = spacing.md (16)`
- `src/screens/UserProfileScreen.tsx:1106` `actionButtons.gap = spacing.sm (12)`

탭 콘텐츠
- `src/screens/UserProfileScreen.tsx:1166` `gridContent.gap = spacing.sm (12)`
- `src/screens/UserProfileScreen.tsx:1170` `cardWrap.gap = spacing.sm (12)`
- `src/screens/UserProfileScreen.tsx:1233` `bookWrap.gap = spacing.sm (12)`
- `src/screens/UserProfileScreen.tsx:1275` `listContainer.gap = spacing.sm (12)`

팔로우 페이지
- `src/screens/UserProfileScreen.tsx:1304` `followPageWrap.gap = spacing.md (16)`
- `src/screens/UserProfileScreen.tsx:1354` `followListWrap.gap = spacing.xs (8)`

## 7) 헤더 검색/탭바

헤더 검색(전체 검색 시트)
- `src/components/common/AppHeader.tsx:1503` `searchPageContent.gap = spacing.md (16)`
- `src/components/common/AppHeader.tsx:1508` `searchPageInputRow.gap = spacing.sm (12)`
- `src/components/common/AppHeader.tsx:1563` `resultList.gap = spacing.xs (8)`
  - 책 검색 결과 카드 간격
- `src/components/common/AppHeader.tsx:1652` `detailStoryList.gap = spacing.xs (8)`
  - 특정 책 상세 내 책이야기 리스트 간격
- `src/components/common/AppHeader.tsx:1423` `dropdownRecoRow.gap = spacing.xs (8)`

하단 탭바
- `src/navigation/BottomTabs.tsx:177` `tabBar.paddingHorizontal = 10`
- `src/navigation/BottomTabs.tsx:187` `tabBar.paddingTop = 8`
- `src/navigation/BottomTabs.tsx:188` `tabBar.paddingBottom = 8`
- `src/navigation/BottomTabs.tsx:192` `tabItem.paddingVertical = 2`
- `src/navigation/BottomTabs.tsx:193` `tabItem.marginTop = -2`

## 8) 인증 플로우 (Auth)

- `src/screens/AuthFlowScreen.tsx:1549` `content.gap = spacing.md (16)`
- `src/screens/AuthFlowScreen.tsx:1558` `card.gap = spacing.md (16)`
- `src/screens/AuthFlowScreen.tsx:1607` `termsBox.gap = spacing.sm (12)`
- `src/screens/AuthFlowScreen.tsx:1681` `termsModalButtonRow.gap = spacing.sm (12)`
- `src/screens/AuthFlowScreen.tsx:1690` `formGroup.gap = spacing.sm (12)`
- `src/screens/AuthFlowScreen.tsx:1857` `chipGrid.gap = spacing.xs (8)`
- `src/screens/AuthFlowScreen.tsx:1913` `buttonRow.gap = spacing.sm (12)`

---

메모
- 이번 문서는 "컴포넌트 간" 기준으로 정리해서, 카드 내부 텍스트/아이콘 정렬용 `gap`은 의도적으로 제외했습니다.
- `MeetingScreen.tsx`는 규모가 커서 사용자 체감 간격이 큰 영역(검색/홈/관리/공지/책장/채팅/생성) 위주로 분류해 정리했습니다.
