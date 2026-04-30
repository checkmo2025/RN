# checkmo_rn (RN)

BE/웹 개발자도 빠르게 로컬 실행할 수 있도록 정리한 실행 중심 README입니다.

## 프로젝트 소개

`checkmo_rn`은 CheckMo 모바일 앱(React Native + Expo) 프론트엔드 저장소입니다.  
회원, 책이야기, 소식, 모임, 알림 등 핵심 화면과 API 연동을 포함합니다.

## 프로젝트 스펙

- Runtime: `React 19.1.0`, `React Native 0.81.5`, `Expo SDK 54`
- Language: `TypeScript 5.9.x`
- Navigation: `@react-navigation/native`, `@react-navigation/bottom-tabs`
- 주요 의존성: `expo-dev-client`, `react-native-svg`, `react-native-webview`, `@stomp/stompjs`
- 스크립트:
  - `npm run start` / `npx expo start`: Expo 개발 서버 실행
  - `npm run ios` / `npx expo start --ios`: iOS 개발 빌드 실행
  - `npm run android` / `npx expo start --android`: Android 개발 빌드 실행
  - `npm run web` / `npx expo start --web`: 웹 실행
  - `npm run check`: 규칙 점검 + 타입체크 + Expo doctor

## 1) 사전 설치 (macOS 기준)

### 필수

- Node.js LTS 설치 (권장: 22.x)
- npm 사용 가능 상태
- Xcode 설치 (App Store)
- Xcode 최초 실행 후 라이선스/컴포넌트 설치 완료
- iOS Simulator 설치 확인 (Xcode 포함)
- Android 실행 필요 시: Android Studio + Emulator

### 설치 확인

```bash
node -v
npm -v
xcodebuild -version
```

## 2) 빠른 실행

1. 의존성 설치

```bash
npm install
```

2. 환경변수 파일 생성

```bash
cp .env.example .env
```

3. 개발 서버 실행 (기기/시뮬레이터 선택)

```bash
npx expo start
```

> 실행 후 터미널에서 키 입력으로 기기 선택:
> - `i` : iOS 시뮬레이터
> - `a` : Android 에뮬레이터
> - `w` : 웹 브라우저

또는 바로 실행:

```bash
npx expo start --ios      # iOS 시뮬레이터 바로 실행
npx expo start --android  # Android 에뮬레이터 바로 실행
npx expo start --web      # 웹 브라우저 바로 실행
npx expo start --tunnel   # 외부 네트워크 접속 (ngrok)
npx expo start --clear    # Metro 캐시 초기화 후 실행
```

4. iOS 실행 (권장 기본 경로)

```bash
npm run ios
```

5. Web 실행 (빠른 확인용)

```bash
npm run web
```

6. Android 실행 (선택)

```bash
npm run android
```

7. 사전 점검(권장)

```bash
npm run check
```

## 3) iOS 실행이 안 될 때 (Xcode/Simulator)

### 증상

- `npm run ios` 실행 시 빌드 실패
- Simulator가 뜨지 않거나 바로 종료

### 해결 순서

1. Xcode를 직접 1회 실행한다.
2. 라이선스/추가 컴포넌트 설치를 완료한다.
3. Simulator를 수동으로 한 번 실행한다.
4. 다시 `npm run ios`를 실행한다.

## 4) 자주 막히는 포인트

### Metro/포트 충돌

기존 Metro가 꼬였으면 종료 후 재실행:

```bash
npm run start
```

새 터미널에서 iOS 실행:

```bash
npm run ios
```

### 의존성 꼬임

```bash
rm -rf node_modules package-lock.json
npm install
```

## 참고 문서

- [기능 명세](./docs/functional-spec.md)
- [IA](./docs/ia.md)
- [접근 정책 맵](./docs/access-gate-map.md)
- [홈 접근 정책](./docs/home-access-policy.md)
- [즉시 반영 매트릭스](./docs/immediate-reflection-matrix.md)
- [푸시 알림 구현 가이드](./docs/push-notification-implementation.md)
- [Fetch 점검 이슈 정리](./docs/issue-fetch.md)
