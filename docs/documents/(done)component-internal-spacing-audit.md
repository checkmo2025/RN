# RN 컴포넌트 내부 간격 인벤토리 (내부 간격 기준)

- 작성일: 2026-05-05
- 기준 토큰: `src/theme/spacing.ts` (`xxs=4`, `xs=8`, `sm=12`, `md=16`, `lg=20`, `xl=24`, `xxl=32`)
- 연결 문서:
  - 외부 간격 인벤토리: `(done)component-spacing-audit.md`
  - spacing 정책 가이드: `(done)ui-spacing-token-consistency.md`

## 1) 점검 기준

- 포함:
  - 카드/리스트 아이템/모달 본문/버튼/입력폼 내부 `padding`, `gap`, 내부 구획 `margin`.
  - 같은 컴포넌트 내부에서 텍스트-아이콘/섹션 사이 리듬.
- 제외:
  - 화면 블록 간 여백, 리스트 아이템 간격, 섹션 간 외부 간격.

---

## 2) 입력폼 내부 간격

| 구분 | 내부 간격 규칙 | 위치 |
|------|----------------|------|
| 공통 1줄 입력 | `height: 56`, `paddingHorizontal: spacing.md` | `src/theme/inputStyles.ts:8` |
| 공통 multiline 입력 | `minHeight: 88`, `paddingHorizontal: spacing.md`, `paddingVertical: spacing.sm` | `src/theme/inputStyles.ts:20` |
| 인증 기본 입력 | `height: 56`, `paddingHorizontal: spacing.md`, `paddingVertical: 0` | `src/screens/AuthFlowScreen.tsx:1580` |
| 모임 가입신청 입력 | `height: 148`, `paddingHorizontal: spacing.md`, `paddingVertical: spacing.sm` | `src/components/feature/groups/MeetingListCard.tsx:302` |
| 신고 내용 입력 컨테이너 | `minHeight: 220`, `paddingHorizontal: spacing.sm`, `paddingVertical: spacing.sm` | `src/components/common/ReportMemberModal.tsx:271` |
| 신고 내용 입력 본문 | `minHeight: 200` (텍스트영역), 컨테이너와 분리 | `src/components/common/ReportMemberModal.tsx:280` |

관찰:
- 입력 높이 기준은 `56`으로 잘 맞춰져 있음.
- 입력 내부 세로 간격은 `spacing.sm` 중심으로 수렴.
- 예외값 `paddingVertical: 0`은 descender 보정(`inputDescenderSafe`)과 세트로 사용됨 (`src/screens/AuthFlowScreen.tsx:1593`).

---

## 3) 버튼 내부 간격

| 구분 | 내부 간격 규칙 | 위치 |
|------|----------------|------|
| 공통 버튼 베이스(`AppButton`) | `paddingHorizontal: spacing.md` + 중앙정렬 | `src/components/common/PrimaryButton.tsx:96` |
| 공통 버튼 md | `paddingVertical: spacing.sm + 2` | `src/components/common/PrimaryButton.tsx:107` |
| 공통 버튼 lg | `height: 52` | `src/components/common/PrimaryButton.tsx:104` |
| 메뉴 행 버튼 | `minHeight: 40`, `paddingVertical: spacing.xs + 2`, `paddingHorizontal: spacing.md` | `src/components/common/ActionMenu.tsx:144` |
| 사용자 구독 버튼 | `paddingVertical: spacing.xs + 2`, `paddingHorizontal: spacing.sm + 2` | `src/components/feature/member/SubscribeUserItem.tsx:109` |
| 카드 내 구독칩(스토리) | `paddingVertical: spacing.xs`, `paddingHorizontal: spacing.sm|md` | `src/components/feature/bookstory/BookStoryCard.tsx:191`, `src/components/feature/bookstory/BookStoryFeedCard.tsx:228` |

관찰:
- 공용 CTA는 `AppButton` 기준으로 꽤 통일됨.
- 카드 내 보조 버튼은 `xs/sm` 계열로 별도 리듬을 유지.

---

## 4) 카드 내부 간격

| 구분 | 내부 간격 규칙 | 위치 |
|------|----------------|------|
| 홈 추천 카드 | `padding: spacing.md`, `gap: spacing.sm` | `src/screens/HomeScreen.tsx:603` |
| 홈 2열 카드 | `padding: spacing.md`, `gap: spacing.sm` | `src/components/feature/home/HomeColumns.tsx:96` |
| 소식 카드 | `padding: spacing.md`, `gap: spacing.md` | `src/screens/NewsScreen.tsx:826` |
| 소식 추천 썸네일 카드 | `padding: spacing.sm`, 텍스트영역 `gap: spacing.xs / 2` | `src/screens/NewsScreen.tsx:751`, `src/screens/NewsScreen.tsx:766` |
| 책이야기 피드 카드 | `paddingHorizontal: spacing.md`, `paddingVertical: spacing.sm`, `gap: spacing.sm` | `src/components/feature/bookstory/BookStoryFeedCard.tsx:182` |
| 책이야기 일반/대형 카드 | `padding: spacing.md`, `gap: spacing.sm` | `src/components/feature/bookstory/BookStoryCard.tsx:151`, `src/components/feature/bookstory/BookStoryCardLarge.tsx:102` |
| 모임 목록 카드 | `paddingTop: 13`, `paddingBottom: 13`, `paddingHorizontal: 14`, `gap: spacing.xs` | `src/components/feature/groups/MeetingListCard.tsx:171` |
| 내 모임 드롭다운 카드 | `padding: spacing.md`, `gap: spacing.xs` | `src/components/feature/groups/MyGroupsDropdownCard.tsx:88` |
| 프로필/마이페이지 스토리 카드 | `padding: spacing.sm`, `gap: spacing.xs` | `src/screens/UserProfileScreen.tsx:1170`, `src/screens/MyPageScreen.tsx:3514` |
| 프로필/마이페이지 서재 카드 | `padding: spacing.xs`, `gap: spacing.xs / 2` | `src/screens/UserProfileScreen.tsx:1233`, `src/screens/MyPageScreen.tsx:3577` |

관찰:
- 대부분 `md > sm > xs` 스케일 안에서 일관적.
- `MeetingListCard`만 `13/14` 커스텀 패딩을 사용해 독립 리듬.

---

## 5) 리스트 아이템 내부 간격

| 구분 | 내부 간격 규칙 | 위치 |
|------|----------------|------|
| 사용자 추천 아이템 | 컨테이너 `paddingHorizontal: spacing.sm + 2`, `paddingVertical: spacing.xs + 2`, 행 `gap: spacing.sm` | `src/components/feature/member/SubscribeUserItem.tsx:68` |
| 팔로우 목록 행 | `paddingVertical: spacing.sm`, `paddingHorizontal: spacing.md`, 메타 `gap: spacing.sm` | `src/screens/UserProfileScreen.tsx:1353` |
| 모임/알림 등 행 | `paddingVertical: spacing.sm`, `paddingHorizontal: spacing.md` | `src/screens/MyPageScreen.tsx:3625` |
| 액션/푸터 인라인 행 | 주로 `gap: spacing.xs` 또는 `spacing.xs / 2` | `src/components/feature/bookstory/BookStoryCard.tsx:264`, `src/components/feature/bookstory/BookStoryFeedCard.tsx:310` |

관찰:
- 리스트 row는 `sm/md` 패딩 조합이 사실상 표준.
- 행 내부 텍스트/아이콘 간격은 `xs` 또는 `xs/2`로 수렴.

---

## 6) 모달/바텀시트 본문 내부 간격

| 구분 | 내부 간격 규칙 | 위치 |
|------|----------------|------|
| 약관 모달 카드 | `padding: spacing.md`, `gap: spacing.sm`, 버튼행 `gap: spacing.sm` | `src/screens/AuthFlowScreen.tsx:1517` |
| 프로필 색상 모달 카드 | `paddingHorizontal/Vertical: spacing.lg`, `gap: spacing.md` | `src/screens/AuthFlowScreen.tsx:1691` |
| 마이페이지 아바타 모달 카드 | `padding: spacing.lg`, `gap: spacing.md` | `src/screens/MyPageScreen.tsx:2979` |
| 책 선택 바텀시트 | `padding: spacing.md`, `gap: spacing.sm`, 입력행 `gap: spacing.sm` | `src/screens/StoryScreen.tsx:2570` |
| 신고 모달 카드 | `padding: spacing.md`, `gap: spacing.sm`, 내용박스 `padding: spacing.sm` | `src/components/common/ReportMemberModal.tsx:184` |
| 투표자 모달 카드 | `padding: spacing.sm`, `gap: spacing.sm`, row `paddingVertical: spacing.xs / 2` | `src/screens/MeetingScreen.tsx:3688` |
| Contact 모달 카드 | `paddingHorizontal/Vertical: spacing.lg`, `gap: spacing.lg` | `src/screens/MeetingScreen.tsx:3766` |

관찰:
- 모달 본문은 `md/sm` 계열, 안내형 모달은 `lg` 계열로 명확히 분리.
- 모달 카드 패턴 자체는 `DialogOverlay`/`BottomSheet` 공용화 이후 안정적.

---

## 7) 내부 간격 하드코딩 예외 스냅샷

다음 값들은 내부 간격 관점에서 반복적으로 보이는 숫자 예외값:

- `MeetingListCard`: `13`, `14`, `6`, `2` (`src/components/feature/groups/MeetingListCard.tsx:177`)
- `ReportMemberModal`: `targetMeta.gap: 2` (`src/components/common/ReportMemberModal.tsx:230`)
- 일부 화면 내부 보정값: `marginTop: 2`, `paddingVertical: 2/0` (`src/screens/StoryScreen.tsx:2822`, `src/screens/AuthFlowScreen.tsx:1587`)
- 피드 카드 외부 보정이지만 내부 리듬에 영향 가능: `marginHorizontal: 18` (`src/components/feature/bookstory/BookStoryFeedCard.tsx:190`)

해석:
- `2`는 미세 정렬/타이포 보정 성격이 강함.
- `13/14/18`은 레이아웃 아이덴티티 값이라 토큰화 여부를 별도 판단해야 함.

---

## 8) 정리 의견 (실행안)

1. 외부/내부 문서 분리 유지
- 외부: `(done)component-spacing-audit.md`
- 내부: `(done)component-internal-spacing-audit.md` (현재 문서)

2. 내부 spacing 표준 세트 고정
- 기본: `card(md)`, `item(sm/md)`, `chip(xs/sm)`, `modal(md|lg)`
- 미세 보정: `xs/2` 우선, 숫자 하드코딩은 예외 주석 필수

3. 1차 정리 우선순위
- `MeetingListCard`의 `13/14/6/2` 규칙을 토큰/의도 주석으로 정리
- `ReportMemberModal` `gap: 2` 등 미세값을 `spacing.xs / 2`로 치환 가능한지 검토
- 입력 폼 계열(`AuthFlow`, `MyPage`, `Meeting`)의 `paddingVertical: 0/2` 보정 규칙 공통 문구화
