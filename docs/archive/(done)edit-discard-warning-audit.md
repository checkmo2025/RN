# 편집 화면 "변경 후 나가기" 경고 감사 & 통일 계획

> 작성일: 2026-06-14
> 목적: 사용자가 **내용을 변경한 채로** 화면을 나가거나 뒤로가기를 누를 때 경고창(저장 안 됨 확인)을 띄우는 기능의 현황을 전수 조사하고, 통일 방안을 정한다.
> 원칙: **내용을 바꾸지 않고 나가면 경고 없음**, **내용을 바꾼 뒤 나가면 경고** (dirty 판정은 초기값 대비 비교).

## 1. 현황 요약

> 아래 표는 감사 작성 시점의 현황이다. 2026-06-14 적용 결과는 `8. 적용 결과`를 기준으로 본다.

| 상태 | 플로우 수 | 비고 |
|------|-----------|------|
| ✅ 완전 구현 | 2 | 모임 생성, 프로필 편집 |
| ⚠️ 부분 구현 | 3 | 책이야기 글/댓글, 회원가입 프로필 단계 |
| ❌ 미구현 | 8 | 공지·발제/한줄평·모임정보·책장·비번·이메일·공지댓글·조관리 |

## 2. 상세 — ✅ 완전 구현 (초기값 대비 비교 + 나가기 경고)

| 플로우 | 위치 | 방식 |
|--------|------|------|
| 모임 생성 | [MeetingScreen.tsx:560](../../src/screens/MeetingScreen.tsx#L560), [:3169](../../src/screens/MeetingScreen.tsx#L3169) | 초기값 대비 `isDirty` + `beforeRemove` + `tabPress`. "현재 페이지는 저장되지 않습니다" |
| 프로필 편집 | [MyPageScreen.tsx:744](../../src/screens/MyPageScreen.tsx#L744) | 원본 대비 `isDirty` + `Alert` + Android `BackHandler`. "변경된 내용이 저장되지 않습니다" |

이 둘이 **레퍼런스 패턴**이다. 나머지를 여기에 맞춘다.

## 3. 상세 — ⚠️ 부분 구현 (보완 필요)

| 플로우 | 위치 | 문제점 |
|--------|------|--------|
| 책이야기 글 작성/수정 | [StoryScreen.tsx:434](../../src/screens/StoryScreen.tsx#L434), [:1662](../../src/screens/StoryScreen.tsx#L1662) | `beforeRemove`+`tabPress`는 있으나 dirty가 **"비어있지 않음" 단순 체크**(초기값 비교 X) → 입력 후 지우면 경고 안 뜸. **상세화면 닫기/뒤로 스와이프는 미보호** |
| 댓글 작성/수정/대댓글 | [StoryScreen.tsx:434](../../src/screens/StoryScreen.tsx#L434) | 동일. 원본 댓글과 비교 안 함. 상세 닫기 미보호 |
| 회원가입 프로필 단계 | [AuthFlowScreen.tsx:662](../../src/screens/AuthFlowScreen.tsx#L662) | `confirmClose` 경고가 약관~비밀번호 단계에만 적용, **프로필 입력 단계엔 비활성** |

## 4. 상세 — ❌ 미구현 (변경 후 나가도 그냥 닫힘)

| 우선순위 | 플로우 | 위치 | 비고 |
|---------|--------|------|------|
| 🔴 높음 | 공지 작성/수정 | [useNoticeState.ts](../../src/screens/meeting/useNoticeState.ts) `handleCloseNoticeComposer` | 본문 길게 쓰는 화면 |
| 🔴 높음 | 발제/한줄평 작성/수정 | [useBookshelfState.ts:979](../../src/screens/meeting/useBookshelfState.ts#L979) `closeBookshelfComposer` | 본문 입력 |
| 🔴 높음 | 모임 정보 수정 | [useManagementState.ts:408](../../src/screens/meeting/useManagementState.ts#L408) `editDraft` | 여러 필드 편집 |
| 🔴 높음 | 책장 생성/수정 | [useBookshelfState.ts:1749](../../src/screens/meeting/useBookshelfState.ts#L1749) | 여러 필드 편집 |
| 🟡 중간 | 비밀번호 변경 | [MyPageScreen.tsx:1729](../../src/screens/MyPageScreen.tsx#L1729) | 입력 폼 |
| 🟡 중간 | 이메일 변경 | [MyPageScreen.tsx:2026](../../src/screens/MyPageScreen.tsx#L2026) | 입력 폼, 인증코드 상태 잔존 가능 |
| 🟢 낮음 | 공지 댓글 수정(inline) | [useNoticeState.ts:609](../../src/screens/meeting/useNoticeState.ts#L609) | inline 편집, 영향 작음 |
| ⚪ 불필요 | 조 관리하기 | drag&drop 즉시 반영 | 즉시 저장형 — 경고 대상 아님 |

## 5. 공통 문제 & 통일 방향

### 문제
- 경고 로직이 화면마다 제각각(`beforeRemove` / `BackHandler` / `Alert` / `confirmClose`)으로 흩어짐.
- dirty 판정 기준 불일치: 일부는 **초기값 대비 비교**(올바름), 일부는 **"비어있지 않음" 체크**(허술).
- 닫기 경로 누락: 헤더 뒤로가기/닫기 버튼, 백드롭 탭, 하드웨어 백, 탭 전환 중 일부만 보호됨.

### 통일안 — 공용 훅 `useUnsavedChangesGuard`
모든 편집 화면이 동일한 훅을 쓰도록 한다.

```ts
// 제안 시그니처
function useUnsavedChangesGuard(params: {
  enabled: boolean;        // 편집 모드 진입 여부
  isDirty: boolean;        // 초기값 대비 실제 변경 여부 (호출부에서 계산)
  onConfirmLeave: () => void;
  message?: string;        // 기본: "변경된 내용이 저장되지 않습니다."
}): {
  // 헤더 닫기/백드롭 등 수동 닫기 핸들러에서 호출
  requestClose: () => void;
}
```

훅이 책임지는 것:
- `navigation` 의 `beforeRemove` (뒤로가기/제스처)
- 부모 네비게이터 `tabPress` (탭 전환)
- Android `BackHandler` (하드웨어 백)
- 수동 닫기(`requestClose`)에서 동일 Alert 노출

호출부 책임:
- `isDirty` 계산은 **반드시 초기값(원본) 대비 비교**로 작성. (배열은 정렬 후 비교 — 프로필 편집의 카테고리 비교 방식 참고)

### dirty 판정 규칙(통일)
- 신규 작성: 모든 입력 필드가 초기 빈 상태에서 **하나라도 채워지면** dirty.
- 수정: **원본 값과 다르면** dirty. (입력했다 지워서 원본과 같아지면 dirty 아님)
- 단순 `trim().length > 0` 체크는 금지 — 수정 모드에서 오판함.

## 6. 작업 계획 (단계)

### Phase 0 — 공용 훅 도입
- [x] `src/hooks/useUnsavedChangesGuard.ts` 작성 (beforeRemove + tabPress + BackHandler + requestClose 통합)
- [ ] 레퍼런스인 **프로필 편집/모임 생성**을 훅 기반으로 리팩터링(기존 동작 유지, 별도 리팩터링 대상)

### Phase 1 — 🔴 높음 (본문/다필드 편집)
- [x] 공지 작성/수정 (`useNoticeState`)
- [x] 발제/한줄평 작성/수정 (`useBookshelfState`)
- [x] 모임 정보 수정 (`useManagementState`, `editDraft` 원본 대비 비교)
- [x] 책장 생성/수정 (`useBookshelfState`, draft 원본 대비 비교)

### Phase 2 — ⚠️ 부분 구현 보완
- [x] 책이야기 글/댓글: dirty를 **원본 대비 비교**로 교체 + 상세화면 닫기/스와이프 경로 보호
- [x] 회원가입 프로필 단계: 프로필 입력값이 있을 때만 `confirmClose` 활성화

### Phase 3 — 🟡 중간
- [x] 비밀번호 변경, 이메일 변경 경고 추가

### 제외
- 공지 댓글 inline 편집(영향 작음 — 여력 될 때), 조 관리(즉시 반영형)

## 7. 검증 체크리스트 (각 플로우 공통)
- [ ] 내용 **안 바꾸고** 나가기 → 경고 없이 닫힘
- [ ] 내용 **바꾸고** 뒤로가기 → 경고
- [ ] 내용 바꾸고 헤더 닫기/백드롭 탭 → 경고
- [ ] 내용 바꾸고 Android 하드웨어 백 → 경고
- [ ] 내용 바꾸고 탭 전환 → 경고
- [ ] 입력했다 **원복(지움)** 후 나가기 → 경고 없음
- [ ] iOS · Android 양쪽 확인

## 8. 적용 결과 (2026-06-14)

- 공용 훅 `useUnsavedChangesGuard` 추가: 수동 닫기, 네비게이션 이탈, 탭 전환, Android 하드웨어 백을 동일 Alert로 처리.
- 공지 작성/수정, 발제/한줄평 작성/수정, 모임 정보 수정, 책장 생성/수정에 초기값 대비 dirty 판정 적용.
- 책이야기 글/댓글/대댓글은 원본 대비 dirty 판정으로 교체하고, 상세 닫기/뒤로 스와이프 경로도 보호.
- 회원가입 프로필 단계는 프로필 입력값이 있을 때만 닫기 확인을 띄우도록 조정.
- 마이페이지 비밀번호/이메일 변경은 입력값 또는 이메일 인증 상태가 남아 있으면 이탈 경고를 띄움.
- 공지 댓글 inline 편집과 조 관리는 이번 범위에서 제외.
