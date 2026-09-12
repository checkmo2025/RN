# 마이페이지 신고 내역 Release 벤치마크

`bb46891`의 실제 신고 카드 JSX와 현재 `renderReportHistoryItem` JSX를 추출해 같은 데이터로
`ScrollView + map()`과 `FlatList`를 비교한다. `App.tsx`와 `index.ts`는 수정하지 않는다.

## 조건

- iOS Simulator, Release, Hermes
- 신고 내역 7·19·100·500개
- 조건별 예열 5회 + 본 측정 30회
- 데이터 크기와 변경 전·후 실행 순서를 교차
- 동일한 정적 설정 헤더, API·원격 이미지 제외
- 첫 React 커밋 시간과 250ms까지 마운트된 신고 카드 수 기록
- 최대 1,000pt를 60단계로 프로그램 스크롤하며 JS `requestAnimationFrame` FPS·긴 프레임 기록

## 실행

```sh
node scripts/benchmarks/report-history/prepare.mjs
xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Release \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<UDID>,arch=arm64' \
  -derivedDataPath ios/build ONLY_ACTIVE_ARCH=YES ARCHS=arm64 \
  ENTRY_FILE=.expo/report-history-benchmark/index.tsx build
```

완료 후 앱 Documents의 `report-history-benchmark.json`을 `docs/optimization/data/`에 복사한다.
실험 뒤에는 `ENTRY_FILE` 없이 같은 Release 빌드를 수행해 제품 앱을 복구한다.

## 한계

시뮬레이터 JS 프레임 지표이며 실기기 네이티브 UI/GPU FPS가 아니다. API·이미지 다운로드·디코딩,
화면 진입 시간과 메모리는 포함하지 않는다.
