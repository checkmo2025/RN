# checkmo_rn 푸시알림 구현 방식

- 작성일: 2026-04-25
- 목적: 현재 코드 기준으로 푸시알림(권한, 토큰 등록/해제, 수신/탭 이동, 운영) 구현 방법을 정리
- 범위: 앱(RN/Expo) + 백엔드 API 계약 + 운영 체크리스트

## 1) 현재 상태 (코드 기준)

- 인앱 알림 조회/읽음/설정 토글은 구현되어 있음
  - `src/services/api/notificationApi.ts`
  - `src/components/common/AppHeader.tsx`
  - `src/screens/MyPageScreen.tsx`
  - `src/utils/notification.ts`
- OS 푸시용 토큰 등록/해제 API는 현재 코드에서 사용하지 않음
- `expo-notifications` 패키지와 관련 플러그인 설정이 아직 없음
  - `package.json` 의존성 없음
  - `app.json` plugins에 `expo-notifications` 없음

## 2) 목표 아키텍처

- 앱 내 알림 목록 API(`/notifications*`)와 푸시 발송 채널은 함께 동작
- 사용자 이벤트 발생 시:
  - 서버가 인앱 알림 저장
  - 서버가 알림 설정(`/notifications/settings`)을 확인
  - 설정 허용된 사용자 디바이스 토큰으로 푸시 발송
- 앱은 로그인 기준으로 디바이스 토큰을 서버에 등록/해제
- 앱 포그라운드/백그라운드/종료 상태에서 알림 탭 시 기존 라우팅 정책으로 이동

## 3) 백엔드 API 권장 스펙

### 3.1 디바이스 토큰 등록

- `POST /api/notifications/devices`
- 인증: 필요 (로그인 사용자 기준)
- 요청 예시:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "provider": "EXPO",
  "deviceId": "device-fingerprint-or-installation-id",
  "appVersion": "1.0.0",
  "buildNumber": "1",
  "locale": "ko-KR",
  "timezone": "Asia/Seoul"
}
```

- 응답 예시:

```json
{
  "result": {
    "deviceId": 142,
    "registeredAt": "2026-04-25T18:40:12+09:00"
  }
}
```

### 3.2 디바이스 토큰 해제

- `DELETE /api/notifications/devices/{token}`
- 인증: 필요
- 응답: 200/204

### 3.3 선택 권장 API

- `GET /api/notifications/devices` (운영/디버깅용)
- `PATCH /api/notifications/devices/{token}/inactive` (수동 비활성화)

## 4) 서버 발송 로직 권장

- 이벤트 발생 -> 인앱 알림 저장
- `NotificationSettingType` 매핑 후 사용자 설정 확인
- 허용 시 활성 토큰 조회 후 발송
- 발송 실패 처리:
  - `DeviceNotRegistered`, `InvalidCredentials` 등은 토큰 비활성화
  - 일시 오류는 재시도 큐(지수 백오프) 처리
- 주기 작업(예: 1일 1회):
  - 만료/실패 토큰 정리
  - 최근 n일 미사용 토큰 정리 정책 적용

## 5) 앱 구현 단계

### 5.1 패키지/설정

- 설치:

```bash
npx expo install expo-notifications expo-device expo-application expo-constants
```

- `app.json` 설정 예시:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#8B5E3C",
          "sounds": []
        }
      ]
    ],
    "android": {
      "useNextNotificationsApi": true
    }
  }
}
```

- Android 채널 기본값 생성 필요 (`default` 권장)
- 푸시는 에뮬레이터/시뮬레이터 대신 실제 기기에서 검증

### 5.2 API 레이어 추가

- 파일 권장:
  - `src/services/api/pushDeviceApi.ts`
- 함수 권장:
  - `registerPushDevice(payload)`
  - `unregisterPushDevice(token)`

### 5.3 푸시 서비스 레이어 추가

- 파일 권장:
  - `src/services/push/pushNotificationService.ts`
- 책임:
  - 권한 요청
  - Expo push token 발급
  - Android channel 생성
  - 토큰 캐시/변경 감지
  - 서버 등록/해제

### 5.4 앱 생명주기 연결

- 연결 지점 권장:
  - `App.tsx` 또는 `AuthGateProvider` 내부
- 규칙:
  - 로그인 성공 시: 권한 요청 + 토큰 발급 + 서버 등록
  - 로그아웃 시: 서버 토큰 해제
  - 계정 변경 시: 이전 토큰 해제 후 재등록

### 5.5 수신 및 탭 처리

- 포그라운드 표시 정책:
  - `Notifications.setNotificationHandler(...)`
- 탭/응답 리스너:
  - `Notifications.addNotificationResponseReceivedListener(...)`
  - payload를 `NotificationItem` 형태로 normalize 후 `resolveNotificationTarget` 재사용
- 알림 타입 매핑은 현재 `NotificationType` enum과 동일하게 유지

## 6) 앱 코드 반영 포인트 (권장 파일)

- `src/services/api/pushDeviceApi.ts` (신규): 토큰 등록/해제 API
- `src/services/push/pushNotificationService.ts` (신규): 권한/토큰/리스너
- `App.tsx` (수정): 앱 시작 시 푸시 핸들러 mount
- `src/contexts/AuthGateContext.tsx` (수정): 로그인/로그아웃 시 토큰 등록/해제 훅 호출
- `src/utils/notification.ts` (확장): 푸시 payload -> 라우트 파라미터 매핑 헬퍼 추가

## 7) 알림 payload 권장 포맷

```json
{
  "type": "COMMENT",
  "notificationId": 991,
  "domainId": 1234,
  "sourceId": 5678,
  "displayName": "hy_0716"
}
```

- `type`: `NotificationType`과 동일
- `domainId`:
  - `LIKE`, `COMMENT` -> `bookStoryId`
  - `JOIN_CLUB`, `CLUB_MEETING_CREATED`, `CLUB_NOTICE_CREATED` -> `clubId`
- `sourceId`:
  - 세부 대상(공지/모임/가입멤버 등)

## 8) 사용자 설정 연동 원칙

- `알림 관리`(`toggleNotificationSetting`) 값이 `false`인 항목은 서버 푸시 발송 제외
- 푸시 발송 제외여도 인앱 기록 저장 정책은 별도로 결정
  - 권장: 인앱 기록은 저장, 푸시만 미발송

## 9) 운영 체크리스트

- EAS 빌드 프로파일별 푸시 자격증명(APNs/FCM) 설정
- iOS:
  - Push Notifications capability
  - Background Modes(remote notifications) 검토
- Android:
  - Android 13+ 알림 권한 대응
  - 채널 importance 검토
- 장애 대응:
  - 발송 실패 로그/receipt 수집
  - 토큰 정리 배치
  - 발송량/성공률 모니터링 대시보드

## 10) QA 시나리오

- 로그인 직후 권한 허용 -> 토큰 등록 성공
- 권한 거부 -> 앱이 정상 동작하고 재요청 경로 제공
- 로그아웃 -> 토큰 해제 호출 확인
- 알림 수신:
  - foreground 표시 동작 확인
  - background 탭 시 대상 화면 이동 확인
  - 종료 상태 탭 시 대상 화면 이동 확인
- 설정 토글 off 항목은 서버에서 푸시 미발송 확인
- 만료 토큰에 대한 서버 정리 동작 확인

## 11) 단계별 적용 순서 (권장)

- 1단계: 백엔드 토큰 등록/해제 API 추가
- 2단계: 앱 의존성/설정 추가(`expo-notifications`)
- 3단계: 앱 권한/토큰 발급/서버 등록 연결
- 4단계: 탭 응답 라우팅 연결(`resolveNotificationTarget`)
- 5단계: 로그아웃/계정전환 토큰 해제 처리
- 6단계: 운영 배치/모니터링/토큰 정리 자동화

