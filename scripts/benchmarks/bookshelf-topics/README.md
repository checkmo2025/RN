# 모임 책장 발제 목록 Release 벤치마크

`3631c47`의 실제 발제 행 JSX와 현재 `GroupBookshelfTopicRow` JSX를 추출해 같은 데이터로
`ScrollView + map()`과 루트 `FlatList`를 비교한다. 제품 진입점은 수정하지 않는다.

## 조건

- iOS Simulator, Release, Hermes
- 발제 20·100·500개
- 조건별 예열 5회 + 측정 30회
- 데이터 크기와 변경 전·후 실행 순서를 교차
- 동일한 정적 모임·책장 헤더, API·원격 이미지 제외
- 첫 React 커밋 시간과 250ms까지 마운트된 발제 수 기록
- 동일한 1,200pt를 60단계로 프로그램 스크롤하며 JS `requestAnimationFrame` FPS·긴 프레임 기록

## 실행

```sh
node scripts/benchmarks/bookshelf-topics/prepare.mjs
```

생성되는 `.expo/bookshelf-topics-benchmark/`를 Expo 엔트리로 지정해 Release 앱을 빌드한다.
완료 후 앱 Documents의 `bookshelf-topics-benchmark.json`을 `docs/optimization/data/`에 복사한다.

## 한계

스크롤 FPS는 시뮬레이터에서 프로그램 스크롤 중 JS `requestAnimationFrame`으로 관측한 값이다.
실기기 네이티브 UI/GPU FPS가 아니며, API·이미지 다운로드와 디코딩·메모리는 포함하지 않는다.
