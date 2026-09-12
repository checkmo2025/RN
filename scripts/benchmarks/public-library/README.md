# 공개 서재 Release 렌더링 실험

`2de3411`(변경 전)과 `f0d9b77`(변경 후)의 실제 `UserProfileScreen`에서 카드·목록·프로필 헤더·스타일을 추출한다.
API와 원격 이미지 요청은 제외하고, 이미지는 동일 크기의 `View`로 바꾼다. 제품 `App.tsx`와 `index.ts`는 수정하지 않는다.

```sh
node scripts/benchmarks/public-library/prepare.mjs
xcrun simctl boot <UDID>
xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Release \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<UDID>,arch=arm64' \
  -derivedDataPath ios/build ONLY_ACTIVE_ARCH=YES ARCHS=arm64 \
  ENTRY_FILE=.expo/public-library-benchmark/index.tsx build
xcrun simctl install <UDID> ios/build/Build/Products/Release-iphonesimulator/app.app
xcrun simctl launch <UDID> kr.co.checkmo.app
```

앱이 활성 상태에서 자동으로 7·19·100·500권 × 전후 2조건을 실행한다. 조건별 5회 예열 후 30회를 측정하며,
크기 순서를 회전·반전하고 전후 순서를 교대한다. 측정 중 다른 빌드나 벤치마크를 실행하지 않는다.

- 초기 커밋: 마운트 요청부터 루트 `useLayoutEffect`까지.
- 첫 레이아웃 알림: 같은 요청부터 루트 `onLayout` JS 콜백까지. 화면 표시 완료 시점은 아니다.
- 카드 수: 첫 커밋 및 그 뒤 250ms 내에 실제 커밋된 책 카드의 고유 ID 개수.
- 프레임: 마운트 요청 직전부터 커밋 뒤 250ms까지 JS `requestAnimationFrame` 간격. 네이티브 UI 스레드 FPS가 아니다.
- p95: 최근접 순위법. 중앙값은 짝수 표본의 가운데 두 값 평균.

완료되면 다음 명령으로 받은 경로의 `Documents/public-library-benchmark.json`을 복사한다.
JSON에는 소스 해시, 환경, 요약과 예열·본 측정의 개별 관측값이 포함된다.

```sh
xcrun simctl get_app_container <UDID> kr.co.checkmo.app data
```

실험 뒤에는 `ENTRY_FILE` 없이 같은 Release 빌드를 다시 수행해 제품 앱을 복구한다.
필요하면 제품 앱을 같은 시뮬레이터에 설치하고 종료한다. 결과를 다른 기능의 성능이나 API 포함 체감 속도로 일반화하지 않는다.
