# 모임 관리 멤버 목록 Release 벤치마크

`GroupManagementOverlay.tsx`의 실제 변경 전 멤버 JSX와 현재 `FlatList` JSX를 추출해 동일한
회원 데이터로 비교한다. 앱의 `App.tsx`와 `index.ts`는 수정하지 않는다.

## 조건

- iOS Simulator, Release, Hermes
- 회원 20·100·500명
- 조건별 예열 5회 + 측정 30회
- 각 조건의 순서와 변경 전·후 순서를 교차
- API 및 원격 이미지 제외, 이미지 영역은 같은 크기의 `View`로 대체
- 마운트 요청부터 첫 React 커밋까지 측정
- 첫 커밋과 250ms 뒤 마운트된 회원 카드 수, JS `requestAnimationFrame` 간격도 기록

## 실행

```sh
node scripts/benchmarks/group-members/prepare.mjs
```

생성되는 `.expo/group-members-benchmark/`를 Expo 엔트리로 지정해 Release 앱을 빌드한다.
완료 후 앱 Documents의 `group-members-benchmark.json`을
`docs/optimization/data/`로 복사한다.

## 한계

이 실험은 목록 렌더링 비용만 비교한다. 반복 마운트에서 콜백이 보장되지 않는 콘텐츠 레이아웃
시간과 실제 API 지연, 이미지 디코딩, 사용자의 스크롤 체감, 실기기 GPU 프레임 및 메모리는
판정에서 제외한다. `requestAnimationFrame` 간격은 JS 관측값이며 네이티브 UI FPS와 같지 않다.
