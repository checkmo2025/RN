# UI 모션/햅틱 통일 가이드 (8번 항목)

> 기준 문서: `docs/(done)ui-consistency-top10.md`의 8번 항목  
> 범위: RN `src/**/*.tsx`, `src/utils/haptics.ts`

## 1) 점검 목적
- 애니메이션과 햅틱 피드백 강도를 일관되게 맞춘다.
- 화면별 반응 차이(과한 모션/무반응 느낌)를 줄인다.

## 2) 현재 현황 요약 (RN 기준)
- `Animated.` 사용 라인: 59
- `new Animated.Value`: 10
- `useNativeDriver`:
  - `true`: 19
  - `false`: 3
    - `BookFlipLoadingScreen` 2건
    - `MyPageScreen` 토글 1건
- `PanResponder.create`: 6건
- `LayoutAnimation.configureNext`: 3건
- 햅틱:
  - `triggerSelectionHaptic()` 호출: 20건
  - 직접 `Haptics.selectionAsync()` 호출: 2건 (`BottomTabs`, `utils/haptics`)

## 3) 통일 정책 (초안)

### A. 모션 단계 정의
- `micro` (100~180ms): 버튼/토글/작은 상태 전환
- `standard` (180~260ms): 패널/리스트 전환
- `emphasis` (260~360ms): 중요 진입/전환

### B. 드라이버 규칙
- 가능하면 `useNativeDriver: true` 우선
- `false`는 레이아웃/폭 계산 등 필수 경우만 허용 + 주석

### C. 제스처 규칙
- `PanResponder` 임계값/스냅 규칙을 화면별로 다르게 두지 않도록 공통 상수화
- swipe-back, sheet-drag 동작의 감도 일관화

### D. 햅틱 규칙
- 직접 API 호출 대신 `triggerSelectionHaptic` 경유 원칙
- 성공/경고/실패에 맞춘 햅틱 레벨 분리(필요 시 util 확장)

## 4) 1차 정리 대상
- `useNativeDriver: false` 3건 사유 점검 및 주석 보강
- `BottomTabs` 직접 햅틱 호출을 공용 util 경유로 통일 검토
- `PanResponder` 임계값 관련 상수 추출 후보 정리

## 5) 2차 정리 대상
- 모션 duration/easing 토큰화
- 공통 `press`, `sheet`, `toast`, `page-swipe` preset 정리
- 접근성 `reduce motion` 대응 정책 추가

## 6) 완료 조건
- 모션/햅틱 피드백이 화면 전반에서 비슷한 강도로 체감됨
- 직접 햅틱 호출/임의 애니메이션 규칙이 최소화됨
