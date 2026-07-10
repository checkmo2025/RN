# 바텀시트 통일 계획

> 작성일: 2026-06-14
> 목적: 앱 전반에 흩어진 바텀시트 구현을 하나의 공용 컴포넌트로 통일한다.

## 1. 현황 (As-Is)

현재 바텀시트는 **3가지 서로 다른 방식**으로 구현되어 있다.

| # | 위치 | 용도 | 구현 방식 | 닫기 방식 |
|---|------|------|-----------|-----------|
| A | [BottomSheet.tsx](../../src/components/common/BottomSheet.tsx) → [StoryScreen.tsx:2145](../../src/screens/StoryScreen.tsx#L2145) | 책 검색 (`showBookPicker`) | 공용 `BottomSheet` 컴포넌트 (Modal `slide` + KeyboardAvoiding) | 백드롭 탭 |
| B | [GroupManagementOverlay.tsx:1241](../../src/screens/meeting/GroupManagementOverlay.tsx#L1241) | 모임 관리하기 메뉴 (`managementMenuVisible`) | `Animated.View` + `translateY` + `PanResponder` 드래그 (커스텀) | 핸들 드래그 / 풀다운 / 백드롭 탭 |
| C | [MeetingScreen.tsx:2946](../../src/screens/MeetingScreen.tsx#L2946) | 공지 메뉴 수정/삭제/신고 (`noticeMenuVisible`) | Modal `fade` + Pressable 백드롭 (커스텀) | 백드롭 탭 |

### 문제점
- **컴포넌트 분산**: 공용 컴포넌트(A)를 쓰는 곳은 1곳뿐, 나머지(B·C)는 화면 안에 직접 구현.
- **스타일 중복**: `bookPickerSheet`, `managementMenuSheet`, `managementBottomSheet` 가 거의 같은 시트 스타일(흰 배경 / 상단 라운드 / flex-end 백드롭)을 각자 정의.
- **백드롭 중복**: `bookPickerBackdrop`, `managementOverlay`, `managementOverlayBottom` 가 동일한 `overlay30 + flex-end` 패턴을 반복.
- **인터랙션 불일치**: 드래그 핸들(B)은 모임 관리 메뉴에만 있고 나머지엔 없음. 애니메이션도 `slide`(A) / `Animated.spring`(B) / `fade`(C)로 제각각.
- **유지보수 비용**: 시트 공통 동작(키보드 회피, safe-area 하단 패딩, 백드롭 탭 닫기)을 바꾸려면 3곳을 따로 손봐야 함.

## 2. 목표 (To-Be)

모든 바텀시트가 **단일 공용 컴포넌트 `BottomSheet`** 를 사용한다.

- 공통: Modal 래핑 / 백드롭 탭 닫기 / 키보드 회피 / safe-area 하단 패딩 / 상단 라운드.
- 옵션: 드래그 핸들 + 풀다운 닫기(B의 PanResponder 로직을 컴포넌트로 흡수).
- 스타일: 시트/백드롭 기본값을 컴포넌트가 제공, 화면은 내용(children)만 책임.

## 3. 공용 컴포넌트 확장안

기존 [BottomSheet.tsx](../../src/components/common/BottomSheet.tsx) 를 확장한다.

```tsx
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // 신규 옵션
  showHandle?: boolean;          // 드래그 핸들 표시 (기본 false)
  enablePanToClose?: boolean;    // 풀다운으로 닫기 (기본 showHandle과 동일)
  title?: string;                // 시트 상단 타이틀(선택)
  maxHeightRatio?: number;       // 시트 최대 높이 비율 (기본 0.82)
  keyboardBehavior?: 'padding' | 'height' | 'position';
  // 스타일 오버라이드(선택) — 기본 스타일을 컴포넌트가 제공
  backdropStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
}
```

- `Animated.Value` + `PanResponder` 드래그 로직을 [useManagementState.ts:86-160](../../src/screens/meeting/useManagementState.ts#L86) 에서 추출해 컴포넌트 내부 훅으로 이전.
- 백드롭 기본 스타일(`overlay30 + flex-end`)과 시트 기본 스타일(흰 배경 / 상단 라운드 / safe-area 하단 패딩)을 컴포넌트에 내장.

## 4. 마이그레이션 단계

### Phase 1 — 컴포넌트 강화 (선행)
1. `BottomSheet`에 `showHandle` / `enablePanToClose` / `title` / `maxHeightRatio` 옵션 추가.
2. 드래그 핸들 + PanResponder 로직 내장, safe-area 하단 패딩 적용.
3. 기본 백드롭/시트 스타일 내장 (`backdropStyle`/`sheetStyle`는 오버라이드 용도로 유지).
4. Storybook/단독 화면 또는 임시 토글로 동작 검증.

### Phase 2 — 기존 사용처 이관
- **C (공지 메뉴)**: 가장 단순 → 먼저 이관. `Modal fade` + `managementBottomSheet*` 제거하고 `<BottomSheet>`로 교체. (메뉴 항목만 children)
- **B (모임 관리 메뉴)**: `enablePanToClose + showHandle` 옵션으로 교체. `useManagementState`의 `managementSheetY` / `managementHandlePanResponder` / `closeManagementMenu` 애니메이션 코드 제거.
- **A (책 검색)**: 이미 공용 컴포넌트 사용 → props만 신규 시그니처에 맞춰 정리(중복 스타일 제거).

### Phase 3 — 정리
- 중복 스타일 삭제: `bookPickerBackdrop`/`bookPickerSheet`, `managementOverlay(Bottom)`, `managementMenuSheet`, `managementBottomSheet*`, `managementHandle*`.
- `useManagementState`에서 시트 애니메이션 관련 state/handler 제거.
- 전체화면 slide 모달(`조 관리하기`·`공지 작성하기`)은 **바텀시트 아님** → 이번 통일 대상에서 제외(별도 풀스크린 패턴 유지).

## 5. 영향 범위 / 주의

- **제외 대상**: [MeetingScreen.tsx:1985](../../src/screens/MeetingScreen.tsx#L1985)(`조 관리하기`), [MeetingScreen.tsx:2508](../../src/screens/MeetingScreen.tsx#L2508)(`공지 작성/수정하기`)는 전체화면 `slide` 화면이므로 바텀시트 통일 대상이 아님.
- **인터랙션 회귀 주의**: B의 풀다운 닫기 + 스크롤 연동(`handleManagementMenuScroll`, `closingManagementMenuByPull`) 로직을 컴포넌트로 옮길 때 스크롤 상단에서만 풀다운이 닫히도록 하는 조건을 유지해야 함.
- **키보드**: A(책 검색)는 TextInput 포함 → `keyboardBehavior` 유지 필수.
- **검증**: 각 시트 열기/닫기/드래그/백드롭 탭/키보드 회피를 iOS·Android 양쪽에서 확인.

## 6. 작업 체크리스트

- [ ] Phase 1: `BottomSheet` 컴포넌트 옵션 확장 + 드래그/safe-area 내장
- [ ] Phase 2-C: 공지 메뉴 이관
- [ ] Phase 2-B: 모임 관리 메뉴 이관 (`useManagementState` 정리)
- [ ] Phase 2-A: 책 검색 props 정리
- [ ] Phase 3: 중복 스타일/state 제거
- [ ] iOS·Android 회귀 검증
