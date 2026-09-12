# ponytail-모임-공지-댓글-목록-가상화-2026-09-12-17:41

## 1. 작업 요약

| 항목 | 내용 |
| --- | --- |
| 작업 일시 | 2026-09-12 17:41 KST |
| 관련 커밋·PR | 이 문서와 같은 커밋 |
| 대상 기능 | 모임 공지 상세의 댓글 목록 |
| 대상 파일 | [`MeetingScreen.tsx`](../../src/screens/MeetingScreen.tsx), [`GroupNoticeView.tsx`](../../src/screens/meeting/GroupNoticeView.tsx), [`meetingStyles.ts`](../../src/screens/meeting/meetingStyles.ts) |
| 핵심 구현 변경량 | 추가 201줄 + 삭제 144줄 = 345줄 |
| 200줄 예산 사용률 | 172.5% |
| 동작 변경 허용 여부 | 허용하지 않음 |
| 최종 판정 | 부분 확인 |

### 범위와 사용자 동작 계약

- 입력: 선택한 공지와 `currentNoticeComments` 배열, 댓글 입력·첨부·수정 상태를 그대로 사용한다.
- 출력·화면: 공지 본문과 투표·사진, 댓글 작성 영역, 댓글 프로필·작성자 표시·날짜·본문·이미지를 유지한다.
- 데이터 ID·개수·순서: 댓글을 재정렬·필터링하지 않고 기존 배열과 `comment.id`를 그대로 사용한다.
- API 경로·호출 조건: `GET /clubs/{clubId}/notices/{noticeId}/comments?cursorId=...`와 기존 하단 180pt 임계값을 유지한다.
- 상호작용: 프로필 이동, 댓글 메뉴, 이미지 보기, 등록·수정·취소·재시도와 당겨서 새로고침을 유지한다.
- 로딩·빈 결과·오류·권한 처리: 기존 네 문구와 `useNoticeState.ts`의 중복 제거·커서·권한·오류 처리를 수정하지 않는다.
- 제외: 공지 목록 페이지, 공지 데이터 수집, 댓글 API와 권한 로직은 변경하지 않는다.

## 2. 변경 전

모임 화면 전체가 `ScrollView`였고 공지 상세 댓글은 그 안에서 `map()`으로 모두 생성됐다.
커서 페이지를 추가할수록 이미 받은 댓글과 새 댓글이 모두 다시 화면 트리에 남았다.

```tsx
<ScrollView onScroll={handleGroupHomeScroll}>
  <GroupNoticeView>
    <View style={styles.noticeCommentList}>
      {currentNoticeComments.map((comment) => (
        <View key={comment.id} style={styles.noticeCommentItem}>
          {/* 프로필·작성자·날짜·본문·이미지·메뉴 */}
        </View>
      ))}
    </View>
  </GroupNoticeView>
</ScrollView>
```

### 변경 전 기준값

| 지표 | 값 | 측정 방법 |
| --- | ---: | --- |
| 전체 댓글 즉시 생성 코드 | 1곳 | 렌더 코드 검색 |
| 중첩 없이 가상화된 세로 목록 | 0곳 | 컨테이너 구조 확인 |
| 첫 커밋 댓글 수 | 20·100·500개 | Release 벤치마크 중앙값 |
| 직접 의존성 추가 | 0개 | import·`package.json` 확인 |

## 3. 가설·근거·기대 결과

### 가설

상위 세로 컨테이너를 React Native 기본 `FlatList`로 바꾸고 공지 본문·입력창을 헤더, 댓글을
목록 셀, 상태 문구를 푸터로 옮기면 화면 주변 댓글만 생성된다. 댓글 수가 많을수록 첫 커밋
시간과 초기 렌더 수가 감소하고, 같은 댓글 JSX와 기존 스크롤 콜백을 사용하므로 동작은 유지될 것이다.

### 근거

- `currentNoticeComments.map()`은 누적된 댓글 전부를 즉시 React 자식으로 만들었다.
- 내부에 `FlatList`만 추가하면 같은 방향의 `ScrollView`에 중첩되어 가상화가 정상 동작하지 않는다.
- 상위 스크롤러가 이미 하단 접근 시 `loadMoreNoticeComments(selectedNotice)`를 호출하므로 그 콜백을 그대로 연결할 수 있다.
- `FlatList`는 React Native 기본 컴포넌트이며 새 의존성이 필요 없다.

### 기대 결과와 성공 기준

| 지표 | 기준값 | 목표값 | 성공 조건 |
| --- | ---: | ---: | --- |
| 100·500개 첫 커밋 댓글 | 전체 | 일부 | 전체보다 적음 |
| 100·500개 첫 커밋 중앙값 | 변경 전 | 감소 | 변경 후가 더 짧음 |
| 1,200pt 스크롤 FPS 중앙값 | 변경 전 | 유지 이상 | 변경 후가 같거나 높음 |
| 댓글 ID·개수·순서와 동작 | 기존 | 동일 | 회귀 검사 통과 |
| API·커서·하단 감지 | 기존 | 동일 | 대상 로직 변경 없음 |

## 4. 변경 후

```tsx
<FlatList
  data={activeTab === 'notice' && selectedNotice && isMember ? currentNoticeComments : []}
  keyExtractor={(comment) => comment.id}
  renderItem={({ item: comment }) => <GroupNoticeCommentRow comment={comment} {...handlers} />}
  ListHeaderComponent={/* 기존 모임 화면과 공지 상세·댓글 입력 */}
  ListFooterComponent={/* 기존 로딩·오류·빈 결과·추가 로딩 */}
  onScroll={handleGroupHomeScroll}
/>
```

- 기존 댓글 행 JSX는 `GroupNoticeCommentRow`로 옮겨 목록 셀에서 그대로 사용한다.
- `scrollTo()` 세 호출은 같은 오프셋을 받는 `FlatList.scrollToOffset()`으로 대응했다.
- 공지 카드의 위·댓글 셀·아래 스타일을 이어 기존 한 카드 형태를 유지했다.

### 변경 범위

| 구분 | 추가 | 삭제 | 합계 |
| --- | ---: | ---: | ---: |
| 핵심 구현 코드 | 201 | 144 | 345 |
| 회귀 검사 | 188 | 0 | 188 |
| 벤치마크 도구·안내 | 411 | 0 | 411 |
| 원본 측정 데이터 | 318,250바이트 | 0 | 318,250바이트 |

- 핵심 구현 200줄 이내 여부: 아니요, 172.5% 사용
- 예외 사유: 상위 스크롤러 교체, 댓글 행 이동, 모든 목록 상태 이동을 한 번에 해야 같은 방향의 중첩 목록이나 댓글 누락이 생기지 않는다.
- 분할하지 않은 이유: 중간 단계는 `ScrollView` 안의 `FlatList` 또는 댓글을 두 번 렌더하는 유효하지 않은 제품 상태가 된다.
- 직접 의존성: 추가 없음
- 복구 방법: 상위 컨테이너를 `ScrollView`로 되돌리고 댓글 행과 상태를 기존 `GroupNoticeView`의 `map()` 블록에 복원한다.

## 5. 측정 방법

| 항목 | 조건 |
| --- | --- |
| 기기·OS | iPhone 16 Pro Simulator, iOS 18.6, 402×874pt, scale 3 |
| 앱 빌드 모드 | iOS Release, Hermes |
| 사용자·데이터 | 합성 댓글 20·100·500개, 동일 ID·문구·작성자 분포 |
| 비교 코드 | `78e1e85`의 실제 댓글 행 JSX와 작업 트리의 실제 댓글 행 JSX |
| 공통 화면 | 동일한 240pt 모임 헤더와 320pt 공지 헤더 |
| 네트워크 | API·원격 이미지 제외, 이미지 영역은 같은 크기의 `View` |
| 워밍업·반복 횟수 | 조건별 워밍업 5회, 본 측정 30회 |
| 순서 편향 완화 | 크기를 회전·역순 배치하고 변경 전·후 실행 순서를 교차 |
| 스크롤 | 모든 본 측정에서 동일한 1,200pt를 60단계로 이동 |
| 원본 데이터 | [`notice-comments-2026-09-12.json`](./data/notice-comments-2026-09-12.json) |

- 첫 커밋 시간: 마운트 요청부터 상위 `useLayoutEffect`까지의 중앙값·p95다.
- 초기 렌더 수: 첫 커밋과 250ms 뒤 마운트된 고유 댓글 수의 중앙값이다.
- 스크롤 FPS: 프로그램 스크롤 중 JS `requestAnimationFrame` 간격으로 계산한 유효 FPS다.
- 긴 프레임: 같은 스크롤 구간에서 20ms를 넘긴 JS 프레임이다.
- 첫 실험은 500개 변경 후의 추정 콘텐츠 높이가 달라 전후 스크롤 거리가 달랐으므로 기각하고, 동일 1,200pt 조건으로 전체를 재측정했다.
- 측정 완료 뒤 비회원에게 댓글 데이터·푸터를 전달하지 않는 `isMember` 조건만 추가했다. 회원인 실험 경로와 댓글 행 해시는 그대로이며 원본 JSON의 `metadata.after`는 측정 시점 코드를 가리킨다.

## 6. 측정 결과

### 첫 React 커밋 시간

| 댓글 수 | 변경 전 중앙값 | 변경 후 중앙값 | 변화 | 변경 전 p95 | 변경 후 p95 | 변화 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 17.88ms | 12.08ms | -32.5% | 21.55ms | 16.63ms | -22.8% |
| 100 | 56.66ms | 10.90ms | -80.8% | 71.32ms | 15.08ms | -78.9% |
| 500 | 220.19ms | 8.44ms | -96.2% | 228.15ms | 16.46ms | -92.8% |

### 렌더 작업량과 동일 거리 스크롤

| 댓글 수 | 첫 커밋 댓글 전→후 | 250ms 댓글 전→후 | 스크롤 FPS 중앙값 전→후 | 최대 간격 p95 전→후 | 20ms 초과 총횟수 전→후 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 20→10 | 20→20 | 60.095→60.095 | 18.64→18.60ms | 0→0 |
| 100 | 100→10 | 100→40 | 60.094→60.090 | 18.64→25.48ms | 0→4 |
| 500 | 500→10 | 500→40 | 60.090→60.089 | 18.22→21.95ms | 0→2 |

- 본 측정 180회 모두 목표 거리 1,200pt와 스크롤 이벤트 60회를 기록했고 필수 값 누락은 0건이다.
- 스크롤 FPS 중앙값은 60Hz 상한에서 사실상 같아 개선으로 볼 수 없다.
- 100·500개 변경 후에는 화면 밖 댓글을 스크롤 중 추가 마운트하면서 최대 간격 p95와 긴 프레임이 소폭 증가했다.

### 검증 결과

```sh
node --test scripts/group-notice-comment-list.test.mjs
npm run typecheck
npx eslint src/screens/MeetingScreen.tsx src/screens/meeting/GroupNoticeView.tsx \
  src/screens/meeting/meetingStyles.ts --max-warnings 200
npm run check:typography
npm run check:spacing
```

- 회귀 검사: 6/6 통과. ID·순서·문구·프로필 이동·메뉴·이미지·상태·권한·페이지 추가 호출·스크롤 이동을 확인했다.
- TypeScript: 통과
- ESLint: 새 오류·경고 없음, `MeetingScreen.tsx`의 기존 경고는 유지
- 디자인 토큰 검사: typography·spacing 통과
- Release/Hermes 실험: 예열 30회와 본 측정 180회 완료
- 일반 앱 진입점 iOS Release 빌드·재설치 통과 후 시뮬레이터 종료
- 측정하지 않은 항목: 실기기 UI/GPU FPS, 메모리, API 응답시간, 원격 이미지 다운로드·디코딩

## 7. 가설 판단과 결론

### 판정

부분 확인

### 근거

- 100·500개 첫 커밋 댓글이 100·500개에서 각각 10개로 줄고 중앙값은 80.8%·96.2% 단축됐다.
- 댓글 데이터·상태·상호작용·추가 페이지 호출 계약은 회귀 검사에서 유지됐다.
- 동일 거리 스크롤 FPS 중앙값은 개선되지 않았고 100·500개 최대 프레임 간격 p95는 오히려 증가했다.

### 결론

누적 댓글 전체를 첫 화면에서 만들던 공지 상세를 하나의 루트 `FlatList`로 바꿔 중첩 목록 없이
화면 주변 댓글만 렌더하도록 했다. Release/Hermes 실험에서 500개 첫 커밋 중앙값은
220.19ms에서 8.44ms로 96.2% 줄었다. 반면 동일 1,200pt 스크롤 FPS는 약 60으로 같았고
긴 프레임 꼬리는 소폭 나빠져 스크롤 성능 개선은 주장하지 않는다. 이 변경의 확인된 효과는
대규모 누적 댓글의 초기 렌더 작업 감소다.

### 후속 작업

실제 서비스에서 긴 댓글 목록이 확인되면 실기기 Perf Monitor 또는 Instruments로 UI FPS와 메모리를 측정한다.
