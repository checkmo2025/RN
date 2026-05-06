# MeetingScreen 분해 설계 문서

> 목적: `MeetingScreen.tsx`(13,492줄)를 도메인 단위로 분리해 유지보수성 개선
> 원칙: UI·로직 변경 없이 구조만 이동. 각 단계는 독립 커밋으로 관리.

---

## 현재 파일 구조

```
src/screens/MeetingScreen.tsx  (13,492줄)
├── imports / types
├── 상수 (categoryLabelByCode, participantLabelByCode 등)
├── 순수 유틸 함수 (formatters, mappers)  ← MEET-SPLIT-02 대상
├── async 유틸 (pickAndUploadImage, fetchAllClubBookshelvesWithCursor)
├── export function MeetingScreen()       ← 검색/목록 (탭 진입점)
│   ├── state: myGroups, discoverGroups, search 관련
│   ├── effects: 탭 네비게이션, route params, 그룹 로드
│   └── return: 검색 UI + 목록
├── styles (MeetingScreen)
├── 상수 + 타입 (GroupHomeView 전용)
├── function GroupHomeView()              ← 모임 홈 (가장 큰 컴포넌트)
│   ├── state: activeTab, notice, bookshelf, regularMeeting, chat, management
│   ├── effects: workspace reload, notice, bookshelf, chat
│   ├── handlers: 70개+ (notice/bookshelf/chat/management 도메인 혼재)
│   └── return: 탭 UI + 각 도메인 뷰
└── function MeetingCreateFlow()          ← 모임 생성 플로우
```

---

## 도메인 경계 정의

| 도메인 | 범위 | 상태/핸들러 수(추정) |
|---|---|---|
| **search** | MeetingScreen 전체 | state×8, effect×6, handler×6 |
| **home** | GroupHomeView 홈 탭 | state×4, effect×3, handler×5 |
| **notice** | 공지 탭 + 댓글 + 투표 | state×8, effect×4, handler×15 |
| **bookshelf** | 책장 탭 + 발제/리뷰 + 달력 | state×12, effect×5, handler×20 |
| **regularMeeting** | 정기모임 + 팀 채팅 | state×6, effect×3, handler×8 |
| **management** | 관리 패널 + 팀 편성 + 멤버 관리 | state×10, effect×2, handler×15 |

---

## 목표 파일 구조

```
src/screens/meeting/
├── formatters.ts          ✅ MEET-SPLIT-02 완료 (순수 포매터 16개)
├── mappers.ts             ✅ MEET-SPLIT-02 완료 (변환 함수 6개)
├── types.ts               ← MEET-SPLIT-02 후속 (Group, 로컬 타입 이동)
├── constants.ts           ← MEET-SPLIT-02 후속 (categoryLabelByCode 등)
├── useNoticeState.ts      ← MEET-SPLIT-03
├── useBookshelfState.ts   ← MEET-SPLIT-03
├── useChatState.ts        ← MEET-SPLIT-03
├── useManagementState.ts  ← MEET-SPLIT-03
└── views/
    ├── NoticeView.tsx     ← MEET-SPLIT-04
    ├── BookshelfView.tsx  ← MEET-SPLIT-04
    ├── ChatView.tsx       ← MEET-SPLIT-04
    └── ManagementView.tsx ← MEET-SPLIT-04
```

---

## 단계별 실행 계획

### MEET-SPLIT-02: mapper/formatter 순수 함수 분리 ✅

**완료 내용:**
- `formatters.ts`: formatDotDateValue/Date/DateTime, toApiDateTime, toTeamLabel, parseGenerationNumber, formatGenerationLabel, sanitizeGenerationInput, inferMimeType, parseDotDate, formatCalendarMonthLabel, buildCalendarDays, toOpenableContactLink, formatRegularGroupLabel, getTeamManageTargetKey, toGroupTargets (16개)
- `mappers.ts`: toLabelList, normalizeClubContacts, formatContactLabel, mapClubStatusToApplication, resolveMeetingSearchErrorMessage, resolveBookshelfActionErrorMessage (6개)
- MeetingScreen.tsx에서 함수 본체 제거 → import로 교체

**잔여(후속):** `Group` 등 로컬 타입 + `categoryLabelByCode` 상수 → `types.ts` / `constants.ts` 분리

---

### MEET-SPLIT-03: 도메인별 hook 분리

분리 기준: 도메인별 state + effect + API 호출을 단일 hook 파일로 묶기

| 파일 | 주요 state | 주요 effect |
|---|---|---|
| `useNoticeState.ts` | noticePage, selectedNoticeId, noticeComments, vote 관련 | 공지 로드, 댓글 로드, 투표 상태 |
| `useBookshelfState.ts` | bookshelfItems, selectedBook, composer, calendar | 책장 로드, 발제/리뷰 로드, 달력 |
| `useChatState.ts` | regularGroupChats, chatInput, activeGroup | 채팅 구독, 메시지 로드 |
| `useManagementState.ts` | joinRequests, members, teamManage 관련 | 가입 요청 로드, 멤버 로드 |

**주의:** hook 파일은 UI import 없이 순수 상태/로직만 포함

---

### MEET-SPLIT-04: 하위 View 컴포넌트 분리

| 파일 | JSX 범위 | props 계약 |
|---|---|---|
| `NoticeView.tsx` | 공지 탭 전체 (목록 + 상세 + 댓글 + 투표) | notices, selectedId, handlers |
| `BookshelfView.tsx` | 책장 탭 전체 (그리드 + 상세 + 발제/리뷰 + 달력) | items, selectedBook, handlers |
| `ChatView.tsx` | 정기모임 채팅 패널 | groups, messages, handlers |
| `ManagementView.tsx` | 관리 패널 (가입요청 + 멤버 + 팀편성) | requests, members, handlers |

---

### MEET-SPLIT-05: MeetingScreen 컨테이너 축소 (조립 전용화)

- GroupHomeView에서 hook 조립 + View 조립만 담당
- 직접 보유 state/effect 최소화 (라우팅/탭 전환만 유지)
- 완료 기준: 파일 길이 목표 < 5,000줄, 내부 state 50% 감소

---

## 변경 불가 원칙

- 기존 동작 변경 금지 (리팩토링 커밋은 기능 변경 없음)
- StyleSheet 위치 변경 금지 (컴포넌트 파일 내 유지)
- 각 단계별 `tsc --noEmit` 통과 필수
