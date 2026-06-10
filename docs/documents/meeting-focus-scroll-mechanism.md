# 모임 화면 포커싱/스크롤 메커니즘

> 파일: `src/screens/MeetingScreen.tsx` → `GroupHomeView` 함수 컴포넌트 내부  
> 관련 파일: `src/screens/meeting/GroupBookshelfView.tsx`

---

## 개요

모임 내부 화면(`GroupHomeView`)은 단일 `ScrollView` 위에 홈·공지·책장 탭 콘텐츠를 모두 쌓는 구조다.  
탭 전환이나 특정 항목 열기 시, 스크롤 위치를 **그룹 타이틀 기준점**으로 맞춰주는 포커싱 로직이 존재한다.

---

## 핵심 refs

| ref | 위치 | 역할 |
|-----|------|------|
| `groupHomeScrollRef` | `MeetingScreen` | 메인 ScrollView 참조 — `scrollTo()` 호출에 사용 |
| `groupTitleAnchorYRef` | `MeetingScreen` | 그룹 타이틀(`<Text>`)의 레이아웃 Y좌표 캐시 |
| `hasFocusedGroupTitleRef` | `MeetingScreen` | 초기 1회 포커싱 완료 여부 플래그 |
| `shouldScrollToBookshelfDetailRef` | `MeetingScreen` → `GroupBookshelfView` | 책장 상세 섹션 열릴 때 스크롤 트리거 신호 |
| `detailSectionYRef` | `GroupBookshelfView` | 책장 상세 섹션의 레이아웃 Y좌표 캐시 |

---

## 포커싱 흐름

### 1. 초기 포커싱 (`handleGroupTitleLayout`)

```
그룹 타이틀 onLayout 발화
  → groupTitleAnchorYRef에 Y좌표 저장
  → hasFocusedGroupTitleRef가 false이면 focusGroupTitle(animated: false) 호출
  → hasFocusedGroupTitleRef = true (이후 재발화 무시)
  → group.id 변경 시 hasFocusedGroupTitleRef = false로 리셋
```

### 2. 탭 전환 포커싱 (`handlePressGroupTab`)

```
홈/공지/책장 탭 버튼 탭
  → setActiveTab(nextTab)
  → focusGroupTitle(animated: true)
  (비로그인 시 requireAuth로 래핑)
```

### 3. 공지 상세 열기 포커싱

```
selectedNoticeId 변경 (null → id)
  → useEffect 발화 → focusGroupTitle(animated: true)
```

### 4. 책장 상세 섹션 자동 스크롤 (`shouldScrollToBookshelfDetailRef`)

```
openBookshelfDetail 호출
  → shouldScrollToBookshelfDetailRef.current = true
  → GroupBookshelfView의 상세 섹션이 마운트/레이아웃
  → onLayout 콜백: detailSectionYRef에 Y좌표 저장
  → shouldScrollToBookshelfDetailRef.current == true이면
      scrollTo(detailSectionYRef - spacing.sm, animated: true)
      shouldScrollToBookshelfDetailRef.current = false
```

### 5. 정기모임 조 보기 자동 스크롤 (`GroupBookshelfView useEffect`)

```
bookshelfViewMode → 'REGULAR_GROUP' 전환
  → requestAnimationFrame(() => scrollTo(detailSectionYRef - spacing.sm, animated: true))
```

---

## `focusGroupTitle` 구현

```ts
const focusGroupTitle = useCallback((animated: boolean) => {
  const targetY = Math.max(0, groupTitleAnchorYRef.current - spacing.xs);
  requestAnimationFrame(() => {
    groupHomeScrollRef.current?.scrollTo({ y: targetY, animated });
  });
}, []);
```

- `groupTitleAnchorYRef.current - spacing.xs` → 타이틀 바로 위 약간의 여백 확보
- `requestAnimationFrame` → 레이아웃 커밋 이후 스크롤 실행 보장

---

## 현재 확인 필요 사항

- [ ] 탭 전환 시 `focusGroupTitle` 타이밍이 스켈레톤 로딩과 충돌하는지 확인
- [ ] `shouldScrollToBookshelfDetailRef` 가 초기 로딩 스켈레톤 표시 중 트리거될 경우 스크롤 동작 확인
- [ ] `hasFocusedGroupTitleRef` 리셋이 워크스페이스 재로드 시 올바르게 동작하는지 확인
