# ponytail-group-management-member-list-virtualization-2026-09-12-16:58

## 1. 작업 요약

| 항목 | 내용 |
| --- | --- |
| 작업 일시 | 2026-09-12 16:58 KST |
| 관련 커밋·PR | 이 문서를 포함하는 CPA 커밋 |
| 대상 기능 | 모임 관리의 회원 목록 |
| 대상 파일 | [`GroupManagementOverlay.tsx`](../../src/screens/meeting/GroupManagementOverlay.tsx), [`meetingStyles.ts`](../../src/screens/meeting/meetingStyles.ts) |
| 핵심 구현 변경량 | 추가 100줄 + 삭제 80줄 = 180줄 |
| 200줄 예산 사용률 | 90% |
| 동작 변경 허용 여부 | 허용하지 않음 |
| 최종 판정 | 확인 |

### 범위와 사용자 동작 계약

- 입력: 기존 `members` 배열과 `refreshingMembers`, `submittingMemberAction` 상태를 그대로 사용한다.
- 출력·화면: 요약 카드, 회원별 프로필·이름·이메일·가입일·역할·역할 수정 버튼과 빈 결과 문구를 유지한다.
- 데이터 ID·개수·순서: `members`의 ID, 개수와 배열 순서를 그대로 표시한다.
- API 경로·호출 조건: 데이터 조회 코드는 수정하지 않고 기존 새로고침 콜백을 그대로 호출한다.
- 로딩·빈 결과·오류·권한 처리: 기존 오버레이 진입 조건, 새로고침 상태, 빈 목록과 역할 수정 비활성화를 유지한다.
- 제외: 가입 신청, 모임 정보 수정, 책장 생성 화면은 기존 `ScrollView`를 유지한다.

## 2. 변경 전

회원 수와 상관없이 `ScrollView` 안에서 모든 회원 카드를 한 번에 생성했다.

```tsx
<ScrollView refreshControl={/* 기존 회원 새로고침 */}>
  <View style={styles.managementSummaryCard}>{/* 동일한 요약 */}</View>
  <View style={styles.managementCardList}>
    {members.map((member) => (
      <View key={member.id} style={styles.managementListCard}>
        {/* 프로필·역할·이메일·가입일·역할 수정 */}
      </View>
    ))}
  </View>
</ScrollView>
```

### 변경 전 기준값

| 지표 | 값 | 측정 방법 |
| --- | ---: | --- |
| 전체 회원 즉시 생성 | 예 | 코드 확인 |
| 20명 첫 커밋 카드 | 20개 | iOS Release 벤치마크 중앙값 |
| 100명 첫 커밋 카드 | 100개 | 동일 |
| 500명 첫 커밋 카드 | 500개 | 동일 |
| 직접 의존성 추가 | 0개 | `package.json`과 import 확인 |

## 3. 가설·근거·기대 결과

### 가설

회원 화면만 React Native 기본 `FlatList`로 바꾸면 화면 밖 카드를 지연 생성하므로 회원 수가
많을수록 첫 React 커밋 시간과 초기 마운트 카드 수가 감소하고, 기존 데이터와 사용자 동작은
그대로 유지될 것이다.

### 근거

- 코드 검색 결과 `members.map()`이 전체 회원 카드를 즉시 생성하고 있었다.
- 같은 파일에 이미 `FlatList`가 import되어 있어 의존성과 새 추상화가 필요 없다.
- 회원 관리 화면은 다른 관리 화면과 `activeManagementScreen`으로 분리되어 있어 해당 분기만 교체할 수 있다.

### 기대 결과와 성공 기준

| 지표 | 기준값 | 목표값 | 성공 조건 |
| --- | ---: | ---: | --- |
| 100·500명 첫 커밋 카드 | 전체 | 일부 | 전체보다 적음 |
| 100·500명 첫 커밋 중앙값 | 변경 전 | 감소 | 변경 후가 더 짧음 |
| 회원 ID·개수·순서 | 기존 배열 | 동일 | 회귀 테스트 일치 |
| 문구·역할·프로필·버튼·새로고침 | 기존 동작 | 동일 | 회귀 테스트 통과 |
| 직접 의존성 | 0개 추가 | 0개 추가 | 달성 |

## 4. 변경 후

회원 관리 분기에만 기본 `FlatList`를 적용했다. 요약은 헤더, 빈 결과는 빈 컴포넌트,
카드 간격은 구분 컴포넌트로 옮겼다.

```tsx
<FlatList
  data={members}
  keyExtractor={(member) => member.id}
  refreshControl={/* 기존 회원 새로고침 */}
  ListHeaderComponent={/* 동일한 요약 */}
  ListEmptyComponent={/* 동일한 빈 결과 */}
  ItemSeparatorComponent={() => <View style={styles.managementMemberListSeparator} />}
  renderItem={({ item: member }) => (
    <View style={styles.managementListCard}>
      {/* 기존 회원 카드 내용과 동작 그대로 */}
    </View>
  )}
/>
```

### 변경 범위

| 구분 | 추가 | 삭제 | 합계 |
| --- | ---: | ---: | ---: |
| 핵심 구현 코드 | 100 | 80 | 180 |
| 회귀 테스트 | 147 | 0 | 147 |
| 벤치마크 도구·안내 | 337 | 0 | 337 |
| 원본 측정 데이터 | 111,537바이트 | 0 | 111,537바이트 |

- 핵심 구현 200줄 이내 여부: 예, 90% 사용
- 직접 의존성: 추가 없음
- 위험과 복구 방법: 회원 관리 분기만 이전 `ScrollView`와 `members.map()` 구조로 되돌릴 수 있다.

## 5. 측정 방법

| 항목 | 조건 |
| --- | --- |
| 기기·OS | iPhone 16 Pro Simulator, iOS 18.6, 402×874pt, scale 3 |
| 앱 빌드 모드 | Release, Hermes |
| 사용자·데이터 | 합성 회원 20·100·500명, 동일 ID·문구·역할 분포 |
| 네트워크 | API·원격 이미지 제외, 이미지 영역은 같은 크기의 `View` |
| 워밍업·반복 횟수 | 조건별 워밍업 5회, 본 측정 30회 |
| 순서 편향 완화 | 크기를 회전·역순 배치하고 변경 전·후 순서를 교차 |
| 관찰 구간 | 첫 커밋 후 250ms |
| 원본 데이터 | [`group-management-member-list-2026-09-12.json`](./data/group-management-member-list-2026-09-12.json) |

측정 지표는 마운트 요청부터 첫 React 커밋까지의 중앙값·p95, 첫 커밋과 250ms 뒤의
마운트 카드 수, JS `requestAnimationFrame` 최대 간격 p95와 20ms 초과 횟수다.

## 6. 측정 결과

### 첫 React 커밋 시간

| 회원 수 | 변경 전 중앙값 | 변경 후 중앙값 | 변화 | 변경 전 p95 | 변경 후 p95 | 변화 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 16.66ms | 10.68ms | -35.9% | 22.98ms | 16.27ms | -29.2% |
| 100 | 52.48ms | 8.85ms | -83.1% | 64.55ms | 22.48ms | -65.2% |
| 500 | 184.93ms | 6.56ms | -96.5% | 195.39ms | 12.81ms | -93.4% |

### 렌더 작업량과 JS 프레임 관측

| 회원 수 | 첫 커밋 카드 전→후 | 250ms 카드 전→후 | 최대 JS 간격 p95 전→후 | 20ms 초과 총횟수 전→후 |
| ---: | ---: | ---: | ---: | ---: |
| 20 | 20→10 | 20→20 | 23.09→22.39ms | 4→2 |
| 100 | 100→10 | 100→40 | 64.77→22.60ms | 42→2 |
| 500 | 500→10 | 500→40 | 196.22→17.65ms | 44→0 |

### 검증 결과

```sh
node --test scripts/group-management-member-list.test.mjs
npm run typecheck
npx eslint src/screens/meeting/GroupManagementOverlay.tsx src/screens/meeting/meetingStyles.ts --max-warnings 200
npm run check:typography
npm run check:spacing
```

- 회귀 테스트: 5/5 통과. 0·1·20·100·500명 데이터, ID·순서, 문구, 역할, 프로필,
  역할 수정 대상, 비활성화, 빈 결과, 새로고침, 다른 관리 화면 분리를 확인했다.
- TypeScript: 통과
- ESLint: 오류·경고 없음
- 디자인 토큰 검사: typography·spacing 모두 통과
- Release 벤치마크: 예열 30회와 본 측정 180회 완료
- 메모리·실기기 UI FPS: 측정하지 않음. 시뮬레이터에서 신뢰할 수 있는 실기기 자원 지표가 아니므로 개선으로 기록하지 않는다.
- 콘텐츠 레이아웃 시간: 반복 마운트에서 콜백이 보장되지 않아 판정 지표에서 제외했다.

## 7. 가설 판단과 결론

### 판정

확인

### 근거

- 100명과 500명에서 첫 커밋 카드가 각각 100→10개, 500→10개로 감소했다.
- 첫 커밋 중앙값은 100명 83.1%, 500명 96.5% 단축됐다.
- 5개 회귀 테스트에서 회원 데이터·문구·상태·동작 차이가 발견되지 않았다.
- API·권한·오류 처리 코드는 수정하지 않았다.

### 결론

모임 회원 관리 화면은 기존에 회원 전원의 무거운 카드를 첫 화면에서 한꺼번에 만들었다.
화면 자체를 새로 설계하지 않고 해당 분기의 `ScrollView + map()`만 React Native 기본
`FlatList`로 교체했다. Release/Hermes 실험에서 500명 첫 커밋 카드가 500개에서 10개로,
첫 커밋 중앙값이 184.93ms에서 6.56ms로 감소했다. 다만 결과는 API와 실제 이미지 디코딩을
제외한 iOS 시뮬레이터 렌더 비교이며, 메모리와 실기기 UI FPS 개선은 주장하지 않는다.

### 후속 작업

실기기 메모리가 실제 문제로 관측될 때만 Instruments 측정을 추가한다.
