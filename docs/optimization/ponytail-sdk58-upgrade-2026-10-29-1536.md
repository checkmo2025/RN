# ponytail-sdk58-upgrade-2026-10-29-15:36

## 1. 작업 요약

| 항목 | 내용 |
| --- | --- |
| 작업 일시 | 2026-10-29 15:36:39 KST |
| 관련 커밋·PR | 미커밋. 사용자 기존 변경과 구분해 작업 트리에 유지 |
| 대상 기능 | Expo SDK 58 / Xcode 27 Device Hub 개발 실행 |
| 대상 파일 | package.json·package-lock.json·app.json·App.tsx·src/·plugins/ 및 네이티브 생성물 |
| 핵심 구현 변경량 | 추가 139줄 + 삭제 95줄 = 234줄 (네이티브 생성물·의존성 파일 제외) |
| 200줄 예산 사용률 | 117.0% |
| 동작 변경 허용 여부 | SDK 업그레이드와 실행 호환성 수정. 앱 버전·식별자·사용자 기능 유지 |
| 최종 판정 | 확인: 타입·회귀·양 플랫폼 번들·iOS 27 개발 실행 |

## 2. 변경 전

SDK 54 CLI가 Xcode 27.1의 Device Hub를 Simulator.app으로 찾다가 실행에 실패했다. 사용자가 expo 패키지만 58로 올린 상태여서 React Native·Expo 모듈·타입 버전이 서로 달랐다. 기존 iOS AppDelegate에는 Firebase 초기화가 없고 GoogleService-Info.plist도 없었다.

```ts
InteractionManager.runAfterInteractions(callback);
const ref = useRef<TextInput>(null);
// app.json: splash / newArchEnabled / android.edgeToEdgeEnabled
```

## 3. 가설·근거·기대 결과

SDK 공식 버전 표로 의존성을 맞추고 제거된 API·인스턴스 타입·설정만 이전하면 기존 기능을 유지하면서 Device Hub 개발 실행을 복구할 수 있다. 성공 기준은 타입·회귀 검사, 양 플랫폼 JS export 및 iOS 시뮬레이터 개발 앱 실행이다. 성능 실험은 하지 않는다.

## 4. 변경 후

```ts
requestIdleCallback(callback);
const ref = useRef<TextInputInstance>(null);
// FlatList의 비어 있는 optional component: null → undefined
// StyleSheet.absoluteFillObject → StyleSheet.absoluteFill
```

- React 19.3 / React Native 0.88 / Expo 58 모듈과 TypeScript 6을 정렬했다.
- 기존 SVG 변환기·Firebase 25가 직접 요구하는 Expo 보조 패키지만 추가했다. Firebase 27의 별도 SPM 전환은 도입하지 않았다.
- 제거된 splash 설정은 같은 이미지·흰 배경·iOS 전체 화면 contain 배치의 expo-splash-screen 플러그인으로 이전했다.
- iOS Firebase plist가 없으면 기존 iOS mods를 보존하고 공식 Firebase Android mods만 적용한다. plist를 설정하면 공식 양 플랫폼 플러그인을 사용한다. 미설정 상태에서 FirebaseApp.configure를 삽입해 실행 시 충돌하는 것을 막는다. iOS 분석 초기화·수집 성공은 주장하지 않는다.
- 기존 정적 Firebase Pod 설정과 fmt 패치를 유지하고 SceneDelegate를 포함한 SDK 58 네이티브 템플릿을 재생성했다.
- 앱 버전 1.2.8 / iOS 빌드 45를 재생성 시에도 보존하는 Xcode 설정 플러그인을 추가했다. 앱 식별자 / 서명 팀 / Apple 로그인·푸시·딥링크 설정을 보존했다.
- SDK 54 바이너리와 새 네이티브 바이너리가 같은 OTA 런타임을 공유하지 않도록 SDK 권장 fingerprint 정책을 적용했다.
- 구현 예산 초과 시 예외: SDK 호환성 수정은 여러 화면의 같은 제거 API·타입 및 설정 전환이다. 분리하면 패키지와 소스의 타입·실행 계약이 맞지 않는 중간 상태가 된다. 네이티브 생성물·잠금 파일은 별도이며 새로운 제품 추상화는 추가하지 않았다.
- 복구 자료: `/private/tmp/checkmo-native-before-sdk58.tgz`에 기존 ios/android를 백업했다. 사용자 설치 직후 package.json/lock은 `/private/tmp/checkmo-sdk58-initial-package*`에 보관했다. 사용자 기존 작업을 reset하지 않는다.

## 5. 검증 방법

```sh
npx expo install --fix
npm run typecheck
node --test scripts/*.test.mjs
npx eslint src --ext .ts,.tsx --max-warnings 200
npm run check:typography
npm run check:spacing
npx expo export --platform ios --output-dir /private/tmp/checkmo-sdk58-ios-export
npx expo export --platform android --output-dir /private/tmp/checkmo-sdk58-android-export
npx expo-doctor@latest
npx expo run:ios --device 9BBC747F-4CAD-4CA8-8B0C-9210614E6657 --no-bundler
```

## 6. 검증 결과

- 타입 검사·기존 81개 + 네이티브 설정 5개 = 86개 회귀 통과.
- 디자인 토큰 검사 통과. iOS·Android 프로덕션 JS/Hermes export 통과.
- Expo Doctor 19/20: 설정·SDK 버전은 통과. 기존 Firebase·SVG 변환기가 직접 요구하는 @expo/config-plugins 및 @expo/metro-config 설치 경고를 남긴다. 경고를 숨기기 위한 검사 제외는 추가하지 않았다.
- iOS 네이티브 개발 빌드 성공(오류 0·빌드 스크립트 경고 3). Android JS/Hermes export도 통과했다.
- FPS·응답시간·메모리 성능 실험 및 운영 배포는 수행하지 않는다.

## 7. 가설 판단과 결론

타입·회귀·양 플랫폼 번들과 Xcode 27 Device Hub의 iOS 27 개발 앱 실행을 확인했다. iOS Firebase 설정 파일·실제 분석 수집 및 Android 네이티브 전체 빌드 확인은 별도 한계다.

## 최종 실행 확인

- `npx expo run:ios --device 9BBC747F-4CAD-4CA8-8B0C-9210614E6657 --no-bundler`: 성공, iPhone 18 Pro/iOS 27에 설치·실행했다.
- localhost:8081 Metro에 개발 앱을 직접 연결했다. 앱 온보딩 화면을 스크린샷으로 확인했고 Metro에 JS ERROR 로그는 없었다. 시작 화면 표시 확인이며 로그인·작성 등 전체 사용자 흐름 E2E를 완료한 결과는 아니다.
- 최종 회귀 86/86, 타입·디자인 토큰·공백 검사 통과, 소스 ESLint 오류 0개(기존 경고 유지).
- 실행 증거: `/private/tmp/checkmo-sdk58-running.png`, 빌드 로그 `/private/tmp/checkmo-sdk58-ios-build-final.log`, Metro 로그 `/private/tmp/checkmo-sdk58-metro-final.log`.
- 첫 빌드는 작업 중 엔타이틀먼트 파일 형식 동기화로 Xcode 변경 감지에 실패했다. 파일 수정을 마친 뒤 최종 빌드를 다시 실행해 성공했다. 코드 서명 우회 설정은 추가하지 않았다.
- iOS plist가 없는 Firebase 분석 수집, 실기기, Android 네이티브 전체 빌드 및 스토어 배포는 확인하지 않았다. SDK 업그레이드를 위한 npm audit --force는 실행하지 않았다.
- 현재 개발 서버·시뮬레이터는 실행 상태다. 다음 실행: `npx expo start --dev-client --localhost`, 이후 `i`.
