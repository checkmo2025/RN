# 웹 URL → 앱 열기 후속 작업 메모

> 작성일: 2026-07-08 KST  
> 목적: 모바일에서 책모 웹 공유 URL을 눌렀을 때 설치된 앱으로 이동시키기 위한 웹/인프라 후속 작업 정리  
> RN 반영 커밋: `cf81a1f feat: add web link deep linking`

## 1. 현재 RN 반영 상태

- `https://checkmo.co.kr/stories/{storyId}` 또는 `https://www.checkmo.co.kr/stories/{storyId}` 수신 시 앱의 책이야기 상세로 이동한다.
- `/groups/{clubId}`, `/news/{newsId}`, `/profile/{nickname}`도 앱 라우팅 parser에 포함했다.
- iOS `associatedDomains`와 `ios/app/app.entitlements`에 아래 도메인을 추가했다.
  - `applinks:checkmo.co.kr`
  - `applinks:www.checkmo.co.kr`
- Android `app.json`에 App Links intent filter를 추가했다.
- `checkmo://stories/{storyId}` 같은 커스텀 스킴 fallback도 처리한다.

## 2. 웹 FE에서 추가할 파일

Next.js 기준이면 보통 아래 경로에 둔다.

```text
public/.well-known/apple-app-site-association
public/.well-known/assetlinks.json
```

주의:

- `apple-app-site-association`은 파일명에 `.json` 확장자를 붙이지 않는다.
- 두 파일 모두 로그인 없이 공개 접근 가능해야 한다.
- 가능하면 redirect 없이 `200 OK`로 내려와야 한다.
- `Content-Type`은 JSON 계열이 안전하다.
- `checkmo.co.kr`와 `www.checkmo.co.kr`를 둘 다 사용할 거면 두 host 모두 같은 `.well-known` 파일을 서빙해야 한다.

## 3. iOS AASA 예시

파일:

```text
/.well-known/apple-app-site-association
```

예시:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "737FQ6NT2H.kr.co.checkmo.app",
        "paths": [
          "/stories/*",
          "/groups/*",
          "/news/*",
          "/profile/*"
        ]
      }
    ]
  }
}
```

필요 값:

- Apple Team ID: `737FQ6NT2H`
- Bundle ID: `kr.co.checkmo.app`
- App ID: `737FQ6NT2H.kr.co.checkmo.app`

Apple Developer에서 추가 확인:

- `kr.co.checkmo.app` App ID에 `Associated Domains` capability가 켜져 있어야 한다.
- 현재 EAS production에는 `EXPO_NO_CAPABILITY_SYNC=1`이 있으므로 capability 자동 동기화에 기대지 않는다.

## 4. Android assetlinks.json 예시

파일:

```text
/.well-known/assetlinks.json
```

예시:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "kr.co.checkmo.app",
      "sha256_cert_fingerprints": [
        "<PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINT>"
      ]
    }
  }
]
```

필요 값:

- Package name: `kr.co.checkmo.app`
- SHA-256 fingerprint: Google Play Console의 App signing 인증서 값

확인 위치:

```text
Google Play Console
→ 책모 앱
→ 출시 / 설정
→ 앱 무결성 또는 App signing
→ Digital Asset Links JSON 또는 SHA-256 certificate fingerprint
```

## 5. 모바일 웹 CTA

웹 상세 페이지에 앱 유도 버튼을 추가한다.

대상:

- `/stories/{storyId}` 우선
- 이후 필요하면 `/groups/{clubId}`, `/news/{newsId}`, `/profile/{nickname}`도 동일 적용

권장 UX:

- 모바일 화면 상단에 작은 배너 또는 고정 CTA
- 문구 예시: `책모 앱에서 보기`
- 앱 설치 상태에서는 Universal/App Link가 앱으로 열린다.
- 앱 미설치 상태에서는 현재 웹 페이지를 계속 보여주거나 스토어 버튼을 제공한다.

iOS Safari용 Smart App Banner도 추가 가능하다.

```html
<meta name="apple-itunes-app" content="app-id=6777671102">
```

App Store Connect App ID:

```text
6777671102
```

## 6. 배포 후 확인할 URL

아래 URL이 브라우저에서 바로 열려야 한다.

```text
https://checkmo.co.kr/.well-known/apple-app-site-association
https://checkmo.co.kr/.well-known/assetlinks.json
https://www.checkmo.co.kr/.well-known/apple-app-site-association
https://www.checkmo.co.kr/.well-known/assetlinks.json
```

각 URL 확인 기준:

- `200 OK`
- HTML이 아니라 JSON 본문
- 인증/로그인 없음
- CDN/nginx redirect loop 없음
- `apple-app-site-association`에 `.json` 확장자 없음

## 7. 제출 순서

1. 웹 FE에 `.well-known` 파일과 모바일 CTA를 추가한다.
2. 웹을 배포한다.
3. 위 네 URL이 공개 접근되는지 확인한다.
4. Apple Developer에서 Associated Domains capability를 확인한다.
5. RN `main` 최신 커밋 기준으로 iOS/Android 새 빌드를 만든다.
6. TestFlight/internal track 설치본에서 실기기 테스트한다.
7. 문제가 없으면 스토어 심사/제출한다.

## 8. 실기기 테스트 체크리스트

iOS:

- TestFlight 앱 설치
- 메모/카카오톡/문자/메일 등에 `https://checkmo.co.kr/stories/{id}` 붙여넣기
- 링크 탭 시 앱이 열리고 책이야기 상세로 이동하는지 확인
- Safari 주소창 직접 입력은 Universal Link 검증 기준으로 보지 않는다.

Android:

- Play internal track 앱 설치
- 카카오톡/문자/Chrome 등에서 `https://checkmo.co.kr/stories/{id}` 클릭
- 앱 선택 없이 책모 앱으로 열리는지 확인
- 앱 정보의 기본 링크 열기 상태가 허용되어 있는지 확인

미설치 상태:

- 웹 상세 페이지가 정상 표시되는지 확인
- 앱 CTA 또는 스토어 이동 버튼이 깨지지 않는지 확인

## 9. 보류/주의 사항

- RN 코드만 OTA로는 iOS/Android native link entitlement가 반영되지 않는다. 새 native build가 필요하다.
- Firebase Dynamic Links는 종료 대상 서비스라 사용하지 않는다.
- 강제 앱 열기 script는 브라우저 정책에 막히고 UX가 나빠서 사용하지 않는다.
- 공유 URL은 계속 `https://checkmo.co.kr/stories/{id}` 형태를 유지한다.
