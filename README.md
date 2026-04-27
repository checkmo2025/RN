# checkmo_rn (RN)

기존 팀원용 실행 중심 README입니다.

## 프로젝트 소개

`checkmo_rn`은 CheckMo 모바일 앱(React Native + Expo) 프론트엔드 저장소입니다.  
회원, 책이야기, 소식, 모임, 알림 등 핵심 화면과 API 연동을 포함합니다.

## 프로젝트 스펙 소개

- Runtime: `React 19.1.0`, `React Native 0.81.5`, `Expo SDK 54`
- Language: `TypeScript 5.9.x`
- Navigation: `@react-navigation/native`, `@react-navigation/bottom-tabs`
- 주요 의존성: `expo-dev-client`, `react-native-svg`, `react-native-webview`, `@stomp/stompjs`
- 스크립트:
  - `npm run start` : Expo 개발 서버 실행
  - `npm run ios` : iOS 개발 빌드 실행
  - `npm run android` : Android 개발 빌드 실행
  - `npm run web` : 웹 실행
  - `npm run check` : 타입체크 + expo doctor

## 빠른 실행

1. 의존성 설치

```bash
npm install
```

2. 환경변수 파일 생성

```bash
cp .env.example .env
```

3. 개발 서버 실행

```bash
npm run start
```

4. 기기 실행

- iOS(개발 빌드): `npm run ios`
- Android(개발 빌드): `npm run android`
- Web: `npm run web`

5. 사전 점검(권장)

```bash
npm run check
```

## 문서 링크들

- [기능 명세](./docs/functional-spec.md)
- [IA](./docs/ia.md)
- [접근 정책 맵](./docs/access-gate-map.md)
- [홈 접근 정책](./docs/home-access-policy.md)
- [즉시 반영 매트릭스](./docs/immediate-reflection-matrix.md)
- [푸시 알림 구현 가이드](./docs/push-notification-implementation.md)
- [Fetch 점검 이슈 정리](./docs/issue-fetch.md)
