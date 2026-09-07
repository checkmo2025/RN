# ponytail-모임-책장-도서검색-결과-가상화-2026-09-07-16:39

## 1. 작업 요약

| 항목 | 내용 |
| --- | --- |
| 작업 일시 | 2026-09-07 16:39 KST |
| 관련 커밋·PR | 이 문서와 같은 커밋 |
| 대상 기능 | 모임 관리의 책장 생성·수정 화면에서 사용하는 도서 검색 결과 |
| 대상 파일 | [`GroupManagementOverlay.tsx`](../../src/screens/meeting/GroupManagementOverlay.tsx) |
| 핵심 구현 변경량 | 추가 26줄 + 삭제 25줄 = 51줄 |
| 200줄 예산 사용률 | 25.5% |
| 동작 변경 허용 여부 | 허용하지 않음 |
| 최종 판정 | 부분 확인 |

### 범위와 사용자 동작 계약

- 입력: 책장 생성·수정 화면의 책 선택, 검색어 입력, 엔터·검색 버튼과 검색어 지우기를 유지한다.
- 출력·화면: 검색 전 안내, 검색 중 문구, 결과 개수, 도서 카드, 빈 결과와 마지막 결과 문구를 유지한다.
- 데이터 ID·개수·순서: `useBookSearch()`가 제공하는 배열과 ``bookshelf-create-book-${book.isbn}-${index}`` 키를 그대로 사용한다.
- API 경로·호출 조건: 검색·prefetch·캐시·페이지 병합을 수정하지 않고 하단 240px 추가 조회 조건을 유지한다.
- 상호작용: 현재 선택된 책 강조, 키보드 닫기, 책 선택과 책장 생성·수정 화면 복귀를 유지한다.
- 오류 처리: 기존 검색 실패 토스트와 요청 취소 처리를 수정하지 않는다.
- 제외 범위: 책장 등록·수정·삭제, 기수·태그·정기모임 정보와 권한 로직은 수정하지 않는다.

## 2. 변경 전

도서 검색 결과를 `ScrollView` 내부에서 `map()`으로 전부 생성했다. 다음 페이지 결과가 누적될수록
화면 밖 카드도 즉시 렌더 트리에 포함됐다.

```tsx
<ScrollView onScroll={handleBookshelfBookSearchScroll}>
  {bookshelfBookSearchSearched &&
  !bookshelfBookSearchLoading &&
  bookshelfBookSearchResults.length === 0 ? (
    <Text>검색 결과가 없습니다.</Text>
  ) : null}

  {bookshelfBookSearchResults.map((book, index) => (
    <Pressable
      key={`bookshelf-create-book-${book.isbn}-${index}`}
      onPress={() => handleSelectBookshelfSourceBook(book)}
    >
      {/* 표지, 제목, 저자, 출판사 */}
    </Pressable>
  ))}

  {/* 추가 로딩·마지막 결과 */}
</ScrollView>
```

### 변경 전 기준값

| 지표 | 값 | 측정 방법 |
| --- | ---: | --- |
| 전체 검색 결과 즉시 생성 코드 | 1곳 | `bookshelfBookSearchResults.map()` 검색 |
| 책장 도서 검색 가상 목록 | 0곳 | 대상 오버레이 확인 |
| 첫 렌더 카드 생성 수 | N개 | `map()` 구조 확인 |
| 다음 페이지 임계값 | 하단 240px | `handleBookshelfBookSearchScroll()` 확인 |
| 데이터·API 로직 변경 | 0곳 | `useBookSearch()` 호출 흐름 확인 |
| 직접 의존성 추가 | 0개 | 기존 React Native와 `package.json` 확인 |

## 3. 가설·근거·기대 결과

### 가설

`ScrollView + map()`을 React Native 기본 `FlatList`로 바꾸면 화면 주변 카드부터 생성하므로 긴
결과의 첫 커밋 시간, 초기 카드 생성 수와 최악 프레임 간격이 감소한다. 같은 배열, 키, 카드 UI,
하단 240px 조회 핸들러와 선택 함수를 연결하면 사용자 동작은 유지될 것이다.

### 근거

- 검색 결과는 다음 페이지를 불러올 때 `bookshelfBookSearchResults`에 누적된다.
- 기존 `map()`은 누적된 56×80 표지 카드 전체를 즉시 React 자식으로 만들었다.
- `FlatList`는 React Native 기본 컴포넌트라 새 패키지와 네이티브 설정이 필요 없다.
- 검색과 페이지 병합은 공통 `useBookSearch()`에, 선택 반영은 기존 핸들러에 분리돼 있다.

### 기대 결과와 성공 기준

| 지표 | 기준값 | 목표값 | 성공 조건 |
| --- | ---: | ---: | --- |
| 전체 결과 즉시 생성 코드 | 1곳 | 0곳 | `bookshelfBookSearchResults.map()` 제거 |
| 100·500개 250ms 카드 생성 | N개 | N개 미만 | 화면 주변 카드만 생성 |
| 19·100·500개 첫 커밋 중앙값 | 변경 전 | 감소 | 같은 Release 조건 30회 비교 |
| 결과 ID·개수·순서 | 기존 배열 | 동일 | 같은 배열과 키 사용 |
| API·선택·권한 로직 변경 | 0곳 | 0곳 | 대상 로직 diff 없음 |

작은 목록은 가상 목록의 고정비가 더 클 수 있어 목록 크기별로 나눠 판정한다.

## 4. 변경 후

```tsx
<FlatList
  data={bookshelfBookSearchResults}
  keyExtractor={(book, index) => `bookshelf-create-book-${book.isbn}-${index}`}
  ListEmptyComponent={
    bookshelfBookSearchSearched && !bookshelfBookSearchLoading
      ? <Text>검색 결과가 없습니다.</Text>
      : null
  }
  renderItem={({ item: book }) => (
    <Pressable onPress={() => handleSelectBookshelfSourceBook(book)}>
      {/* 기존 표지, 제목, 저자, 출판사 */}
    </Pressable>
  )}
  ListFooterComponent={/* 기존 추가 로딩·마지막 결과 */}
  onScroll={handleBookshelfBookSearchScroll}
/>
```

- 기존 목록 간격, 하단 여백과 스크롤 속성을 그대로 사용한다.
- 빈 결과는 `ListEmptyComponent`, 추가 로딩과 끝 문구는 `ListFooterComponent`로 옮겼다.
- 카드 내용, 선택 상태와 선택 핸들러는 변경하지 않았다.

### 변경 범위

| 구분 | 추가 | 삭제 | 합계 |
| --- | ---: | ---: | ---: |
| 핵심 구현 코드 | 26줄 | 25줄 | 51줄 |
| 테스트 | 0줄 | 0줄 | 임시 벤치마크는 측정 후 제품 진입점에서 제거 |
| 문서 | 이 기록과 README 목록 1행 | 0줄 | 핵심 구현 예산에서 제외 |
| 생성물·잠금 파일 | 0줄 | 0줄 | 0줄 |

- 핵심 구현 200줄 이내 여부: 예, 51줄로 예산의 25.5% 사용
- 새 런타임 의존성: 없음
- 위험: 화면 밖 검색 카드는 목록 창에 들어올 때 생성된다.
- 복구 방법: 검색 결과 영역을 기존 `ScrollView`와 `map()` 구조로 되돌린다.

## 5. 측정 방법

변경 전·후 렌더러를 한 Release 앱에서 번갈아 실행해 조건을 같게 유지했다.

| 항목 | 조건 |
| --- | --- |
| 기기·OS | iPhone 16 Pro 시뮬레이터, iOS 18.6 |
| 앱 빌드 모드 | iOS Release, Hermes |
| 사용자·데이터 | 실제 책장 도서 검색 카드 구조를 복제한 7·19·100·500개 합성 배열 |
| 네트워크 | 검색 API와 원격 표지 요청 제외 |
| 워밍업·반복 횟수 | 조건별 워밍업 5회, 본 측정 30회 |
| 실행 순서 | 같은 라운드에서 `ScrollView`와 `FlatList` 순서를 번갈아 실행 |
| 관찰 구간 | 첫 커밋 후 250ms |
| 긴 프레임 기준 | `requestAnimationFrame` 간격 20ms 초과 |
| 측정 도구 | 임시 RN 벤치마크, iOS 시뮬레이터, Git diff |

### 런타임 측정 정의

- 첫 커밋 시간: 목록 마운트 요청 직전부터 목록 루트의 `useLayoutEffect` 실행까지의 시간
- 생성 카드 수: 첫 커밋 후 250ms 동안 실행된 도서 카드 렌더 함수 수의 중앙값
- 최대 프레임 간격: 같은 관찰 구간의 `requestAnimationFrame` 간격 중 최댓값
- 긴 프레임 합계: 조건별 본 측정 30회에서 20ms를 넘긴 프레임 수의 합계
- 합성 카드는 실제 `Pressable`, 56×80 표지, 제목·저자·출판사와 카드 테두리·간격을 복제했다.
- 원격 표지는 네트워크·디코딩 편차를 제외하려고 같은 크기의 로컬 `View`로 대체했다.
- 임시 진입점은 측정 후 원본과 바이트 단위로 복원하고 실제 앱을 다시 Release 빌드했다.
- 원본 측정 JSON은 `/private/tmp/checkmo-group-bookshelf-book-search-benchmark.json`에 보관했다.

이 결과는 실제 Release 렌더러의 목록 컨테이너 차이를 보는 마이크로 벤치마크다. API 응답시간,
원격 이미지 비용, JS 메모리와 실기기 성능은 포함하지 않는다.

## 6. 측정 결과

| 지표 | 변경 전 | 변경 후 | 변화 | 목표 달성 |
| --- | ---: | ---: | ---: | --- |
| 전체 결과 즉시 생성 코드 | 1곳 | 0곳 | 100% 감소 | 예 |
| 책장 도서 검색 가상 목록 | 0곳 | 1곳 | 1곳 증가 | 예 |
| 다음 페이지 임계값 | 하단 240px | 하단 240px | 변화 없음 | 예 |
| 데이터·API·권한 로직 변경 | 0곳 | 0곳 | 변화 없음 | 예 |
| 직접 의존성 추가 | 0개 | 0개 | 변화 없음 | 예 |
| TypeScript 오류 | 0개 | 0개 | 변화 없음 | 예 |
| ESLint 오류 | 0개 | 0개 | 변화 없음 | 예 |

### 첫 커밋 시간

단위는 ms다. 음수 변화율은 시간이 줄었다는 뜻이다.

| 목록 크기 | 변경 전 중앙값 | 변경 후 중앙값 | 중앙값 변화 | 변경 전 p95 | 변경 후 p95 | p95 변화 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 | 5.32 | 6.52 | +22.5% | 6.74 | 7.88 | +16.9% |
| 19 | 9.28 | 7.10 | -23.5% | 11.45 | 9.67 | -15.5% |
| 100 | 29.59 | 6.69 | -77.4% | 36.09 | 9.10 | -74.8% |
| 500 | 132.78 | 5.00 | -96.2% | 150.92 | 7.67 | -94.9% |

### 렌더 작업과 프레임

| 목록 크기 | 250ms 카드 생성 전→후 | 최대 프레임 간격 p95 전→후 | p95 변화 | 20ms 초과 프레임 합계 전→후 |
| ---: | ---: | ---: | ---: | ---: |
| 7 | 7→7 | 17.44→16.99ms | -2.6% | 0→0 |
| 19 | 19→19 | 17.31→17.40ms | +0.5% | 0→0 |
| 100 | 100→40 | 36.26→17.66ms | -51.3% | 30→0 |
| 500 | 500→40 | 151.90→17.43ms | -88.5% | 50→0 |

7·19개에서는 양쪽 모두 250ms 안에 전체 카드를 만들었다. 100·500개에서 `FlatList`는 같은 구간의
카드 생성을 40개로 제한했고 첫 커밋과 최악 프레임 간격이 함께 줄었다.

### 검증 결과

```sh
npm run typecheck
npx eslint src/screens/meeting/GroupManagementOverlay.tsx --max-warnings 200
npm run check:typography
npm run check:spacing
xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Release \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<UDID>,arch=arm64' \
  -derivedDataPath ios/build ONLY_ACTIVE_ARCH=YES ARCHS=arm64 build
git diff --check
```

- TypeScript: 통과
- ESLint: 오류·경고 0개
- 타이포그래피·간격 하드코딩 검사: 통과
- 원본 진입점 복원: 임시 백업과 바이트 단위 일치, `App.tsx` diff 없음
- 실제 앱 진입점 iOS Release 빌드: 통과, Hermes 사용, 번들 4,804,689 bytes
- iOS Release 런타임 벤치마크: 8개 조건 모두 워밍업 5회와 본 측정 30회 완료
- 시뮬레이터: `book_cafe` 로그인 상태에서 서울 독서 모임 → 모임 관리 → 책장 생성 → 책 선택을 확인했다.
- 시뮬레이터: `어린 왕자` 총 1,362개 결과와 첫 페이지 카드 10개를 확인하고 첫 카드를 선택했다.
- 시뮬레이터: 같은 제목이 책장 생성 화면에 반영되는 것을 확인했으며 책장은 등록하지 않았다.
- 다음 페이지 조회는 기존 240px 조건과 같은 핸들러 연결을 정적으로 확인했다.
- Git diff 공백 검사: 통과
- 빌드 시간과 번들 크기: 변경 전 기준값이 없어 개선 수치로 해석하지 않는다.
- 측정하지 못한 항목: 검색 종단 간 응답시간, 원격 이미지 비용, JS 메모리, 실기기 성능

## 7. 가설 판단과 결론

### 판정

`부분 확인`

### 근거

- 전체 카드를 즉시 만드는 `bookshelfBookSearchResults.map()`이 1곳에서 0곳으로 줄고 `FlatList`가 1곳 생겼다.
- 기존 배열, 키, 카드 문구·순서·선택 상태와 `handleSelectBookshelfSourceBook()`을 그대로 연결했다.
- 검색 API, 캐시, 페이지 병합과 하단 240px 추가 조회 코드는 수정하지 않았다.
- 19·100·500개에서 첫 커밋 중앙값이 각각 23.5%, 77.4%, 96.2% 줄었다.
- 100·500개에서 카드 생성이 40개로 제한되고 최대 프레임 간격 p95도 51.3%, 88.5% 줄었다.
- 7개에서는 첫 커밋 중앙값이 5.32ms에서 6.52ms로 22.5% 늘어 작은 목록의 고정비가 확인됐다.

### 결론

모임 책장 생성·수정의 도서 검색 결과를 React Native 기본 `FlatList`로 바꿔 누적 카드 전체를
즉시 생성하는 구조를 제거했다. 데이터·API·표시 순서·문구·현재 선택 상태와 책장 작성 화면 복귀는
유지했고 핵심 변경은 51줄로 200줄 예산의 25.5%이며 새 의존성은 없다. Release 실험에서 19개부터
첫 커밋이 23.5% 단축됐고 100·500개에서는 각각 77.4%, 96.2% 단축됐다. 7개에서는 22.5% 느려
가설은 목록 규모에 따라 부분 확인됐으며, 결과는 네트워크와 이미지 비용을 제외한 마이크로 벤치마크다.

### 후속 작업

실제 여러 페이지 결과가 누적된 기기에서 검색 입력부터 책 선택 완료까지 30회 측정하면 API와 원격
표지를 포함한 체감 성능 자료를 보완할 수 있다.
