# UI 상호작용 토큰 통일 가이드 (opacity/motion/zIndex/hitSlop/button-size)

> 범위: RN `src/**/*.{ts,tsx}`
> 목적: 화면마다 달라지는 상호작용 규칙(눌림감/애니메이션/겹침/터치영역/버튼 규격)을 하나의 기준으로 통일

## 1) 점검 요약

| 항목 | 현황 집계 | 핵심 이슈 |
|---|---:|---|
| `opacity` | 39건, 14개 값 | 눌림/비활성 피드백 강도가 화면별로 다름 |
| `duration` | 15건, 6개 값(160/180/220/240/700/1300) | 모션 속도 체감이 화면마다 달라짐 |
| `zIndex` | 9건, 6개 값(2/10/20/30/40/999) | 겹침 우선순위가 숫자 감각에 의존 |
| `hitSlop` | 35건, 2개 값(8/6) | 일부 링크만 더 좁아 눌림감 불균등 |
| 버튼 size 계열 | 높이 28건, 13개 값 / `paddingVertical` 78건, 7개 값 | 같은 역할 버튼도 규격 세트가 섞여 보임 |

---

## 2) 항목별 통일 기준

### 2-1) 터치 피드백(`opacity`) 통일

### 현재 분포

| 값 | 건수 |
|---:|---:|
| 0.6 | 6 |
| 0.7 | 5 |
| 0.75 | 5 |
| 0.35 | 3 |
| 0.45 | 3 |
| 0.8 | 3 |
| 0.9 | 3 |
| 0.5 | 2 |
| 0.55 | 2 |
| 0.65 | 2 |
| 0.72 | 2 |
| 0.22/0.82/0.88 | 각 1 |

### 통일안

- `interactionOpacity.pressed = 0.72`
- `interactionOpacity.pressedStrong = 0.8`
- `interactionOpacity.disabled = 0.5`
- `interactionOpacity.disabledSoft = 0.65` (토글/팔로우처럼 완전 비활성보다 약하게 보일 때만)

### 적용 규칙

- `pressed` 계열은 기본적으로 `0.72` 사용
- CTA/FAB처럼 강조형 눌림은 `0.8` 허용
- 비활성은 `0.5` 기본, 토글/상태칩만 `0.65` 예외 허용
- 장식성 opacity(`0.22`, `0.88`, `0.9`)는 컴포넌트 전용 예외로 분리

### 참고 위치

- `src/components/common/FeedbackPressable.tsx:36`
- `src/components/common/PrimaryButton.tsx:146`
- `src/screens/MeetingScreen.tsx:2434`

---

### 2-2) 모션(`duration/easing`) 통일

### 현재 분포 (`Animated.timing` duration)

| 값(ms) | 건수 |
|---:|---:|
| 180 | 9 |
| 700 | 2 |
| 160 | 1 |
| 220 | 1 |
| 240 | 1 |
| 1300 | 1 |

### 통일안

- `motion.duration.fast = 160`
- `motion.duration.normal = 180`
- `motion.duration.sheet = 220`
- `motion.duration.loaderShort = 240`
- `motion.duration.loaderLoop = 700`
- `motion.duration.loaderFill = 1300`
- `motion.easing.standard = Easing.out(Easing.cubic)`

### 적용 규칙

- 일반 화면 전환/열림/닫힘은 `normal(180)` 기본
- 빠른 드롭다운/리스트 반응은 `fast(160)`
- 바텀시트/관리패널 진입은 `sheet(220)`
- 로딩 연출은 loader 전용 그룹으로 분리(일반 모션과 섞지 않음)

### 참고 위치

- `src/components/common/AppHeader.tsx:304`
- `src/components/common/ToastHost.tsx:36`
- `src/components/common/BookFlipLoadingScreen.tsx:29`

---

### 2-3) zIndex 레이어 스케일 통일

### 현재 분포

| 값 | 건수 |
|---:|---:|
| 20 | 3 |
| 30 | 2 |
| 2/10/40/999 | 각 1 |

### 통일안

- `layers.base = 0`
- `layers.sticky = 10`
- `layers.dropdown = 20`
- `layers.overlay = 40`
- `layers.toast = 60`

### 적용 규칙

- 임의 숫자(`999`) 사용 금지
- 드롭다운은 `dropdown`, 오버레이/모달 계열은 `overlay`, 토스트는 `toast`로 고정
- 같은 계층끼리는 선언 순서/구조로 해결하고 `zIndex` 숫자 증식 금지

### 참고 위치

- `src/components/common/ToastHost.tsx:128`
- `src/screens/MeetingScreen.tsx:1427`

---

### 2-4) `hitSlop` 기준 통일

### 현재 분포

| 값 | 건수 |
|---:|---:|
| 8 | 31 |
| 6 | 4 |

### 통일안

- `touchTarget.hitSlop.icon = 8` (기본)
- `touchTarget.hitSlop.inline = 8` (기존 6도 8로 통일)

### 적용 규칙

- 아이콘 버튼, 닫기 버튼, 텍스트 링크 모두 기본 `8`
- 접근성 이슈가 있는 아주 작은 터치 타깃만 `10` 예외 허용

### 참고 위치

- `src/screens/UserProfileScreen.tsx:937`
- `src/screens/MyPageScreen.tsx:2716`
- `src/components/common/IconButton.tsx:26`

---

### 2-5) 버튼 사이즈(height) 토큰 통일

> 사용자 요청 핵심: 화면별로 버튼 규격 세트(3종/4종)가 다르게 보이는 문제 해결

### 현재 분포 (버튼/칩/탭/토글 계열)

#### `height`

| 값 | 건수 |
|---:|---:|
| 28 | 6 |
| 36 | 6 |
| 32 | 2 |
| 48 | 2 |
| 52 | 2 |
| 그 외(18/20/24/26/30/42/46/84/100%) | 10 |

#### `minHeight`

| 값 | 건수 |
|---:|---:|
| 200 | 2 |
| 36/52/56/62 | 각 1 |

#### `paddingVertical`

| 값 | 건수 |
|---|---:|
| `spacing.sm` | 37 |
| `spacing.xs` | 18 |
| `spacing.xxs` | 12 |
| `2` | 5 |
| `spacing.xs / 1.5` | 3 |
| `spacing.md` | 2 |
| `spacing.xs + 2` | 1 |

### 통일안 (버튼 규격 4단계 고정)

- `buttonSize.chip = 28` (필터/페이지/칩)
- `buttonSize.icon = 36` (원형 아이콘 버튼)
- `buttonSize.field = 48` (입력 보조/중간 CTA)
- `buttonSize.cta = 52` (주요 Primary/Secondary CTA)

### 적용 규칙

- 같은 역할이면 화면이 달라도 같은 `buttonSize` 사용
- `paddingVertical` 기반 버튼은 가능하면 고정 height 규격으로 승격
- `30`, `32` 계열은 `28` 또는 `36`으로 수렴
- `minHeight`는 텍스트 영역(멀티라인) 제외하고 버튼에는 최소화

### 현재 화면 차이(핵심)

- `MeetingScreen` 버튼 스타일 키 70개, size/radius 변형 18종
- `MyPageScreen` 버튼 스타일 키 32개, size/radius 변형 8종
- 즉, 기능 수 차이보다 규격 종류 차이가 커서 시각적 통일감이 깨지는 상태

### 참고 위치

- `src/components/common/PrimaryButton.tsx:102`
- `src/screens/MeetingScreen.tsx:1429`
- `src/screens/MeetingScreen.tsx:4519`
- `src/screens/MyPageScreen.tsx:3455`

---

## 3) 적용 우선순위 (추천)

1. `opacity` + `hitSlop` 먼저 통일 (가장 빠르게 체감 개선)
2. `zIndex` 상수화 (겹침 버그 예방)
3. `motion` 토큰화 (화면 전환 체감 통일)
4. 버튼 `height` 4단계 고정 (시각 시스템 통일의 핵심)

---

## 4) 완료 체크리스트

- `opacity` 값이 지정 토큰 외 사용 0건
- `hitSlop={6}` 제거(전부 8 또는 예외 10)
- `zIndex: 999` 제거
- 일반 전환 duration이 `160/180/220` 외 값 0건 (로더 전용 제외)
- `MeetingScreen`/`MyPageScreen` 버튼이 4단계 규격으로 수렴

