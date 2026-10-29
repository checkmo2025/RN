# iOS 1.3.0 로컬 Archive 준비

- 준비일: 2026-10-29
- 앱 버전 / 빌드: **1.3.0 (46)**
- 빌드 46은 최신 로컬 Archive 1.2.8 (45)를 기준으로 선정했다. App Store Connect 최신 업로드 번호는 조회하지 않았다.
- EAS를 사용하지 않고 Xcode에서 직접 빌드한다. Archive 버튼은 사용자가 누른다.
- Android 네이티브 버전·빌드는 이번 작업 범위에 포함하지 않는다. 공통 Expo·package·lock 버전은 1.3.0으로 동기화했다.
- SDK 58에서 도입된 fingerprint 런타임 정책을 유지한다.

## 사전 검증

- TypeScript 통과, 회귀 테스트 86/86 통과.
- Info.plist·Expo.plist·entitlements·개인정보 매니페스트·Xcode 프로젝트 형식 검사 통과.
- Podfile.lock / Pods/Manifest.lock 일치, git diff 공백 검사 통과.
- Xcode 27.1 / iPhoneOS SDK 27.1, app 스킴 Archive 구성 Release 확인.
- 서명 포함 기기용 Release build 성공. 산출물 1.3.0 (46), JS 번들 포함 및 코드 서명 검증 통과. 로그: `/private/tmp/checkmo-ios130-release.log`.
- 이번 작업에서 실기기 사용자 흐름·로그인·푸시 수신 및 iOS Firebase 분석 수집은 검증하지 않았다.

## 사용자가 Xcode에서 진행

1. `ios/app.xcworkspace`를 연다.
2. 스킴 `app`, 실행 대상 `Any iOS Device (arm64)` 또는 `Any iOS Device`를 선택한다.
3. General에서 버전 **1.3.0**, 빌드 **46**을 확인한다.
4. 버전 변경 뒤 첫 Archive이므로 `Product > Clean Build Folder`를 한 번 실행한다.
5. **Product > Archive**를 누른다.
6. Organizer에서 **1.3.0 (46)**을 확인한 뒤 업로드를 진행한다.

[로컬 배포 런북](../agent/ios-local-release-runbook.md)
