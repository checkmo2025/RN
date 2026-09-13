# iOS 1.2.8 제출 준비

- 준비일: 2026-09-13
- 버전 / 빌드: **1.2.8 / 45** (사용자 확인)
- Bundle ID: `kr.co.checkmo.app`
- Apple Team ID: `737FQ6NT2H`
- 작업 대상: `ios/app.xcworkspace` → `app` 스킴 → Release Archive
- 상태: 로컬 제출 준비 완료. Archive·업로드·심사 제출은 사용자 진행 예정.
- 번호 근거: 이전 로컬 Archive `1.2.7 (44)`, 현재 설정 `1.2.8 (45)`. App Store Connect의 최신 업로드 상태는 이번 작업에서 조회하지 않았다.

## App Store 업데이트 설명 — 한국어

홈, 마이페이지, 모임과 검색 화면의 목록 표시를 개선했습니다.
네트워크 연결이 끊겼을 때 홈에서 로딩이 반복되는 문제를 수정하고 다시 시도 기능을 추가했습니다.
소식 기본 배너를 책모 소식 등록 문의 안내로 변경했습니다.

## What's New — English

Improved list display across Home, My Page, groups, and search.
Fixed repeated loading on Home when the network is unavailable and added a retry option.
Updated the default news banner with contact information for sharing news on Checkmo.

## Xcode에서 진행

1. `ios/app.xcworkspace`를 연다.
2. 스킴 `app`, 실행 대상 `Any iOS Device (arm64)`를 선택한다.
3. 버전·빌드 변경 후 첫 Archive이므로 `Product > Clean Build Folder`를 한 번 실행한다.
4. `Product > Archive`를 실행한다.
5. Organizer에서 새 Archive가 **1.2.8 (45)**인지 확인한다.
6. `Distribute App > App Store Connect > Upload`를 진행한다.

## App Store Connect에서 진행

1. [책모 App Store Connect](https://appstoreconnect.apple.com/apps/6777671102)의 iOS 버전 `1.2.8`을 만들거나 선택한다.
2. 위 업데이트 설명을 해당 언어의 “이 버전에서 업그레이드된 사항”에 입력한다.
3. 업로드 처리가 끝난 새 빌드를 선택한다. Xcode 업로드 과정에서 번호가 조정된 경우 실제 업로드 번호를 확인한다.
4. 기존 스크린샷·앱 설명·심사 연락처·로그인 테스트 계정과 필수 항목이 유효한지 확인한다. 이 문서에는 계정 비밀번호를 저장하지 않는다.
5. `Add for Review` 후 제출 화면에서 `Submit for Review`를 진행한다. Xcode 업로드만으로 심사가 시작되지는 않는다.

## 완료한 사전 검증

- 앱·런타임 버전 9개 필드 `1.2.8`, iOS 빌드 번호 4개 필드 `45` 일치
- 패키지 잠금 파일의 외부 의존성 버전 변경 없음
- `npm run typecheck` 통과
- `CI=1 npx expo export --platform ios --output-dir /tmp/checkmo-ios-1.2.8-export` 통과
- Info.plist·Expo.plist·entitlements·개인정보 매니페스트·Xcode 프로젝트 형식 검사 통과
- `ios/Podfile.lock`과 설치된 Pods의 `Manifest.lock` 일치
- Xcode Release 빌드 설정: 버전 `1.2.8`, 빌드 `45`, Bundle ID·서명 팀 확인
- Xcode `26.6` / iOS SDK `26.5` 확인. 실제 네이티브 Archive 및 서명·업로드 검증은 사용자 진행 단계에 남아 있다.

## 참고 자료

- [로컬 iOS 배포 런북](../agent/ios-local-release-runbook.md)
- [Apple: Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds) — 빌드 식별과 업로드 도구·SDK 요구사항
- [Apple: Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app) — 빌드 선택 및 최종 심사 제출
- [Apple: Distributing your app for beta testing and releases](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases) — Archive·업로드·심사 절차
