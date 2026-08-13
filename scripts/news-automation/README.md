# 책모 소식 자동화

매주 수집한 공식 책 관련 소식을 먼저 로컬 JSON 초안으로 검토하고, 사용자가 승인한 ID만 관리자 API로 등록한다.

## 안전 흐름

1. 예약 작업은 `generated/latest-draft.json`을 만들고 `npm run news:preview`까지만 실행한다.
2. 사용자는 알림에서 초안 ID를 선택한다.
3. 승인된 이미지가 준비된 뒤 `npm run news:publish -- --ids=ID1,ID2`를 실행한다.
4. 스크립트는 관리자 중복 검색, 이미지 업로드, 소식 등록, 관리자 상세 및 공개 상세 검증을 순서대로 실행한다.
5. 등록 결과가 불확실하면 항목을 `NEEDS_REVIEW`로 잠그고 자동 재업로드하지 않는다.

## 명령

```sh
npm run news:session
npm run news:check
npm run news:preview
npm run news:publish -- --ids=news-20260809-01,news-20260809-02
npm run news:test
```

대표 이미지는 프로젝트 안의 JPG, PNG 또는 WebP 파일이어야 하며 1MB 이하, 최소 1040×424px, 가로세로 비율 2.15~2.75를 만족해야 한다. 생성되는 초안과 이미지는 `generated/` 아래에 보관하며 Git에서 제외한다.

인증은 `scripts/book-story-automation/auth-client.mjs`의 `authenticatedApiRequest`만 재사용한다. 갱신 토큰은 기존 macOS 키체인 서비스 `kr.co.checkmo.book-story-automation.refresh-token`에만 저장된다.
