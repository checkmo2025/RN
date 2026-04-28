# TODO

> 마지막 업데이트: 2026-04-28 22:46 KST

---

## 🖼 에셋 / 디자인

| 상태 | 역할 | 항목 | 설명 |
|------|------|------|------|
| ✅ | **RN** | **소식 기본 이미지 추가** | `assets/images/news-default.png` (800×600) 적용 완료. 목록 썸네일 / 상세 히어로 / 프로모션 캐러셀 세 곳 모두 `NEWS_DEFAULT_IMAGE` 단일 상수로 통일. |
| ⬜ | **RN** | **앱 아이콘 / 스플래시 교체** | 기본 템플릿 아이콘 제거 후 새 브랜드 에셋으로 교체. 아래 [아이콘 교체 작업](#아이콘-교체-작업) 참고. |
| ⬜ | **RN** | **책 표지 기본 이미지 추가** | `book.imageUrl` 없으면 현재 빈 영역. fallback 이미지 필요. `MyPageScreen`, `UserProfileScreen` 두 곳에 적용 예정. |
| ⬜ | **RN** | **미참조 에셋 정리** | `BookImgSample.svg`, `booksample.svg`, `ClubDefaultImg.svg`, `default_profile_1/2.svg`, `profile.svg`, `profile2~5.svg`, `profile10.svg` — 실사용처 없음. 삭제 확인 후 제거 예정. |

---

## 🐛 issue-fetch 미완료 항목

> 출처: [issue-fetch.md](issue-fetch.md) — 완료 항목 제외, 미처리 항목만 정리

### BE 문서 수정 필요

| 상태 | 역할 | ID | 항목 | 내용 |
|------|------|-----|------|------|
| ⬜ | **BE 문서** | `BOOK-04` | 공개/인증 필요 여부 문서-실서버 불일치 | 일부 엔드포인트(`all/member/search`)는 익명 200인데 문서엔 401이 혼재. 실제 정책 기준으로 Swagger 정리 필요. |
| ⬜ | **BE 문서** | `BOOK-05` | 날짜 형식 표기 차이 | 스키마는 `date-time`인데 실제는 `YYYY-MM-DD HH:mm` 응답. RFC3339로 통일하거나 현재 포맷을 문서에 명시. |
| ⬜ | **BE 문서** | `BOOKS-03` | 다른 회원 좋아요 목록 권한 불일치 | Swagger엔 401이 명시되지만 실서버는 비로그인 200 응답. 공개/비공개 정책 확정 후 서버 또는 문서 정리 필요. |
| ⬜ | **BE 문서** | `BOOKS-04` | nullable 필드 문서 누락 | 실응답에서 `currentPage`, `nextCursor`가 null인데 스키마는 정수로만 정의됨. Swagger에 `nullable` 명시 필요. |
| ⬜ | **BE 문서** | `BOOKS-05` | 검색 "결과 없음" 상태코드 불일치 | Swagger는 404 정의, 실서버는 200 + 빈 배열 반환. 정책 고정 후 문서 또는 서버 통일 필요. |
| ⬜ | **BE 문서** | `NEWS-04` | 소식 조회 권한 문서-실서버 불일치 | `/news`, `/news/{id}`는 익명 조회 가능(실서버)인데 문서엔 401 케이스 혼재. |
| ⬜ | **BE 문서** | `MEET-SEARCH-02` | 추천 API 권한 문서-실서버 불일치 | `/clubs/recommendations` 비로그인 401인데 Swagger는 200만 정의. |
| ⬜ | **BE** | `MEET-SEARCH-05` | 키워드 길이 초과 시 500 응답 | 40자 초과 시 400 대신 500(`COMMON_500`) 반환. 서버 입력 검증 예외를 400으로 정규화 필요. |
| ⬜ | **BE 문서** | `MYPAGE-01` | 내 모임 API 권한 응답 문서 누락 | `/me/clubs` 비로그인 401인데 Swagger는 200/400만 명시. |
| ⬜ | **BE 문서** | `MEET-HOME-02` | 내 클럽 상태 조회 API 문서 누락 | `/clubs/{clubId}/me` 비로그인 401인데 Swagger는 200/404만 정의. |
| ⬜ | **BE 문서** | `MEET-NOTICE-01` | 공지 조회 API 권한 응답 문서 누락 | `/clubs/{clubId}/notices*` 비로그인 401인데 Swagger는 200/403/404 중심. |
| ⬜ | **BE 문서** | `MEET-BOOKSHELF-01` | 책장/정기모임 API 권한 응답 문서 누락 | `/bookshelves*`, `/meetings*` 비로그인 401인데 문서에 누락. |
| ⬜ | **BE 문서** | `AUTH-02` | 로그인 상태 조회 API 권한 응답 문서 누락 | `/members/me/login-status` 비로그인 401인데 Swagger는 200만 정의. |
| ⬜ | **BE 문서** | `MEM-07` | 내 계정 API 권한 응답 문서 누락 | `/members/me/follow-count` 등 비로그인 401인데 Swagger 누락. |
| ⬜ | **BE 문서** | `MEET-MGMT-05` | 모임 운영/관리 API 권한 응답 문서 누락 | `/clubs`(POST), `/clubs/{clubId}`(PUT/DELETE), `/clubs/{clubId}/members*` 401 누락. |
| ⬜ | **BE 문서** | `CHAT-03` | 채팅 히스토리 API 권한 응답 문서 누락 | 채팅 히스토리 API 비로그인 401인데 문서엔 200/400만 정의. |

### 공동 협의 필요 (RN 선반영 완료)

| 상태 | 역할 | ID | 항목 | 현황 / 남은 작업 |
|------|------|-----|------|------|
| 🔄 | **공동** | `MEM-04` | find-email GET fallback | RN: POST 단일 경로 정리 완료. BE 정책/문서 최종 확정 필요. |
| 🔄 | **공동** | `MEM-09` | 사용자 차단 기능 | RN: 준비중 안내 UX 정리 완료. 차단 API 계약/BE 연동 필요. |
| 🔄 | **공동** | `AUTH-01` | 회원가입 완료 플로우 비원자성 | RN: 보상/재시도 흐름 보완 완료. 서버 트랜잭션/상태모델 BE 협의 필요. |
| ⬜ | **공동** | `MEET-HOME-03` | 이번 모임 바로가기 권한/응답 불일치 | BE 문서에 401 추가 + RN에서 비로그인 사전 차단 또는 401 전용 UX 정리. |
| ⬜ | **공동** | `MEET-MGMT-04` | 모임 수정 요청에서 링크 필드 미전송 | BE의 "미전송 필드 처리 정책" 확정 후 앱 수정 화면 링크 편집/전송 정리. |
| ⬜ | **공동** | `CHAT-02` | REST 채팅 전송 함수가 스펙/실사용과 불일치 | `sendClubMeetingTeamChatMessage` 유지/폐기 정책 확정 후 RN 미사용 함수 제거 또는 경로 정리. |
| ⬜ | **공동** | `REPORT-01` | 신고 대상 엔티티 식별자 미전달 | BE: 신고 모델에 `domainType/domainId` 확장. RN: 앱 신고 호출을 엔티티 기반으로 전환. |

---

## 🔧 아이콘 교체 작업

### 절대 삭제 금지 (현재 실제 참조 중)
- `assets/icon-checkmo.png` — 앱 아이콘 + Android adaptive foreground
- `assets/splash-icon.png` — 스플래시
- `assets/favicon.png` — 웹 favicon
- `ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` — iOS AppIcon 원본
- `android/app/src/main/res/mipmap-*/ic_launcher*.webp` 및 `mipmap-anydpi-v26/ic_launcher*.xml` — Android 런처 아이콘

### 바로 삭제 가능한 템플릿 후보
- `assets/icon.png`
- `assets/adaptive-icon.png`

### 교체할 파일 (내 에셋으로 덮어쓰기)
- `assets/icon-checkmo.png`
- `assets/splash-icon.png`
- `assets/favicon.png`
- `ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`

### 권장 에셋 스펙
- 앱 아이콘 원본: 1024×1024 PNG, 배경 포함, 모서리 라운드 없음
- 스플래시 이미지: PNG (투명 가능), 중앙 배치 기준
- favicon: 512×512 PNG (웹용)
- Android adaptive foreground: 투명 여백 포함 PNG 권장

### 작업 순서
1. 위 4개 교체 대상 파일을 새 에셋으로 덮어쓰기
2. 템플릿 후보 2개 (`assets/icon.png`, `assets/adaptive-icon.png`) 삭제
3. 네이티브 리소스 재생성
4. iOS / Android / Web 실행 확인

### 재생성 커맨드
```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
# 웹 확인
npx expo start --web
```

### 확인 체크리스트
- [ ] 홈 화면 / 앱 목록 아이콘이 새 아이콘으로 보이는지
- [ ] 스플래시가 새 이미지로 뜨는지
- [ ] iOS 빌드 경고 없이 실행되는지
- [ ] Android 빌드에서 launcher icon 관련 에러 없는지
- [ ] 웹 탭 favicon이 새 아이콘인지

---

## 상태 범례

- ⬜ 미완료
- 🔄 진행 중
- ✅ 완료
