# Push Notification Credentials Guide

작성일: 2026-07-07

이 문서는 Checkmo React Native 앱에서 실제 배포 앱 기준으로 Expo Push Notification을 동작시키기 위해 필요한 iOS APNs, Android FCM, EAS credentials 설정을 정리한 문서다.

## 현재 RN 앱 상태

- iOS bundle identifier: `kr.co.checkmo.app`
- Android package name: `kr.co.checkmo.app`
- EAS projectId: `429392b9-bdb4-4d90-9bb5-1cec1fe58fcd`
- `expo-notifications` 의존성 및 config plugin이 추가되어 있다.
- Android `POST_NOTIFICATIONS` 권한이 추가되어 있다.
- iOS `aps-environment` entitlement가 `production`으로 설정되어 있다.
- 로그인 후 Expo Push Token을 백엔드 `PUT /api/v1/notifications/push-devices`에 등록하고, 로그아웃/푸시 수신 해제 시 `DELETE /api/v1/notifications/push-devices/{installationId}`를 호출하는 앱 연동이 들어가 있다.

중요: APNs capability, FCM credentials, entitlement, Android 권한처럼 네이티브 설정이 포함된 변경은 EAS Update만으로 반영되지 않는다. 실제 배포 앱에서 확인하려면 credentials 설정 후 새 EAS iOS/Android 빌드를 만들어 설치해야 한다.

## iOS 설정

### 1. Apple Developer App ID capability 켜기

1. Apple Developer Console에 접속한다.
2. `Certificates, Identifiers & Profiles`로 이동한다.
3. `Identifiers`에서 App ID `kr.co.checkmo.app`을 선택한다.
4. `Push Notifications` capability를 체크하고 저장한다.
5. capability를 새로 켰다면 provisioning profile이 이전 capability 상태를 들고 있을 수 있으므로 EAS에서 iOS credentials를 다시 확인하고 새 빌드를 만든다.

### 2. APNs Auth Key 준비

권장 방식은 EAS가 APNs key를 관리하게 두는 것이다.

```bash
eas credentials -p ios
```

메뉴에서 프로젝트와 빌드 프로필을 선택한 뒤 다음 항목을 확인한다.

- `Push Notifications`
- `Manage your Apple Push Notifications Key`
- 새 키 생성 또는 기존 APNs Auth Key 업로드

`eas build -p ios --profile production` 실행 중 EAS가 push notification setup 또는 Apple Push Notifications service key 생성을 물어보면 허용해도 된다.

수동으로 APNs key를 만들 경우:

1. Apple Developer Console의 `Keys`로 이동한다.
2. 새 key를 만들고 `Apple Push Notifications service (APNs)`를 체크한다.
3. 생성 후 `.p8` 파일을 한 번만 다운로드한다.
4. Key ID, Team ID, `.p8` 파일을 EAS credentials에 업로드한다.

주의:

- Apple Developer 계정에는 APNs Auth Key를 최대 2개만 만들 수 있다.
- APNs key는 여러 앱에서 재사용할 수 있다.
- 사용 중인 APNs key를 revoke하면 해당 key에 의존하는 앱의 푸시 발송이 깨진다.
- `.p8` 파일은 절대 커밋하지 않는다.

### 3. iOS 배포 빌드

```bash
eas build -p ios --profile production
```

TestFlight 또는 App Store 배포 앱을 실제 기기에 설치한 뒤 로그인하고 푸시 권한을 허용한다. Expo Go나 JS OTA 업데이트만으로는 배포 앱 credentials 상태를 검증할 수 없다.

## Android 설정

### 1. Firebase 프로젝트와 Android 앱 확인

1. Firebase Console에 접속한다.
2. Checkmo 앱에 사용할 Firebase project를 선택하거나 생성한다.
3. Android 앱이 없으면 package name `kr.co.checkmo.app`으로 Android 앱을 추가한다.
4. 이미 Android 앱이 있으면 package name이 `kr.co.checkmo.app`과 일치하는지 확인한다.

### 2. FCM V1 service account key 발급

1. Firebase Console에서 `Project settings`로 이동한다.
2. `Service accounts` 탭을 연다.
3. `Generate new private key`로 JSON key 파일을 다운로드한다.
4. 이 JSON 파일은 서버 권한을 가진 비밀 파일이므로 절대 커밋하지 않는다.

기존 service account를 재사용하는 경우에는 해당 계정에 Firebase Messaging API Admin 권한이 있어야 한다.

### 3. FCM V1 key를 EAS credentials에 업로드

```bash
eas credentials -p android
```

메뉴에서 프로젝트와 빌드 프로필을 선택한 뒤 다음 흐름으로 업로드한다.

1. `Google Service Account`
2. `Manage your Google Service Account Key for Push Notifications (FCM V1)`
3. `Set up a Google Service Account Key for Push Notifications (FCM V1)`
4. `Upload a new service account key`
5. Firebase에서 받은 service account JSON 파일 선택

### 4. google-services.json 설정

Firebase Android 앱 설정에서 `google-services.json`을 다운로드한다. Expo 공식 문서 기준 이 파일은 public identifier를 포함하므로 커밋 가능하지만, 팀 보안 정책에 따라 커밋 여부를 정한다.

파일을 앱 루트에 둘 경우 `app.json`에는 다음 설정이 필요하다.

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

현재 앱에 이 설정이 없다면 Firebase 파일 위치를 확정한 뒤 `app.json`에 추가해야 한다. 단, service account private key JSON과 `google-services.json`은 다른 파일이다. service account private key JSON은 EAS credentials 업로드용 비밀 파일이고, `google-services.json`은 앱 빌드에 포함되는 Firebase Android 앱 설정 파일이다.

### 5. Android 배포 빌드

```bash
eas build -p android --profile production
```

Google Play internal testing, closed testing, production, 또는 직접 설치한 release APK/AAB 기반 실제 기기에서 확인한다. Android 13 이상은 앱에서 알림 권한을 허용해야 푸시가 표시된다.

## 앱-백엔드 검증 체크리스트

1. iOS: Apple Developer App ID `kr.co.checkmo.app`에 Push Notifications capability가 켜져 있다.
2. iOS: EAS credentials에 APNs Auth Key가 연결되어 있다.
3. Android: EAS credentials에 FCM V1 service account key가 업로드되어 있다.
4. Android: `google-services.json`과 `app.json`의 `googleServicesFile` 설정이 필요한 경우 반영되어 있다.
5. iOS/Android 모두 새 production 빌드를 만들었다.
6. 실제 기기에 배포 앱을 설치했다.
7. 로그인 후 알림 권한을 허용했다.
8. 백엔드 `push-devices` 테이블 또는 운영 로그에서 현재 회원의 `installationId`, `expoPushToken`, `platform`, `active=true` 등록을 확인했다.
9. 백엔드에서 테스트 푸시를 발송해 포그라운드, 백그라운드, 앱 종료 상태 수신을 확인했다.
10. 푸시 알림을 탭했을 때 앱 내 라우팅이 기대한 화면으로 이동하는지 확인했다.
11. 로그아웃 또는 마이페이지 푸시 수신 해제 후 백엔드 디바이스 비활성화가 되는지 확인했다.

## 문제별 확인 포인트

- iOS에서 토큰은 발급되는데 알림이 오지 않음: App ID Push Notifications capability, provisioning profile 재생성, EAS APNs key 연결을 확인한다.
- iOS 빌드 후에도 capability가 반영되지 않음: Apple Developer에서 capability 저장 후 새 provisioning profile로 다시 빌드한다.
- Android에서 토큰 발급 또는 발송이 실패함: FCM V1 service account JSON이 EAS에 업로드되었는지, Firebase Android package name이 `kr.co.checkmo.app`인지 확인한다.
- Android 13 이상에서 알림이 표시되지 않음: 사용자가 시스템 알림 권한을 허용했는지 확인한다.
- 재설치 후 중복 디바이스가 보임: 앱에 저장된 `installationId`가 사라진 상태이므로 서버가 새 `installationId`를 내려주는 것이 정상이다. 이후 응답값을 다시 저장해야 한다.
- Expo Push Token이 바뀜: 앱이 기존 `installationId`와 새 `expoPushToken`으로 등록 API를 다시 호출해야 한다.

## 참고 공식 문서

- [Expo Push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [EAS managed credentials](https://docs.expo.dev/app-signing/managed-credentials/)
- [Expo app credentials](https://docs.expo.dev/app-signing/app-credentials/)
- [FCM V1 credentials for Android](https://docs.expo.dev/push-notifications/fcm-credentials/)
