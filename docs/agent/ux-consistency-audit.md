# UX 일관성 & 치명적 이슈 감사

> 작성일: 2026-06-14
> 목적: 바텀시트(중복 컴포넌트)·나가기 경고(흩어진 UX 동작)처럼 **통일이 필요한데 안 된 것**과 **UX적으로 치명적인 것**을 전수 조사한다.
> 표기: ✅직접 코드 확인 / 🔎에이전트 보고(미검증) / 심각도 🔴치명 · 🟡보통 · 🟢사소

---

## A. 🔴 치명적 — 즉시 수정 권장

### A-1. 파괴적 삭제인데 확인창이 없음 ✅확인
대부분의 삭제(12건)는 `Alert.alert` 확인이 있는데 **아래 2건만 빠져서** 한 번 탭하면 즉시 삭제된다.

| 동작 | 위치 | 문제 |
|------|------|------|
| 공지 삭제 | [useNoticeState.ts:1141](../../src/screens/meeting/useNoticeState.ts#L1141) `handleDeleteNotice` | 확인 없이 `deleteClubNotice` 즉시 호출 |
| 책이야기 댓글 삭제 | [StoryScreen.tsx:976](../../src/screens/StoryScreen.tsx#L976) `deleteComment` ← [:1036](../../src/screens/StoryScreen.tsx#L1036) 메뉴에서 직접 호출 | 낙관적 삭제 후 API, 확인 없음 |

> 참고(정상): 책이야기 글 삭제, 모임 삭제/탈퇴, 회원 제외, 책장/발제/한줄평 삭제, 공지 댓글 삭제, 차단/로그아웃 등은 모두 `Alert.alert` 확인 있음.

### A-2. 이중 제출(중복 생성) 방지 없음 ✅확인(등록버튼)
제출 버튼이 처리 중에도 `disabled`되지 않아 연타 시 중복 생성 위험.

| 동작 | 위치 | 문제 |
|------|------|------|
| 책이야기 등록/수정 | [StoryScreen.tsx:2137](../../src/screens/StoryScreen.tsx#L2137) | `submittingStory` 상태는 있으나 버튼에 `disabled` 미적용 ✅ |
| 모임 가입 신청 | [MeetingScreen.tsx:621](../../src/screens/MeetingScreen.tsx#L621) `handleSubmitApply` | 🔎 제출 상태 변수 자체가 없음 |
| 공지 등록/수정 | [useNoticeState.ts:1013](../../src/screens/meeting/useNoticeState.ts#L1013) `handleSubmitNotice` | 🔎 제출 상태 없음, 버튼 disabled 없음 |
| (보통) 책이야기 댓글 / 공지 투표 | StoryScreen / useNoticeState | 🔎 입력 여부만 체크, 처리 중 상태 없음 → 중복 가능 |

> 잘 된 사례(참고 패턴): 로그인/회원가입, 계정설정(이메일/비번/탈퇴), 프로필 수정, 공지 댓글, 발제/한줄평, 신고 — `submitting` 상태 + 버튼 `disabled` 처리됨.

### A-3. API 실패가 조용히 묻힘 🔎
여러 로드 경로가 `if (!(error instanceof ApiError)) { showToast(...) }` 패턴이라, **네트워크/서버 에러(ApiError)면 사용자에게 아무 안내가 없다** → 빈 화면만 보고 원인을 모름.
- 예: 추천 사용자 로드, 내 프로필 로드, 내 모임 목록, 책이야기 상세 등 ([HomeScreen](../../src/screens/HomeScreen.tsx), [MyPageScreen](../../src/screens/MyPageScreen.tsx), [StoryScreen](../../src/screens/StoryScreen.tsx), [UserProfileScreen](../../src/screens/UserProfileScreen.tsx))
- 일부는 `.catch(() => null)`로 종속 요청을 조용히 버림 → 데이터 일부만 비어 보임.

---

## B. 🟡 통일 안 됨 — "바텀시트"와 같은 종류의 분산 문제

### B-1. 확인 다이얼로그 패턴 혼재
`Alert.alert`(OS 기본) / `DialogOverlay`(커스텀) / 화면 자체 Modal 이 섞여 있음. **공용 `ConfirmDialog` 없음** → 룩앤필·동작 제각각.

### B-2. 버튼 분산 🔎
공용 `AppButton`(약 25곳)보다 화면별 커스텀 `Pressable` 버튼(75곳+)이 더 많음. [MeetingScreen](../../src/screens/MeetingScreen.tsx)·[StoryScreen](../../src/screens/StoryScreen.tsx)·[MyPageScreen](../../src/screens/MyPageScreen.tsx)에 각자 스타일 정의.

### B-3. 텍스트 입력 분산 🔎
`FormTextInput` 사용처와 생(raw) `TextInput` 직접 사용처 혼용. 글자수 카운터가 [MeetingListCard](../../src/components/feature/MeetingListCard.tsx) 등 일부에만 있음.

### B-4. 카드/태그/아바타 공용 컴포넌트 부재 🔎
- 공용 `Card`/`Tag`/`Badge` 없음 → 카드별 `padding`/`border`가 `spacing.sm` vs `13`(하드코딩) 식으로 제각각.
- 카테고리→색상 매핑이 [MeetingListCard.tsx:27](../../src/components/feature/MeetingListCard.tsx#L27)에만 하드코딩.
- 아바타 크기 하드코딩, 일부 색상 하드코딩(예: `#3FBE78`).

### B-5. 빈 상태 / 로딩 표시 불일치 🔎
- 빈 상태 메시지: NewsScreen/HomeScreen은 명확, **StoryScreen은 데이터 0개일 때 메시지 없음**.
- 로딩: `SkeletonBox` / 커스텀 스켈레톤 / `BookFlipLoadingScreen` / 표시 없음 혼재.

---

## C. 🟡 UX 위험 (대체로 🔎 추정 — 실제 기기 검증 필요)

| 이슈 | 위치 | 비고 |
|------|------|------|
| 모달에 SafeArea 미적용 | [ReportMemberModal](../../src/components/common/ReportMemberModal.tsx), [DialogOverlay](../../src/components/common/DialogOverlay.tsx) | 노치/하단 인디케이터 기기에서 잘릴 수 있음 |
| 모달 ScrollView `keyboardShouldPersistTaps` 누락 | ReportMemberModal 등 | 입력 중 버튼 탭 시 포커스/키보드 꼬임 가능 |
| 중첩 모달 시 하드웨어 백 우선순위 불명확 | MeetingScreen 다중 Modal | 사용자 갇힘 가능성(추정, 재현 필요) |
| 프로필 편집 BackHandler가 `return true`로 기본 백 차단 | [MyPageScreen.tsx:773](../../src/screens/MyPageScreen.tsx#L773) | 중첩 상태에서 갇힘 가능성(추정) |
| 탭 전환 시 스크롤 위치/상태 초기화 | [MyPageScreen.tsx:1384](../../src/screens/MyPageScreen.tsx#L1384) | 콘텐츠 탐색 흐름 끊김 |

---

## D. 우선순위 권장

1. **🔴 A-1 삭제 확인창 2건 추가** — 가장 적은 노력, 가장 큰 위험 제거. (각 `Alert.alert` 한 블록)
2. **🔴 A-2 이중 제출 방지** — 제출 함수에 `submitting` 가드 + 버튼 `disabled` (책이야기/모임가입/공지).
3. **🔴 A-3 API 에러 안내** — `if (!(error instanceof ApiError))` 무시 패턴 제거, 실패 시 항상 toast.
4. **🟡 B-1 공용 `ConfirmDialog` 도입** → 이후 A-1과 기존 Alert들을 점진 흡수.
5. **🟡 B-2~B-5 공용 컴포넌트화** — 버튼/입력/카드/태그. (바텀시트 통일 작업과 함께 진행)
6. **🟡 C 검증** — 실제 iOS/Android 기기에서 모달 SafeArea·하드웨어 백·키보드 재현 후 대응.

> 관련 문서: [bottomsheet-unification-plan.md](bottomsheet-unification-plan.md), [edit-discard-warning-audit.md](edit-discard-warning-audit.md)
