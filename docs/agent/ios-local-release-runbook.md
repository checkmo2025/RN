# iOS 로컬 빌드·App Store 제출 런북

## 목적

EAS 클라우드 iOS 빌드 한도를 사용하지 않고 Mac의 Xcode에서 책모 iOS 앱을 Archive하고 App Store Connect에 업로드할 때 사용한다.

- 로컬 Xcode Archive 자체에는 EAS 월간 빌드 한도가 없다.
- 인증서 설정은 정상화 후 매번 반복하지 않는다.
- 일반적인 다음 제출은 **빌드 번호 동기화 → Archive → Upload**만 수행한다.

## 마지막으로 확인된 상태

- 확인일: `2026-07-10`
- 앱 버전: `1.1.8`
- 업로드 빌드: `39`
- Bundle Identifier: `kr.co.checkmo.app`
- Apple Team ID: `737FQ6NT2H`
- `1.1.8 (39)` Xcode Archive 및 App Store Connect 업로드 완료
- React/Hermes dSYM 경고와 함께 업로드됐지만 업로드 자체는 성공함

다음 빌드는 App Store Connect에 더 높은 번호가 필요하므로 기본적으로 `40`부터 사용한다.

## 매번 수행하는 제출 절차

### 1. 빌드 번호 동기화

로컬 Xcode 빌드 번호는 아래 세 곳을 같은 값으로 맞춘다.

- `app.json`: `expo.ios.buildNumber`
- `ios/app/Info.plist`: `CFBundleVersion`
- `ios/app.xcodeproj/project.pbxproj`: 모든 `CURRENT_PROJECT_VERSION`

주의: Xcode `General > Build`만 바꾸면 `CURRENT_PROJECT_VERSION`만 변경되고, 이 프로젝트의 `Info.plist`에 리터럴로 들어 있는 `CFBundleVersion`은 이전 값으로 남을 수 있다. 실제로 Xcode 화면은 `39`였지만 Archive가 `1.1.8 (1)`로 생성된 원인이 이것이었다.

앱 버전 자체를 올릴 때는 `checkmo-version-release` 스킬의 버전 동기화 범위를 따른다. 앱 버전과 빌드 번호는 별개다.

### 2. Xcode 열기

```bash
cd /Users/hy/Desktop/checkmo_rn
open ios/app.xcworkspace
```

반드시 `.xcodeproj`가 아니라 `ios/app.xcworkspace`를 연다.

### 3. Archive 생성

1. 상단 대상에서 `Any iOS Device (arm64)`를 선택한다.
2. 빌드 번호나 네이티브 설정을 바꾼 직후라면 `Product > Clean Build Folder`를 한 번 실행한다.
3. `Product > Archive`를 실행한다.
4. Organizer에서 새 Archive가 원하는 `앱 버전 (빌드 번호)`로 표시되는지 확인한다.
5. 번호가 다르면 업로드하지 말고 세 빌드 번호 필드를 다시 확인한다.

### 4. App Store Connect 업로드

1. Organizer에서 최신 Archive를 선택한다.
2. `Distribute App`을 누른다.
3. `App Store Connect`를 선택한다.
4. `Upload`을 선택하고 기본 권장 옵션으로 진행한다.
5. 업로드 완료 후 App Store Connect의 TestFlight에서 처리 완료를 기다린다.

`Upload completed with warnings`가 표시되면서 React 관련 dSYM 경고만 나온 경우 업로드는 성공한 것이다. 이번에 확인된 경고 대상은 다음과 같다.

- `React.framework`
- `ReactNativeDependencies.framework`
- `hermes.framework`

이 경고는 해당 프리빌트 프레임워크의 크래시 심볼 해석 품질에 관한 것이며, `Upload completed` 상태라면 동일 Archive를 다시 업로드하지 않는다.

## 한 번만 수행한 인증서 복구

### 발생했던 증상

Xcode 및 EAS 로컬 빌드가 `[CP] Embed Pods Frameworks` 단계에서 아래 오류로 실패했다.

```text
Warning: unable to build chain to self-signed root for signer "Apple Development: Hyunil Yun (NAMVP8TM7X)"
React.framework: errSecInternalComponent
Command PhaseScriptExecution failed with a nonzero exit code
```

JavaScript 번들의 `Worker`, `setInterval`, `WebSocket` 미선언 메시지는 경고였고 실제 실패 원인은 코드 서명 체인이었다.

### 원인

Apple WWDR 중간 인증서들을 `security add-trusted-cert ... -r trustRoot` 방식으로 시스템 키체인에 넣으면서, 중간 인증서가 루트처럼 사용자 지정 신뢰된 상태가 됐다. 키체인 접근에서 파란색 `+` 표시가 나타났다.

실제 Apple Development/Distribution 서명 체인에 필요한 인증서는 다음 항목이었다.

- 이름: `Apple Worldwide Developer Relations Certification Authority`
- 조직 단위: `G3`
- 만료: `2030-02-20`

### 해결한 설정

- 시스템 키체인의 WWDR G3 인증서를 `항상 신뢰`가 아니라 `시스템 초기 설정 사용`으로 복구했다.
- 로그인 키체인의 `Apple Development`와 `Apple Distribution` 인증서도 `시스템 초기 설정 사용`으로 유지했다.
- 인증서의 `항상 신뢰`와, 빌드 중 개인 키 접근 팝업의 `항상 허용`은 서로 다른 설정이다.
  - 인증서 신뢰: `시스템 초기 설정 사용`
  - `codesign` 개인 키 접근 팝업: `항상 허용` 가능

정상 상태라면 이 작업을 다음 빌드 때 반복하지 않는다.

## 코드 서명 사전 테스트

Archive가 `errSecInternalComponent`로 실패할 때만 다음 테스트를 실행한다.

```bash
rm -f /tmp/checkmo-codesign-test
cp /usr/bin/true /tmp/checkmo-codesign-test
codesign --remove-signature /tmp/checkmo-codesign-test
codesign --force --sign BA49F5165907B32A85A2B773C40AC2464C2E2443 /tmp/checkmo-codesign-test
codesign --verify --verbose=2 /tmp/checkmo-codesign-test
```

성공 기준:

```text
/tmp/checkmo-codesign-test: valid on disk
/tmp/checkmo-codesign-test: satisfies its Designated Requirement
```

다음 문구가 나오면 Archive를 반복하지 말고 키체인 신뢰 체인을 먼저 고친다.

```text
unable to build chain to self-signed root
errSecInternalComponent
```

유효한 서명 ID 확인:

```bash
security find-identity -v -p codesigning
```

정상 확인 당시 ID:

- Apple Development: `BA49F5165907B32A85A2B773C40AC2464C2E2443`
- Apple Distribution: `D7BA6098ABFDDB24C7A2E2AA0187AE9E6907F306`

인증서를 새로 만들거나 WWDR 인증서를 다시 루트로 강제 신뢰하기 전에 위 테스트와 WWDR G3의 기본 신뢰 상태부터 확인한다.

## 확인된 앱 설정

- 표시 이름: `책모`
- App Category: `Books`
- 사진·카메라·마이크 권한 설명: `ios/app/Info.plist`에 존재
- Apple 로그인, 푸시 알림, Associated Domains: `ios/app/app.entitlements`에 존재

Xcode General 화면의 `Display Name`이 비어 보이더라도 `Info.plist`의 `CFBundleDisplayName`이 `책모`면 앱 표시 이름은 설정된 상태다.

## 하지 않아도 되는 작업

- 정상 빌드마다 인증서 재생성
- 정상 빌드마다 키체인 신뢰 설정 변경
- EAS 클라우드 빌드 한도 결제
- 성공한 dSYM 경고 업로드의 재시도
- 이전 Archive 삭제

Archive가 성공하고 업로드까지 완료된 뒤에는 Mac을 계속 켜둘 필요가 없다.
