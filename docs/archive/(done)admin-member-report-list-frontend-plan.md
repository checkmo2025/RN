# 관리자 회원 신고 목록 Web FE 구현 계획

> 작성 기준일: 2026-06-21 KST
> 기준 코드: `ref_code/FE`의 `fix-397-bug`
> 선행 조건: BE 관리자 회원 신고 목록 API 배포

## 1. 목표

관리자 `회원 관리 > 회원 상세 > 신고 목록` 탭에서 선택한 회원이 작성한 신고 목록을 표시한다.

각 카드에는 다음 내용을 보여준다.

- 신고 사유 badge
- 신고 내용
- 신고 대상
- 신고 일자

신고 대상이 현재 존재하고 이동 가능한 경우 대상 문구를 클릭하면 새 탭에서 해당 페이지를 연다. 대상이 삭제됐거나 이동 경로가 없으면 링크 대신 `삭제되었거나 확인할 수 없는 대상`을 표시한다.

## 2. 현재 코드 조사 결과

- 회원 상세 page와 `신고 목록` 탭, `ReportList`, `AdminReportItem` UI는 이미 존재한다.
- `fetchAdminMemberReports()`도 `/api/v1/admin/members/{nickname}/reports`를 호출하도록 작성돼 있다.
- 현재 BE `develop`에는 해당 endpoint가 없으므로 탭 진입 시 API 오류가 발생한다.
- FE 타입은 과거 `member_report` 응답인 `reportedMemberNickname`, `reportedMemberProfileImageUrl`, `reportType`을 기대한다.
- 현재 카드도 신고 대상을 보여주는 대신 선택 회원의 프로필처럼 보이는 정보를 렌더링한다.
- target URL을 props로 받지 않아 새 탭 이동 기능이 없다.

## 3. 적용할 API 타입

`src/lib/api/admin/member.ts`의 관리자 신고 타입을 다음 계약으로 교체한다.

```ts
export type AdminMemberReportItem = {
  reportId: number;
  reason: string;
  reasonDescription: string;
  content: string | null;
  targetType: string;
  targetTypeDescription: string;
  targetId: string;
  targetLabel: string;
  targetAvailable: boolean;
  targetUrl: string | null;
  reportedAt: string;
};

export type AdminMemberReportsResult = {
  reports: AdminMemberReportItem[];
  hasNext: boolean;
  nextCursor: number | null;
};
```

회원 상세의 `memberNickname`은 신고자 필터로만 사용한다. 카드에 신고자 이름을 반복해서 표시하지 않는다.

## 4. 파일별 수정 계획

### `src/lib/api/admin/endpoints/member.ts`

현재 endpoint 경로는 요구사항과 일치하므로 유지한다.

```ts
GET_MEMBER_REPORTS: (nickname: string) =>
  `${API_BASE_URL}/admin/members/${nickname}/reports`
```

nickname은 호출부에서 계속 `encodeURIComponent()` 처리한다.

### `src/lib/api/admin/member.ts`

- `AdminMemberReportItem`을 신규 BE 계약으로 교체한다.
- `AdminMemberReportsResult`에 `hasNext`, `nextCursor`를 추가한다.
- `fetchAdminMemberReports(memberNickname, cursorId?)` 시그니처로 변경한다.
- cursor가 있으면 `URLSearchParams`로 `cursorId`를 추가한다.
- `Accept: application/json`, `credentials: include`, `cache: no-store`는 유지한다.
- 오류 메시지에는 HTTP status를 포함하되 응답 body나 개인정보를 console에 출력하지 않는다.

`src/types/member.ts`의 사용자용 과거 신고 타입과 섞지 않는다. 관리자 API 타입은 현재 위치인 `lib/api/admin/member.ts`가 소유한다.

### `src/components/base-ui/Admin/users/ReportList.tsx`

초기 로딩과 다음 page 로딩을 분리한다.

상태:

```ts
reports
nextCursor
hasNext
isLoading
isError
isFetchingNextPage
```

처리:

1. `memberNickname` 변경 시 cursor 없이 첫 page를 조회하고 기존 목록을 초기화한다.
2. `react-intersection-observer`의 sentinel이 보이고 `hasNext=true`이면 다음 cursor를 요청한다.
3. 다음 page는 기존 배열 뒤에 append한다.
4. report ID 기준으로 중복이 생기지 않게 방어한다.
5. 초기 실패, 빈 목록, 다음 page 로딩 상태를 각각 표시한다.

카드 전달값:

```tsx
<AdminReportItem
  key={report.reportId}
  reason={report.reasonDescription}
  content={report.content?.trim() || "입력된 신고 내용 없음"}
  targetLabel={report.targetLabel}
  targetUrl={report.targetUrl}
  targetAvailable={report.targetAvailable}
  reportedAt={report.reportedAt}
/>
```

날짜는 `Intl.DateTimeFormat("ko-KR")`로 관리자 화면의 동일한 형식으로 변환한다.

### `src/components/base-ui/Admin/users/items/AdminReportItem.tsx`

현재 `category`, `reporterName`, `content`, `date` props를 다음으로 교체한다.

```ts
type Props = {
  reason: string;
  content: string;
  targetLabel: string;
  targetUrl: string | null;
  targetAvailable: boolean;
  reportedAt: string;
};
```

카드 배치:

- 왼쪽: 신고 사유 badge
- 가운데: `신고 내용` label과 내용
- 하단 또는 별도 행: `신고 대상` label과 대상 문구
- 오른쪽 상단: 신고 일자

대상 이동은 `window.open()` 대신 anchor를 사용한다.

```tsx
<a
  href={targetUrl}
  target="_blank"
  rel="noopener noreferrer"
>
  {targetLabel}
</a>
```

링크 생성 조건:

- `targetAvailable === true`
- `targetUrl !== null`
- `targetUrl.startsWith("/")`

조건을 만족하지 않으면 button이나 anchor를 렌더링하지 않는다. 비활성 텍스트와 `대상 페이지 없음` 보조 문구를 보여준다.

기존 `Image`, `DEFAULT_PROFILE_IMAGE`, `reporterName` UI는 제거한다. 선택 회원이 신고자라는 사실은 상단 회원 정보로 이미 확인할 수 있기 때문이다.

키보드 사용자에게 새 탭 이동이 보이도록 focus style과 `aria-label="신고 대상 새 탭에서 열기"`를 추가한다.

### `src/components/base-ui/Admin/users/AdminUserTab.tsx`

탭 ID와 label은 현재 `reports` / `신고 목록`을 유지한다. API 의미를 코드 주석으로 `선택 회원이 작성한 신고`라고 명시해, 해당 회원이 신고당한 목록으로 오해하지 않게 한다.

### `src/app/(admin)/admin/(app)/users/[id]/page.tsx`

현재 `ReportList memberNickname={member.nickname}` 연결은 올바르므로 구조를 바꾸지 않는다.

확인할 사항:

- URL의 `[id]`가 닉네임으로 사용되고 상세 응답의 `member.nickname`을 신고자 필터로 전달한다.
- 신고 탭 전환이 회원 기본 정보 재조회나 page 전체 navigation을 유발하지 않는다.

## 5. UI 상태 정의

### 정상 대상

- 대상 문구에 underline 또는 외부 이동 아이콘을 표시한다.
- 클릭 시 동일 origin의 상대 경로를 새 탭으로 연다.
- 현재 관리자 탭은 유지된다.

### 삭제되었거나 열 수 없는 대상

- 신고 사유, 내용, 날짜는 그대로 표시한다.
- 대상은 `삭제되었거나 확인할 수 없는 대상`으로 표시한다.
- hover, focus, pointer cursor를 적용하지 않는다.

### 신고 내용 없음

- 빈 영역으로 두지 않고 `입력된 신고 내용 없음`을 표시한다.

### 목록 없음

- 기존 문구를 `작성한 신고가 없습니다.`로 명확하게 변경한다.

### 오류

- 초기 조회 실패는 `신고 목록을 불러오지 못했습니다.`와 재시도 button을 제공한다.
- 다음 page 조회 실패는 기존 목록을 유지하고 하단에 재시도 UI만 표시한다.

## 6. 검증 시나리오

1. 신고가 없는 회원은 빈 상태가 표시된다.
2. 회원 신고, 모임 신고, 책 이야기 신고가 각각 올바른 대상 문구와 URL을 보여준다.
3. 댓글 신고는 부모 상세 page를 새 탭으로 연다.
4. 발제·한줄평·채팅 신고는 올바른 모임/정기모임 context로 이동한다.
5. 삭제된 대상은 링크 없이 신고 이력만 표시된다.
6. 신고 내용이 null인 항목은 fallback 문구를 표시한다.
7. 20개를 초과하면 다음 cursor page가 중복 없이 추가된다.
8. 새 탭을 연 뒤에도 관리자 회원 상세와 선택된 신고 탭이 유지된다.
9. 일반 사용자 세션 또는 만료 세션에서는 관리자 layout 정책대로 접근이 차단된다.
10. mobile, tablet, desktop에서 카드 내용이 잘리거나 가로 overflow가 생기지 않는다.

검증 명령:

```bash
pnpm lint
pnpm build
```

## 7. 구현 및 배포 순서

1. BE 관리자 신고 목록 API와 안전한 target 계약을 먼저 배포한다.
2. 운영 Swagger에서 실제 response field와 nullable 값을 확인한다.
3. FE API 타입과 fetch 함수의 cursor 처리를 변경한다.
4. ReportList와 AdminReportItem을 새 계약에 맞게 변경한다.
5. 정상 대상과 삭제 대상 데이터를 사용해 새 탭 이동을 수동 검증한다.
6. FE를 배포하고 관리자 계정으로 최종 smoke test한다.

## 8. 완료 기준

- 관리자 회원 상세에서 신고 목록이 404 없이 로드된다.
- 각 행에 신고 내용과 신고 대상이 구분되어 표시된다.
- 유효한 대상만 새 탭에서 열린다.
- 대상이 없는 신고도 목록에서 사라지거나 전체 오류를 만들지 않는다.
- cursor pagination, 빈 상태, 오류 상태와 반응형 레이아웃이 정상 동작한다.
