# 모달 시각 토큰 통일 (백드롭/radius/max-width)

> 선행 문서: `(done)ui-modal-bottomsheet-consistency.md` (7번 항목 — 구조/애니메이션/닫기 동작 통일 완료)
> 이 문서 범위: **선행 통일 이후에도 남아 있는 시각 토큰 불일치** (백드롭 투명도, radius, max-width)
> 상태: ⬜ 미완료 (2026-06-13 점검)

## 1) 점검 결과 요약

구조/동작은 통일돼 있다. 공용 래퍼 3종으로 진입/종료/뒤로가기/키보드 회피 패턴이 일관됨.

| 공용 컴포넌트 | 용도 | animationType | 백드롭 클릭 닫기 | onRequestClose |
| ------ | ------ | ------ | ------ | ------ |
| `DialogOverlay` (`src/components/common/DialogOverlay.tsx`) | 중앙 다이얼로그 | `fade` | ✅ `absoluteFill` Pressable | ✅ |
| `BottomSheet` (`src/components/common/BottomSheet.tsx`) | 바텀시트 | `slide` | ✅ + `stopPropagation` | ✅ |
| `ActionMenu` (`src/components/common/ActionMenu.tsx`) | 앵커 컨텍스트 메뉴 | `fade` | ✅ | ✅ |

→ `transparent`, `onRequestClose`, 백드롭 Pressable 처리는 전부 동일. **이 부분은 손댈 필요 없음.**

## 2) 남아 있는 불일치 (이번 통일 대상)

### A. 백드롭(overlay) 투명도가 화면마다 제각각 — 가장 눈에 띄는 불일치
테마에 토큰이 정의돼 있다: `src/theme/colors.ts` → `overlay30 = rgba(0,0,0,0.3)`, `overlay50 = rgba(0,0,0,0.5)`.
그런데 화면별로 하드코딩 값이 섞여 있다.

| 값 | 사용처 |
| ------ | ------ |
| `rgba(0,0,0,0.24)` | `ReportMemberModal` |
| `rgba(0,0,0,0.28)` | MeetingScreen Vote Voters 모달 |
| `colors.overlay30` (0.3) | MeetingScreen Contact 모달, StoryScreen Book Picker, AppHeader 검색 드롭다운 |
| `rgba(0,0,0,0.4)` | AuthFlowScreen Terms 모달, UserProfileScreen Block/Report 다이얼로그 |

→ 같은 "어두운 배경 다이얼로그"인데 24% / 28% / 30% / 40%가 혼재. **`colors.overlay30` 단일 토큰으로 수렴 권장.**
(풀스크린 이미지 뷰어의 `black`, `ActionMenu`의 `transparent`는 성격이 달라 예외 유지.)

### B. 카드 max-width / radius 혼용
- max-width: `420` / `460` / `760` / `180` (Vote Voters) 등 제각각
- borderRadius: 중앙 다이얼로그가 `radius.md` ↔ `radius.lg` 혼용

→ 다이얼로그 max-width 기본값 + radius 기준을 1개로 고정 권장.

### C. `ReportMemberModal`만 공용 래퍼 미사용
`src/components/common/ReportMemberModal.tsx`는 `DialogOverlay`를 쓰지 않고 `Modal`을 직접 감싼다. 실질적으로 중앙 입력 다이얼로그라 `DialogOverlay` 기반으로 흡수 가능.

## 3) 예외(통일 대상 아님)
- AppHeader 알림/검색 드롭다운: 풀스크린 + 커스텀 `Animated` 전환 → 별도 패턴 유지
- MeetingScreen Photo Viewer / Notice Composer / `GroupManagementOverlay`: 풀스크린 편집/뷰어 → 별도 유지

## 4) 완료 조건 (DoD)
- [ ] 어두운 배경 다이얼로그 백드롭이 전부 `colors.overlay30` 단일 토큰 사용 (하드코딩 rgba 0건)
- [ ] 중앙 다이얼로그 max-width / radius 기준값 1개로 수렴 (의도적 예외는 주석 명시)
- [ ] `ReportMemberModal`을 `DialogOverlay` 기반으로 정리하거나, 유지 사유를 문서화
