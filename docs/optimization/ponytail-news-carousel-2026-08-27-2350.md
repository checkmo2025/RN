# ponytail-소식-캐러셀-2026-08-27-23:50

## 1. 작업 요약

| 항목 | 내용 |
| --- | --- |
| 작업 일시 | 2026-08-27 23:50 KST |
| 관련 커밋 | [`90cc44a`](https://github.com/checkmo2025/RN/commit/90cc44a6be1d438ea87858fac1d1b243fb1bee96) |
| 대상 기능 | 홈·소식 화면의 소식 캐러셀 조회 |
| 대상 파일 | [`HomeScreen.tsx`](../../src/screens/HomeScreen.tsx), [`NewsScreen.tsx`](../../src/screens/NewsScreen.tsx), [`newsApi.ts`](../../src/services/api/newsApi.ts) |
| 핵심 구현 변경량 | 추가 21줄 + 삭제 21줄 = 42줄 |
| 200줄 예산 사용률 | 21% |
| 동작 변경 허용 여부 | 허용하지 않음 |
| 최종 판정 | 확인 |

### 범위와 사용자 동작 계약

- 홈과 소식 화면 모두 기존 소식을 동일하게 표시한다.
- 소식 ID·순서·개수와 `PROMOTION` 판별 결과를 유지한다.
- 화면별 기본 캐러셀 문구와 이미지, 오류 토스트를 유지한다.
- 새로고침 때 서버를 다시 조회하고 캐시를 추가하지 않는다.
- 캐러셀 선택 시 기존 소식 상세 화면으로 이동한다.

## 2. 변경 전

두 화면이 같은 전체 페이지 수집과 프로모션 필터를 각각 구현했다.

```ts
// HomeScreen.tsx
const allNews = await collectAllCursorPages({
  fetchPage: (cursor) => fetchNewsList(cursor),
  dedupeId: (item) => item.id,
});
const promotions = allNews.filter((item) => item.carousel === 'PROMOTION');

// NewsScreen.tsx
const allItems = await collectAllCursorPages({
  fetchPage: (cursor) => fetchNewsList(cursor),
  dedupeId: (item) => item.id,
});
const promotions = allItems.filter((item) => item.carousel === 'PROMOTION');
```

### 변경 전 기준값

| 지표 | 값 | 측정 방법 |
| --- | ---: | --- |
| 전체 페이지 수집·필터 구현 수 | 2곳 | 코드 검색·커밋 이전 소스 확인 |
| 프로모션 판별 조건 변경 지점 | 2곳 | `carousel === 'PROMOTION'` 검색 |
| 화면의 직접 페이지 수집 구현 | 2곳 | `collectAllCursorPages` 호출 검색 |
| 전용 회귀 테스트 | 0개 | 테스트 파일 검색 |
| 화면당 API 요청 수 | 페이지 수 `P`회 | 코드 흐름 확인 |
| 전체 항목 순회 | `O(N)` | 코드 흐름 확인 |

## 3. 가설·근거·기대 결과

### 가설

기존 페이지 수집 유틸을 사용하는 `fetchNewsFeed()`로 조회 규칙을 모으면, 동일한 데이터와
오류 처리를 유지하면서 구현·변경 지점을 2곳에서 1곳으로 줄일 수 있다.

### 근거

- 두 화면의 페이지 수집 옵션과 `PROMOTION` 필터 조건이 같았다.
- 프로젝트에 검증된 `collectAllCursorPages`가 이미 있었다.
- 화면별 매핑, 기본 콘텐츠와 오류 처리는 서로 달라 공통화 대상에서 제외했다.

### 기대 결과와 성공 기준

| 지표 | 기준값 | 목표값 | 성공 조건 |
| --- | ---: | ---: | --- |
| 조회·필터 구현 수 | 2곳 | 1곳 | 50% 감소 |
| 화면의 직접 페이지 수집 구현 | 2곳 | 0곳 | 100% 제거 |
| API 요청 수 | `P`회 | `P`회 | 변화 없음 |
| 전체 항목 순회 | `O(N)` | `O(N)` | 변화 없음 |
| 사용자 동작 계약 | 기준 동작 | 동일 | 회귀 테스트와 정적 검사 통과 |

응답속도 개선은 가설에 포함하지 않았다. 네트워크 요청과 알고리즘을 바꾸지 않았기 때문이다.

## 4. 변경 후

```ts
// newsApi.ts
export async function fetchNewsFeed() {
  const items = await collectAllCursorPages({
    fetchPage: fetchNewsList,
    dedupeId: (item) => item.id,
  });

  return {
    items,
    promotions: items.filter((item) => item.carousel === 'PROMOTION'),
  };
}

// HomeScreen.tsx
const { promotions } = await fetchNewsFeed();

// NewsScreen.tsx
const { items: allItems, promotions } = await fetchNewsFeed();
```

### 변경 범위

| 구분 | 추가 | 삭제 | 합계 |
| --- | ---: | ---: | ---: |
| 핵심 구현 코드 | 21줄 | 21줄 | 42줄 |
| 전용 회귀 테스트 | 105줄 | 0줄 | 105줄 |

- 핵심 구현 200줄 이내 여부: 예, 42줄로 예산의 21% 사용
- 새 런타임 의존성: 없음
- 화면별 기본 콘텐츠·오류 처리·상세 이동 코드는 수정하지 않음

## 5. 측정 방법

구조 지표는 커밋 diff와 코드 검색으로 확인했다. 런타임 성능은 가설 대상이 아니어서 측정하지 않았다.

```sh
git show --numstat --format= 90cc44a -- \
  src/screens/HomeScreen.tsx \
  src/screens/NewsScreen.tsx \
  src/services/api/newsApi.ts \
  scripts/news-feed.test.mjs

node --test scripts/news-feed.test.mjs
npm run typecheck
./node_modules/.bin/eslint \
  src/services/api/newsApi.ts \
  src/screens/HomeScreen.tsx \
  src/screens/NewsScreen.tsx
```

## 6. 측정 결과

| 지표 | 변경 전 | 변경 후 | 변화 | 목표 달성 |
| --- | ---: | ---: | ---: | --- |
| 조회·필터 구현 수 | 2곳 | 1곳 | 50% 감소 | 예 |
| 화면의 직접 페이지 수집 구현 | 2곳 | 0곳 | 100% 제거 | 예 |
| 프로모션 판별 조건 변경 지점 | 2곳 | 1곳 | 50% 감소 | 예 |
| 홈·소식 화면 코드 | 기준 | 순 13줄 감소 | 13줄 감소 | 예 |
| 앱 프로덕션 코드 전체 | 기준 | 순증감 0줄 | 변화 없음 | 예 |
| 전용 회귀 테스트 | 0개 | 5개 | 5개 증가 | 예 |
| API 요청 수 | `P`회 | `P`회 | 변화 없음 | 예 |
| 전체 항목 순회 | `O(N)` | `O(N)` | 변화 없음 | 예 |

### 검증 결과

- 회귀 테스트: 5/5 통과
- TypeScript: 통과
- 변경 파일 ESLint: 통과
- 시뮬레이터·실기기 응답시간: 측정하지 않음. 요청 수와 실행 복잡도가 변하지 않음

## 7. 가설 판단과 결론

### 판정

**확인**

### 근거

- 조회·필터 구현과 변경 지점이 모두 2곳에서 1곳으로 줄었다.
- API 요청 수, 순회 복잡도와 새로고침 정책은 그대로였다.
- 결과 순서·중복 제거·빈 결과·반복 커서·중간 오류를 다룬 테스트 5개가 통과했다.
- 화면별 기본 콘텐츠, 오류 문구와 상세 이동 코드는 유지됐다.

### 결론

두 화면에 복제되어 있던 소식 조회 책임을 기존 API 계층의 단일 함수로 이동했다. 사용자에게
보이는 데이터와 요청 방식은 바꾸지 않으면서 변경 지점을 50% 줄였고, 화면의 직접 페이지
수집 책임을 제거했다. 성능 개선은 주장하지 않았으며, 회귀 테스트 5개로 기존 동작을 고정했다.

### 후속 작업

없음. 응답시간이나 중복 요청이 실제 병목으로 측정될 때만 캐시 또는 요청 공유를 검토한다.
