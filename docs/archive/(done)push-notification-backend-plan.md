# Backend Expo 푸시 알림 구현 계획

> 작성 기준일: 2026-06-22 KST
> 기준 코드: `ref_code/BE` (`develop`)
> 연계 문서: [RN 계획](./(done)push-notification-rn-plan.md)
> 이전 조사: [초기 푸시 알림 구현 방식](./(done)push-notification-implementation.md)

## 1. 목표와 확정 정책

기존 인앱 알림 저장 흐름 뒤에 Expo Push Service 발송을 추가한다. 도메인 트랜잭션은 외부 HTTP 장애와 분리하고, 발송 작업·ticket·receipt 상태를 DB에 남겨 프로세스 재시작과 일시 장애 이후에도 복구한다.

- 공급자는 Expo Push Service로 고정한다. BE가 FCM/APNs에 직접 연결하지 않는다.
- 기존 알림 설정이 OFF인 유형은 지금처럼 인앱 `Notification`을 생성하지 않으며 푸시도 만들지 않는다.
- 인앱 알림 저장 성공이 푸시 작업 생성의 유일한 시작점이다.
- 하나의 회원이 여러 설치를 사용할 수 있으며 활성 설치마다 한 건의 delivery를 만든다.
- 외부 Expo API 호출은 원본 좋아요·댓글·팔로우·모임 트랜잭션 안에서 실행하지 않는다.
- custom sound, image, action, silent push, badge count는 1차 범위에서 제외한다.

## 2. 현재 상태

- 알림 유형은 `LIKE`, `COMMENT`, `FOLLOW`, `JOIN_CLUB`, `CLUB_MEETING_CREATED`, `CLUB_NOTICE_CREATED` 6개다.
- 각 도메인이 application event를 발행하고 `NotificationEventListener`의 `@ApplicationModuleListener`가 인앱 알림을 저장한다.
- `NotificationCommandService`가 `NotificationSetting.isEnabled(type)`을 확인하며 OFF이면 저장하지 않는다.
- `Notification`은 type, sourceId, domainId, receiverId, senderId와 읽음 상태를 가진다.
- 사용자 표시명은 `MemberAPI`, 모임명은 `ClubManagementAPI`를 통해 조회한다.
- Spring Modulith event publication retry scheduler, `@EnableAsync`, `@EnableScheduling`이 이미 활성화돼 있다.
- Expo client, 디바이스 token, 발송 작업, receipt 조회는 없다.

## 3. API 계약

### 3.1 디바이스 등록·갱신

```http
PUT /api/v1/notifications/push-devices
Content-Type: application/json
Cookie: access token
```

```json
{
  "installationId": "70cb28d6-1118-4c26-bf14-a73edfde97df",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "IOS",
  "appVersion": "1.0.1",
  "buildNumber": "12"
}
```

```json
{
  "isSuccess": true,
  "code": "COMMON_200",
  "message": "성공입니다.",
  "result": {
    "deviceId": 142,
    "active": true,
    "registeredAt": "2026-06-22T12:00:00"
  }
}
```

등록 규칙:

1. 인증 회원 ID는 request body가 아니라 `@CurrentId`로 얻는다.
2. `installationId`가 없으면 신규 생성한다.
3. 같은 `installationId`가 있으면 token, platform, version, 회원 ID를 현재 요청 값으로 갱신하고 활성화한다.
4. 같은 token이 다른 installation 행에 있으면 이전 행을 비활성화한 후 현재 installation에 연결한다.
5. 동시 요청에서도 unique constraint 위반을 최종 방어로 사용하고 재조회·갱신한다.
6. 응답의 `registeredAt`은 이번 upsert 완료 시각이다.

검증:

- `installationId`: UUID 형식, 최대 36자
- `expoPushToken`: blank 금지, 최대 255자, `ExponentPushToken[...]` 또는 `ExpoPushToken[...]` 형식
- `platform`: `IOS`, `ANDROID`
- `appVersion`: blank 금지, 최대 32자
- `buildNumber`: blank 금지, 최대 32자
- validation 실패 400, 비로그인 401

### 3.2 디바이스 해제

```http
DELETE /api/v1/notifications/push-devices/{installationId}
Cookie: access token
```

- 현재 회원 소유 행이면 `active=false`, `deactivatedAt=now`로 변경한다.
- 존재하지 않거나 이미 비활성인 경우도 200 성공으로 처리해 idempotent하게 만든다.
- 다른 회원 소유 installation은 존재 여부를 노출하지 않고 동일한 성공 응답을 반환한다.
- 물리 삭제하지 않아 delivery 이력의 FK와 운영 추적을 유지한다.

### 3.3 DTO

```java
enum PushPlatform { IOS, ANDROID }

PushDeviceRegisterRequest
- String installationId
- String expoPushToken
- PushPlatform platform
- String appVersion
- String buildNumber

PushDeviceRegisterResponse
- Long deviceId
- boolean active
- LocalDateTime registeredAt
```

Swagger에는 200, 400, 401과 upsert/재바인딩 의미를 명시한다. token 예시는 가짜 값만 사용한다.

## 4. 데이터 모델과 migration

### 4.1 push_device

| 컬럼 | 타입 | 제약/의미 |
|---|---|---|
| id | BIGINT | PK, auto increment |
| member_id | VARCHAR(255) | 현재 연결 회원, NOT NULL, index |
| installation_id | VARCHAR(36) | 설치 UUID, NOT NULL, UNIQUE |
| expo_push_token | VARCHAR(255) | Expo token, NOT NULL, UNIQUE |
| platform | VARCHAR(20) | IOS/ANDROID, NOT NULL |
| app_version | VARCHAR(32) | 앱 버전, NOT NULL |
| build_number | VARCHAR(32) | native build, NOT NULL |
| active | BOOLEAN | 발송 대상 여부, NOT NULL default true |
| last_registered_at | DATETIME(6) | 마지막 PUT 성공 시각 |
| deactivated_at | DATETIME(6) | 비활성화 시각, nullable |
| created_at/updated_at | DATETIME(6) | BaseEntity 시각 |

### 4.2 push_delivery

| 컬럼 | 타입 | 제약/의미 |
|---|---|---|
| id | BIGINT | PK |
| notification_id | BIGINT | 인앱 알림 FK, NOT NULL |
| push_device_id | BIGINT | 디바이스 FK, NOT NULL |
| status | VARCHAR(30) | delivery 상태, NOT NULL |
| expo_ticket_id | VARCHAR(100) | ticket 성공 ID, nullable, index |
| attempt_count | INT | send 시도 횟수, default 0 |
| next_attempt_at | DATETIME(6) | retry claim 가능 시각, nullable, index |
| processing_started_at | DATETIME(6) | worker lease 시작 시각, nullable |
| last_error_code | VARCHAR(100) | Expo/HTTP 분류 코드, nullable |
| last_error_message | VARCHAR(500) | 민감정보 제거 메시지, nullable |
| sent_at | DATETIME(6) | ticket 접수 시각, nullable |
| receipt_checked_at | DATETIME(6) | 마지막 receipt 확인 시각, nullable |
| delivered_at | DATETIME(6) | receipt ok 시각, nullable |
| created_at/updated_at | DATETIME(6) | 감사 시각 |

`(notification_id, push_device_id)` unique constraint로 같은 알림의 중복 작업을 막는다.

상태 enum:

```text
PENDING          생성됨, 첫 발송 대기
PROCESSING       worker가 lease를 획득함
TICKET_ACCEPTED  Expo ticket ID 저장, receipt 대기
DELIVERED        receipt status=ok
RETRY_WAIT       일시 오류 후 nextAttemptAt 대기
PERMANENT_FAILED 재시도 불가 또는 횟수 소진
CANCELLED        디바이스 비활성 등으로 발송 취소
```

Flyway migration은 구현 시점 최신 버전 다음 번호로 생성한다. FK 삭제 정책은 notification/device 물리 삭제를 제한하고 정리 작업이 delivery부터 삭제하도록 한다.

## 5. 모듈 구조

notification 모듈 안에 다음 책임을 둔다.

- push device controller/DTO/service/repository: 등록과 해제
- `PushDevice`: 회원-설치-token 연결 entity
- `PushDelivery`: 영속 발송 상태 entity
- `NotificationCreatedForPush`: 인앱 알림 저장 후 공개하는 event
- `PushDeliveryEventListener`: 활성 디바이스를 조회하고 delivery를 idempotent 생성
- `ExpoPushClient`: Expo send/receipt HTTP 전용 adapter
- `PushMessageFactory`: type별 title/body/data 생성
- `PushSendScheduler`: PENDING/RETRY_WAIT claim과 batch 발송
- `PushReceiptScheduler`: TICKET_ACCEPTED receipt 조회
- `PushCleanupScheduler`: 비활성 device와 오래된 delivery 정리

notification 모듈은 기존 허용 의존성인 member와 clubManagement API만 사용한다. 다른 도메인의 internal package를 import하지 않는다.

## 6. 인앱 알림에서 delivery까지

1. 기존 도메인 event를 `NotificationCommandService`가 받는다.
2. 설정 OFF이면 현재처럼 종료한다. Notification과 delivery 모두 생성하지 않는다.
3. 설정 ON이면 `Notification`을 저장한다.
4. 저장된 notification ID를 담은 `NotificationCreatedForPush`를 발행한다.
5. 영속 `@ApplicationModuleListener`가 원본 commit 이후 event를 처리한다.
6. receiver의 활성 `PushDevice`를 조회한다.
7. 각 device에 `(notification, device)` delivery를 `PENDING`으로 생성한다.
8. unique 충돌은 이미 생성된 것으로 보고 성공 처리한다.

회원에게 활성 디바이스가 없어도 인앱 Notification은 정상 유지한다. delivery 0건은 오류가 아니다.

## 7. 메시지 계약

Expo message:

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "책모",
  "body": "hy_0716님이 댓글을 남겼습니다.",
  "sound": "default",
  "priority": "high",
  "channelId": "checkmo-default",
  "data": {
    "schemaVersion": 1,
    "notificationId": 991,
    "notificationType": "COMMENT",
    "domainId": 1234,
    "sourceId": 5678,
    "displayName": "hy_0716"
  }
}
```

body 규칙은 RN `formatNotificationText()`와 일치시킨다.

| 유형 | displayName | body |
|---|---|---|
| LIKE | sender nickname | `{name}님이 좋아요를 눌렀습니다.` |
| COMMENT | sender nickname | `{name}님이 댓글을 남겼습니다.` |
| FOLLOW | sender nickname | `{name}님이 회원님을 구독했습니다.` |
| JOIN_CLUB | club name | `{name} 모임 가입이 승인되었습니다.` |
| CLUB_MEETING_CREATED | club name | `{name}에 새로운 모임 일정이 등록되었습니다.` |
| CLUB_NOTICE_CREATED | club name | `{name}에 새로운 공지사항이 등록되었습니다.` |

모임형 알림의 `displayName`은 club name이므로 `님`을 붙이지 않는다. RN `formatNotificationText()`도 위 표로 함께 교정해 인앱과 푸시 문구가 정확히 같아야 한다.

- 사용자형 이름 조회 실패: `탈퇴한 회원`
- 모임형 이름 조회 실패: `삭제된 모임`
- `sourceId`는 기존 DTO와 동일하게 meeting/notice 유형에서만 노출한다.
- payload 전체는 4KiB 미만으로 유지한다.
- token, member ID, 내부 exception stack을 payload에 넣지 않는다.

## 8. Expo client 설정

환경변수:

```text
EXPO_PUSH_BASE_URL=https://exp.host/--/api/v2/push
EXPO_PUSH_ACCESS_TOKEN=<production secret>
EXPO_PUSH_SEND_ENABLED=true
EXPO_PUSH_CONNECT_TIMEOUT_MS=3000
EXPO_PUSH_READ_TIMEOUT_MS=5000
```

- local/test 기본값은 send disabled로 두어 실제 발송을 막는다.
- production은 access token을 secret store에서 주입한다.
- send endpoint는 `/send`, receipt endpoint는 `/getReceipts`를 사용한다.
- 요청과 응답은 typed DTO로 역직렬화하고 ad-hoc JSON 문자열 조합을 사용하지 않는다.
- token 원문을 HTTP logging interceptor와 application log에 출력하지 않는다.

## 9. send worker와 동시성

- scheduler는 짧은 fixed delay로 `PENDING`과 기한이 지난 `RETRY_WAIT`을 조회한다.
- 한 트랜잭션에서 최대 100건을 원자적으로 `PROCESSING` claim하고 `processingStartedAt`을 기록한다.
- 여러 인스턴스가 같은 행을 claim하지 않도록 pessimistic lock/skip-locked 또는 동등한 원자 update 전략을 repository에 구현한다.
- Expo 요청은 최대 100 messages이며 프로젝트 전체 600 notifications/sec를 넘지 않도록 process-level limiter를 둔다.
- HTTP 호출은 DB transaction 밖에서 수행한다.
- 응답 ticket을 원래 delivery 순서와 매칭해 개별 상태를 저장한다.
- worker crash로 `PROCESSING`이 남으면 lease 10분 초과 행을 `RETRY_WAIT`으로 복구한다.

재시도 시각은 attempt 기준으로 고정한다.

| 실패 후 attempt | 대기 |
|---|---|
| 1 | 1분 |
| 2 | 5분 |
| 3 | 15분 |
| 4 | 60분 |
| 5 | `PERMANENT_FAILED` |

## 10. ticket·receipt 오류 처리

### send HTTP

- network timeout, connection 오류, HTTP 429, 5xx: 전체 batch를 `RETRY_WAIT`
- HTTP 400: payload/config 오류로 `PERMANENT_FAILED`, 운영 경고
- 응답 파싱 실패: raw body를 저장하지 않고 응답 크기·status만 기록한 뒤 retry

### 개별 ticket/receipt

| 코드 | 처리 |
|---|---|
| ok ticket | `TICKET_ACCEPTED`, ticket ID 저장 |
| ok receipt | `DELIVERED`, deliveredAt 저장 |
| DeviceNotRegistered | device 비활성화, 해당 device의 대기 delivery 취소 |
| MessageRateExceeded | backoff 후 `RETRY_WAIT` |
| MessageTooBig | `PERMANENT_FAILED`, payload 크기 경고 |
| InvalidCredentials | `PERMANENT_FAILED`, 자격증명 운영 경고, device는 유지 |
| MismatchSenderId | `PERMANENT_FAILED`, FCM/EAS 설정 경고, device는 유지 |
| 알 수 없는 오류 | retryable 여부를 보수적으로 1회 retry 후 반복 시 영구 실패 |

receipt scheduler:

- `TICKET_ACCEPTED` 후 15분이 지난 행을 최대 1000 ticket씩 조회한다.
- receipt가 아직 없으면 15분 간격으로 24시간까지 다시 확인한다.
- 24시간이 지나도 receipt가 없으면 `PERMANENT_FAILED/RECEIPT_EXPIRED`로 종료한다.
- ticket ID가 없는 행을 receipt API로 보내지 않는다.

공식 발송·receipt 기준: <https://docs.expo.dev/push-notifications/sending-notifications/>

## 11. 정리와 운영

- `DeviceNotRegistered` 또는 RN DELETE로 inactive된 device는 즉시 발송 대상에서 제외한다.
- 단순히 오래 접속하지 않았다는 이유만으로 active device를 비활성화하지 않는다.
- inactive 90일 경과 device는 연결된 delivery 보존기간을 확인한 뒤 삭제한다.
- `DELIVERED`, `CANCELLED`, `PERMANENT_FAILED` delivery는 90일 보존 후 batch 삭제한다.
- 한 번에 대량 삭제하지 않고 page 단위로 처리한다.

운영 지표:

- active device 수와 플랫폼 분포
- 생성 delivery 수, ticket acceptance rate, receipt delivery rate
- retry 대기/횟수, permanent failure 코드별 수
- DeviceNotRegistered 비활성화 수
- oldest pending age와 receipt backlog age

로그 필드:

```text
notificationId, deliveryId, platform, status, attemptCount, errorCode, httpStatus
```

member ID, 닉네임, token 원문, payload 전문은 로그에 남기지 않는다. 전역 자격증명 오류와 backlog 임계치 초과는 Sentry/운영 알림 대상으로 분류한다.

## 12. 구현 순서

1. request/response DTO, error status, controller 계약을 추가한다.
2. push_device migration/entity/repository와 upsert·deactivate service를 구현한다.
3. push_delivery migration/entity/status/repository를 구현한다.
4. Notification 저장 후 event와 idempotent delivery 생성 listener를 추가한다.
5. PushMessageFactory와 Expo send/receipt client를 구현한다.
6. atomic claim send scheduler, retry, stale PROCESSING 복구를 구현한다.
7. receipt scheduler와 device 비활성화 전파를 구현한다.
8. cleanup scheduler, metrics, masked logging을 추가한다.
9. Swagger와 환경변수 예시를 갱신한다.
10. RN development build와 staging BE를 연결해 end-to-end QA한다.

## 13. 테스트 계획

### API 통합 테스트

- 비로그인 PUT/DELETE 401
- 잘못된 UUID/token/platform/version 400
- 최초 등록 생성, 동일 설치 재등록 시 행 수 유지
- token 변경 시 동일 설치 갱신
- 다른 계정에서 같은 설치 등록 시 새 계정으로 재바인딩
- 동일 token의 이전 설치 비활성화
- 자기 installation DELETE와 반복 DELETE 성공
- 타인 installation DELETE가 정보 노출 없이 성공

### 도메인·delivery 테스트

- 설정 ON인 6개 유형은 Notification과 device별 delivery 생성
- 설정 OFF는 Notification과 delivery 모두 미생성
- 활성 device 0개면 Notification만 생성
- 여러 device면 각 한 건 생성
- 중복 event와 listener 재처리에도 unique delivery 유지
- displayName 정상/fallback과 payload v1 필드 검증

### worker 테스트

- 100건 batch 제한과 ticket 순서 매칭
- 동시 worker claim 중복 방지
- network/429/5xx backoff 상태 전이
- 5회 소진 영구 실패
- stale PROCESSING lease 복구
- ticket 성공 후 receipt 조회 대상 편입
- receipt ok 전달 완료
- DeviceNotRegistered device 비활성 및 대기 작업 취소
- MessageTooBig/InvalidCredentials/MismatchSenderId 분류
- 24시간 receipt 만료 처리

### 검증 명령

```bash
./gradlew test --tests '*Notification*'
./gradlew test --tests checkmo.CheckmoApplicationTests
./gradlew test
```

Expo HTTP는 실제 네트워크 대신 Spring test mock server로 검증한다. 별도 staging smoke test에서만 실제 Expo token을 사용한다.

## 14. 완료 기준

- 인증 회원이 installation 기준으로 token을 idempotent 등록·해제할 수 있다.
- 6개 인앱 알림 저장 후 활성 device마다 delivery가 정확히 한 건 생성된다.
- 외부 Expo 장애가 원본 도메인 요청과 인앱 알림 저장을 rollback하지 않는다.
- 재시작·일시 장애·다중 worker에서도 작업이 유실되거나 중복 발송되지 않는다.
- ticket과 receipt가 추적되고 영구/일시 오류가 정책대로 분류된다.
- DeviceNotRegistered token은 자동 비활성화된다.
- token과 개인정보가 로그·오류 응답에 노출되지 않는다.
- notification 테스트, Modulith 경계 검증, 전체 Gradle 테스트가 통과한다.
