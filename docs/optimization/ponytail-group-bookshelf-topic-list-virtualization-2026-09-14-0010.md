# ponytail-모임-책장-발제-목록-가상화-2026-09-14-00:10

## 1. 작업 요약

| 항목 | 내용 |
| --- | --- |
| 작업 일시 | 2026-09-14 00:10 KST |
| 관련 커밋·PR | 이 문서와 같은 커밋 |
| 대상 기능 | 모임 책장 상세의 발제 목록 |
| 대상 파일 | [`MeetingScreen.tsx`](../../src/screens/MeetingScreen.tsx), [`GroupBookshelfView.tsx`](../../src/screens/meeting/GroupBookshelfView.tsx), [`meetingStyles.ts`](../../src/screens/meeting/meetingStyles.ts) |
| 핵심 구현 변경량 | 추가 174줄 + 삭제 81줄 = 255줄 |
| 200줄 예산 사용률 | 127.5% |
| 동작 변경 허용 여부 | 허용하지 않음 |
| 최종 판정 | 부분 확인 |

### 범위와 사용자 동작 계약

- 입력: 선택한 책장의 `bookshelfTopicItems`와 기존 상세 로딩·페이지 상태를 그대로 사용한다.
- 출력·화면: 발제 작성자 프로필·이름·본문·메뉴와 기존 카드 배치를 유지한다.
- 데이터 ID·개수·순서: 발제를 재정렬·필터링·복사하지 않고 기존 배열과 `item.id`를 그대로 사용한다.
- API 경로·호출 조건: `GET /clubs/{clubId}/bookshelves/{meetingId}/topics?cursorId=...`와 기존 하단 180pt 임계값을 유지한다.
- 상호작용: 발제 메뉴, 상세 탭 전환, 상세 위치 자동 스크롤, 당겨서 새로고침과 추가 페이지 조회를 유지한다.
- 로딩·빈 결과·오류·권한 처리: 기존 네 문구와 다시 시도, 멤버·선택 책·발제 탭 조건을 유지한다.
- 제외: 책장·발제 API, 커서 병합과 중복 제거, 감상문 탭, 정기 모임 탭은 변경하지 않는다.

## 2. 변경 전

모임 화면의 세로 스크롤러 안에서 책장 상세 발제를 `map()`으로 모두 생성했다. 커서 페이지를
추가할수록 이미 받은 발제와 새 발제가 모두 첫 커밋의 React 자식이 됐다.

```tsx
<View style={styles.bookshelfPostList}>
  {bookshelfTopicItems.map((item) => (
    <View key={item.id} style={styles.bookshelfPostCard}>
      {/* 작성자 프로필·이름·메뉴·본문 */}
    </View>
  ))}
</View>
```

### 변경 전 기준값

| 지표 | 값 | 측정 방법 |
| --- | ---: | --- |
| 전체 발제 즉시 생성 코드 | 1곳 | 렌더 코드 검색 |
| 중첩 없이 가상화된 세로 목록 | 0곳 | 컨테이너 구조 확인 |
| 첫 커밋 발제 수 | 20·100·500개 | Release 벤치마크 중앙값 |
| 직접 의존성 추가 | 0개 | import·`package.json` 확인 |

## 3. 가설·근거·기대 결과

### 가설

기존 모임 화면의 루트 `FlatList`가 발제 데이터도 렌더하도록 하면 화면 주변 발제만 생성된다.
발제 수가 많을수록 첫 커밋 시간과 초기 렌더 수가 감소하고, 같은 행 JSX·배열·스크롤 콜백을
사용하므로 사용자 동작은 유지될 것이다.

### 근거

- `bookshelfTopicItems.map()`은 누적된 발제 전부를 즉시 React 자식으로 만들었다.
- 책장 상세 안에 `FlatList`를 추가하면 같은 방향의 루트 목록과 중첩되므로 기존 루트 목록을 재사용했다.
- 루트 스크롤러가 하단 접근 시 이미 `loadMoreBookshelfTopics()`를 호출하고 있었다.
- `FlatList`는 React Native 기본 컴포넌트이며 새 의존성이 필요 없다.

### 기대 결과와 성공 기준

| 지표 | 기준값 | 목표값 | 성공 조건 |
| --- | ---: | ---: | --- |
| 100·500개 첫 커밋 발제 | 전체 | 일부 | 전체보다 적음 |
| 100·500개 첫 커밋 중앙값 | 변경 전 | 감소 | 변경 후가 더 짧음 |
| 1,200pt 스크롤 FPS 중앙값 | 변경 전 | 유지 이상 | 변경 후가 같거나 높음 |
| 발제 ID·개수·순서와 화면 상태 | 기존 | 동일 | 회귀 검사 통과 |
| API·커서·하단 감지 | 기존 | 동일 | 대상 로직 변경 없음 |

## 4. 변경 후

```tsx
const groupHomeListItems = showVirtualizedBookshelfTopics
  ? bookshelfTopicItems
  : currentNoticeComments;

<FlatList
  data={groupHomeListItems}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) =>
    'type' in item ? <GroupBookshelfTopicRow item={item} {...handlers} /> : <CommentRow />
  }
  ListFooterComponent={
    showVirtualizedBookshelfTopics ? <GroupBookshelfTopicFooter {...state} /> : noticeFooter
  }
/>
```

- 기존 발제 행 JSX는 `GroupBookshelfTopicRow`로 옮겨 루트 목록 셀에서 그대로 사용한다.
- 로딩·오류·빈 결과·추가 로딩 상태는 `GroupBookshelfTopicFooter`로 옮겼다.
- 상세 위치 자동 스크롤이 가상화된 발제 시작점까지 계산하도록 책장 상세 오프셋을 보존했다.

### 변경 범위

| 구분 | 추가 | 삭제 | 합계 |
| --- | ---: | ---: | ---: |
| 핵심 구현 코드 | 174 | 81 | 255 |
| 회귀 검사 | 161 | 7 | 168 |
| 벤치마크 도구·안내 | 394 | 0 | 394 |
| 원본 측정 데이터 | 315,023바이트 | 0 | 315,023바이트 |

- 핵심 구현 200줄 이내 여부: 아니요, 127.5% 사용
- 예외 사유: 하나의 루트 목록을 재사용하면서 발제 행, 네 가지 상태, 기존 상세 자동 스크롤 높이를 함께 옮겨야 했다.
- 분할하지 않은 이유: 중간 단계는 같은 방향 목록 중첩, 발제 이중 렌더 또는 상태 문구 누락 중 하나를 제품에 남긴다.
- 직접 의존성: 추가 없음
- 위험과 복구 방법: 공지 댓글과 발제가 루트 목록을 공유하므로 탭 조건이 위험 지점이다. 회귀 시 발제 데이터·행·푸터 분기를 제거하고 `GroupBookshelfView`의 기존 `map()` 블록으로 복원한다.

## 5. 측정 방법

변경 전·후에 동일한 조건을 사용했다.

| 항목 | 조건 |
| --- | --- |
| 기기·OS | iPhone 16 Pro Simulator, iOS 18.6, 402×874pt, scale 3 |
| 앱 빌드 모드 | iOS Release, Hermes |
| 사용자·데이터 | 합성 발제 20·100·500개, 동일 ID·본문·작성자 분포 |
| 비교 코드 | `3631c47`의 실제 발제 행 JSX와 작업 트리의 실제 `GroupBookshelfTopicRow` JSX |
| 공통 화면 | 동일한 정적 모임·책장 헤더 |
| 네트워크 | API·원격 이미지 제외, 프로필 이미지는 같은 크기의 기본 아바타 사용 |
| 워밍업·반복 횟수 | 조건별 워밍업 5회, 본 측정 30회 |
| 순서 편향 완화 | 데이터 크기와 변경 전·후 실행 순서를 교차 |
| 스크롤 | 모든 본 측정에서 동일한 1,200pt를 60단계로 이동 |
| 원본 데이터 | [`bookshelf-topics-2026-09-14.json`](./data/bookshelf-topics-2026-09-14.json) |

- 첫 커밋 시간: 마운트 요청부터 상위 `useLayoutEffect`까지의 중앙값·p95다.
- 초기 렌더 수: 첫 커밋과 250ms 뒤 마운트된 고유 발제 수의 중앙값이다.
- 스크롤 FPS: 프로그램 스크롤 중 JS `requestAnimationFrame` 간격으로 계산한 유효 FPS다.
- 긴 프레임: 같은 스크롤 구간에서 20ms를 넘긴 JS 프레임이다.

## 6. 측정 결과

### 첫 React 커밋 시간

| 발제 수 | 변경 전 중앙값 | 변경 후 중앙값 | 변화 | 변경 전 p95 | 변경 후 p95 | 변화 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 11.16ms | 7.23ms | -35.2% | 16.06ms | 12.29ms | -23.5% |
| 100 | 40.56ms | 6.87ms | -83.1% | 43.57ms | 9.84ms | -77.4% |
| 500 | 123.89ms | 5.72ms | -95.4% | 134.32ms | 11.89ms | -91.1% |

### 렌더 작업량과 동일 거리 스크롤

| 발제 수 | 첫 커밋 발제 전→후 | 250ms 발제 전→후 | 스크롤 FPS 중앙값 전→후 | 최대 간격 p95 전→후 | 20ms 초과 총횟수 전→후 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 20→10 | 20→20 | 59.996→59.996 | 17.28→17.27ms | 0→0 |
| 100 | 100→10 | 100→40 | 59.999→59.993 | 17.43→19.39ms | 0→1 |
| 500 | 500→10 | 500→40 | 59.995→59.996 | 17.32→19.97ms | 0→1 |

- 본 측정 180회 모두 목표 거리 1,200pt와 스크롤 이벤트 60회를 기록했고 필수 값 누락은 0건이다.
- 스크롤 FPS 중앙값은 60Hz 상한에서 사실상 같아 개선으로 보지 않는다.
- 100·500개 변경 후에는 화면 밖 발제를 스크롤 중 추가 마운트하면서 최대 간격 p95가 11.3%·15.3% 증가하고 긴 프레임이 각 1회 발생했다.

### 검증 결과

```sh
node --test scripts/group-bookshelf-topic-list.test.mjs \
  scripts/group-notice-comment-list.test.mjs
npm run typecheck
npx eslint src/screens/MeetingScreen.tsx \
  src/screens/meeting/GroupBookshelfView.tsx \
  src/screens/meeting/meetingStyles.ts --max-warnings 200
npm run check:typography
npm run check:spacing
```

- 회귀 검사: 11/11 통과. ID·순서·행 문구·프로필·메뉴·권한 조건·네 상태·재시도·페이지 추가·상세 스크롤·감상문 보존을 확인했다.
- TypeScript: 통과
- ESLint: 오류 없음, `MeetingScreen.tsx`의 기존 경고는 유지
- 디자인 토큰 검사: typography·spacing 통과
- Release/Hermes 실험: 예열 30회와 본 측정 180회 완료
- 일반 앱 진입점 iOS Release 빌드·재설치·실행 통과 후 시뮬레이터 종료
- 측정하지 않은 항목: 실기기 UI/GPU FPS, 메모리, API 응답시간, 원격 이미지 다운로드·디코딩

## 7. 가설 판단과 결론

### 판정

부분 확인

### 근거

- 100·500개 첫 커밋 발제가 각각 100·500개에서 10개로 줄고 중앙값은 83.1%·95.4% 단축됐다.
- 발제 데이터·상태·메뉴·추가 페이지 호출·상세 위치 계약은 회귀 검사에서 유지됐다.
- 동일 거리 스크롤 FPS 중앙값은 개선되지 않았고 100·500개 최대 프레임 간격 p95는 증가했다.

### 결론

누적 발제 전체를 첫 화면에서 만들던 책장 상세가 기존 루트 `FlatList`를 공유하도록 바꿔
중첩 목록 없이 화면 주변 발제만 렌더했다. Release/Hermes 실험에서 500개 첫 커밋 중앙값은
123.89ms에서 5.72ms로 95.4% 줄었다. 동일 1,200pt 스크롤 FPS는 약 60으로 같았고 프레임
꼬리는 소폭 나빠져 스크롤 성능 개선은 주장하지 않는다. 확인된 효과는 많은 발제가 누적됐을 때
첫 화면 렌더 작업이 줄어드는 것이다.

### 후속 작업

실제 서비스에서 긴 발제 목록이 확인되면 실기기 Perf Monitor 또는 Instruments로 UI FPS와 메모리를 측정한다.
