# Android 1.2.8 제출 준비

- 준비일: 2026-09-13
- 앱 버전 / 런타임: **1.2.8 / 1.2.8**
- Android versionCode: **16** (EAS remote auto-increment, 이전 15)
- 패키지: `kr.co.checkmo.app`
- 빌드 형식: Google Play용 서명 AAB, `production` 프로필
- EAS 빌드: [1a314e78-a66d-43f4-9742-98a33f036b75](https://expo.dev/accounts/yhi9839/projects/checkmo_rn/builds/1a314e78-a66d-43f4-9742-98a33f036b75)
- 현재 상태: **AAB 빌드 성공**, 2026-09-13 14:37 KST 완료. Google Play 업로드·심사 제출 명령은 사용자가 직접 실행한다.
- [완성된 AAB 다운로드](https://expo.dev/artifacts/eas/9UV0OEpW44MbRF3765-yDn_Rxf0nqomZGdbSv6roDCg.aab)

## 반영 내용

- `android/app/build.gradle`의 표시 버전을 1.2.8로 동기화했다.
- 로컬 생성 파일 `android/app/src/main/res/values/strings.xml`의 `expo_runtime_version`도 1.2.8로 동기화했다. 이 파일은 Git 제외 대상이며 재생성 시 `app.json`을 기준으로 한다.
- `eas.json`의 기존 AAB·production·remote auto-increment·원격 서명 설정을 유지했다. 로컬 `versionCode 1`은 EAS 서버의 실제 빌드 번호를 결정하지 않는다.
- 빌드 원본은 iOS 준비 커밋 `e8032a1`과 위 Android 버전 동기화 변경이다.
- 기존 미커밋 자동 게시 작업과 서비스 소개·블로그·Google Play 테스트 자료는 이번 CPA 대상에 포함하지 않는다.

## 확인한 항목

- TypeScript 검사 통과
- Android 프로덕션 JS export 통과
- React Native·Expo의 Android target/compile SDK 36 기본값 및 별도 하향 설정 없음 확인
- EAS 빌드 메타데이터의 `appVersion 1.2.8`, `appBuildVersion 16`, `runtimeVersion 1.2.8`, `STORE` 확인
- EAS 최종 상태 `FINISHED`, 오류 없음 및 AAB 산출물 주소 확인
- 기존 원격 Android Keystore 사용, 서명 자격 증명 변경 없음
- `google-service-account.json`은 `.gitignore`와 `.easignore`에서 제외 상태 유지

## Google Play 출시 노트

```text
<ko-KR>
홈, 마이페이지, 모임과 검색 화면의 목록 표시를 개선했습니다.
네트워크 연결이 끊겼을 때 홈에서 로딩이 반복되는 문제를 수정하고 다시 시도 기능을 추가했습니다.
소식 기본 배너를 책모 소식 등록 문의 안내로 변경했습니다.
</ko-KR>
```

App Store Connect에는 [iOS 1.2.8 업데이트 설명](./ios-1.2.8.md)의 한국어·영어 문구를 사용한다.

## 빌드 완료 후 제출

Google Play Console의 프로덕션 새 버전에 이 빌드의 AAB와 위 출시 노트를 추가하고, 버전 `1.2.8 (16)` 확인 후 심사에 보낸다.

EAS Submit을 사용할 경우 다른 빌드를 선택하지 않도록 이번 빌드 ID를 지정한다.

```sh
eas submit --platform android --profile production --id 1a314e78-a66d-43f4-9742-98a33f036b75 --non-interactive --wait
```

## 참고

- [Google Play 대상 API 요구사항](https://support.google.com/googleplay/android-developer/answer/11926878?hl=ko): 2026-08-31부터 일반 Android 앱 업데이트의 대상 API 36 이상 요구
- [EAS 앱 버전 관리](https://docs.expo.dev/build-reference/app-versions/): remote 버전과 autoIncrement 동작
