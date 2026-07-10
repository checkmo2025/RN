# 책 검색 체감 속도 단축 계획 (클라이언트)

> 작성일: 2026-06-22 KST
> 기준 코드: RN `checkmo_rn`(src/)
> 상태: 🔄 Phase 0~1 구현 진행
> 배경: 서버 캐시히트 1~30ms vs 캐시미스(첫 알라딘) 250~980ms. 백엔드는 알라딘 의존이라 개선 불가 → 클라에서 체감 단축.

## 전략 — "타이핑 중 prefetch + 클라 캐시"
1. 입력 멈춤 **400ms** + **2자 이상** + 정규화·중복아님 → 백그라운드 `searchBooks` 미리 호출(서버 Redis도 데워짐)
2. 결과를 **클라 TTL 캐시**(3분)에 저장
3. 실제 검색(버튼/엔터) → **캐시 히트면 즉시 표시**, 미스여도 prefetch로 대부분 히트

## 아키텍처 — 공용 훅 `useBookSearch`
검색 로직(헤더/책이야기/책장 3곳 중복)을 훅으로 통합. 헤더에 먼저 적용 → 이후 재사용.
- state: `query/searched/searchedKeyword/results/loading/hasNext/loadingMore`
- 내부: debounce(400ms) prefetch, 최소 2자 게이트, normalize(trim/연속공백/소문자) + dedupe, **AbortController(이전 요청 취소)**, **TTL 캐시**(`Map`, 3분, 최대 30개, 오래된 것 제거)
- API: `search(keyword)`(캐시 우선), `loadMore()`, `reset()`

## 단계
| Phase | 내용 | 상태 |
|---|---|---|
| 0. 인프라 | `RequestOptions.signal` 추가 + `fetchWithTimeout`이 외부 signal을 내부 timeout 컨트롤러와 연결, `searchBooks(kw, page, {signal})` | 🔄 |
| 1. 헤더 적용 | `useBookSearch` 신설 → `AppHeader`의 검색 state/`executeSearch`/`loadMore`를 훅으로 교체 | 🔄 |
| 2. 확장 | StoryScreen·useBookshelfState 검색도 훅 재사용(중복 제거) | ⬜ 후속 |
| 3. 정확도(선택) | `BookSearchResult.totalResults` 추가 + "총 N개"를 length→totalResults | ⬜ 후속 |

## RN 특이사항
- **IME(한글 조합)**: 웹 `compositionstart/end` 없음 → debounce(400ms)로 흡수(조합 끝나고 멈추면 발사).
- **abort**: AbortError는 정상 취소이므로 토스트 금지 + 결과 반영 안 함(`controller.signal.aborted` 가드).
- **레이트리밋(429)**: nginx IP 제한 있으니 debounce 400ms/최소2자/dedupe로 prefetch 요청 통제.

## 기대 효과
- 같은 검색어 재검색·타이핑 후 검색 → 캐시히트로 즉시
- prefetch가 서버 Redis 데워 실제 검색 대부분 1~30ms
- 낭비 요청 감소 → 429 위험도 완화

## 수치(확정)
- debounce 400ms / 최소 2자 / 캐시 TTL 3분 / 캐시 최대 30개
