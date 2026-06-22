# 모임 회원 목록(로스터) 공개 구현 계획 — 일반 회원용

> 작성일: 2026-06-21 KST
> 기준 코드: RN `checkmo_rn`(src/), BE `ref_code/BE`(develop)
> 상태: ⬜ 계획 확정(구현 대기)
> 목적: 지금은 운영진(STAFF/OWNER)만 볼 수 있는 모임 회원 목록을, **그 모임의 가입 회원이면 누구나** 볼 수 있게 한다. (프로필 사진·닉네임·역할, 탭하면 프로필 이동)

## 0. 확정 결정

| 항목 | 결정 |
|---|---|
| **노출 범위** | **①그 모임의 ACTIVE 가입 회원만** 조회 가능 (비회원/PENDING/비로그인 불가) |
| **노출 필드** | `clubMemberId`, `nickname`, `profileImageUrl`, `role`(OWNER/STAFF/MEMBER) — **email/name/joinMessage 등 PII 제외** |
| **대상 멤버** | ACTIVE(MEMBER/STAFF/OWNER)만. PENDING/WITHDRAWN/KICKED 제외 |
| **상호작용** | 행 탭 → 해당 회원 `UserProfile`로 이동 (본인이면 `My` 탭) |
| **방식** | **BE 신규 전용 엔드포인트 추가** (기존 운영진용 `/members` 재활용 안 함) |

### 왜 기존 `GET /clubs/{clubId}/members` 재활용을 안 하나
- 권한 검사가 서비스 레이어에 박혀 있음: `ClubManagementQueryFacade.java:145-155`의 `if (!requester.isStaff()) throw CLUB_STAFF_ONLY`.
- 반환 DTO에 `email`·`name`·`joinMessage(가입사유)`·`appliedAt` 등 **운영진 전용 PII 포함** → 일반 회원에게 열면 정보 유출.
- 관리용 상태(PENDING/WITHDRAWN/KICKED)까지 다루는 계약이라 공개용과 정책이 섞임.
- → 가볍고 안전한 **별도 엔드포인트**가 맞음.

## 1. BE 구현 (ref_code/BE)

### 1.1 신규 엔드포인트
```
GET /api/v1/clubs/{clubId}/members/roster?cursorId={optional}
```
- 컨트롤러: `clubManagement/web/controller/ClubController.java` (기존 staff용 `getClubMembers`는 `:218`)에 메서드 추가.
- 응답: `ApiResponse<ClubResponseDTO.ClubMemberRoster>` (커서 페이지네이션)

### 1.2 권한 (핵심)
- `clubManagement/internal/service/ClubManagementQueryFacade.java`에 신규 메서드 `retrieveClubMemberRoster(clubId, memberId, cursorId)` 추가.
- 검증 순서:
  1. `validateClub(clubId)`
  2. `ClubMember requester = clubMemberQueryService.validateClubMember(clubId, memberId)` — **모임 멤버가 아니면 예외**(기존 검증 재사용)
  3. requester가 **ACTIVE(MEMBER/STAFF/OWNER)** 인지 확인 (PENDING이면 차단). `ClubMemberStatus.activeStatuses()` 활용.
  4. ❗기존 staff용과 달리 `isStaff()` 검사는 **하지 않음**.
- 즉 "그 모임의 가입(활성) 회원이면 누구나" 통과.

### 1.3 조회/DTO (재사용 최대화)
- 조회: 기존 `ClubMemberStatusFilter.ACTIVE` 기반 쿼리(MEMBER/STAFF/OWNER)를 그대로 재사용 + cursorId 페이지네이션.
- 응답 DTO: **신규 슬림 DTO** `ClubResponseDTO.ClubMemberRoster`
  - `members`: List of `RosterMember`
    - `clubMemberId` (Long)
    - `memberInfo` (이미 있는 `MemberExternalDTO.BasicInfo` = nickname + profileImageUrl 재사용)
    - `role` (String: OWNER/STAFF/MEMBER) — `clubMemberStatus`에서 매핑
  - `hasNext` (boolean), `nextCursor` (Long, nullable)
  - **email/name/joinMessage/appliedAt 미포함**
- 정렬: 역할 우선(OWNER→STAFF→MEMBER) 후 가입순 등 — BE 합의(기본은 가입순 + 운영진 상단 권장).

### 1.4 BE 작업 체크리스트
- [ ] `ClubResponseDTO.ClubMemberRoster` / `RosterMember` DTO 추가(BasicInfo 재사용)
- [ ] `ClubManagementQueryFacade.retrieveClubMemberRoster()` 추가(멤버십 검증, staff 미요구, ACTIVE 필터)
- [ ] `ClubController` GET `/{clubId}/members/roster` 추가
- [ ] 권한 테스트: 운영진/일반회원=200, PENDING/비회원/비로그인=403(또는 정책 코드)
- [ ] Swagger 문서 반영

## 2. RN 구현 (checkmo_rn)

### 2.1 API
- `src/services/api/clubApi.ts`에 `fetchClubRoster(clubId, cursorId?)` 추가.
  - 경로 `GET /clubs/${clubId}/members/roster`, 커서 페이지네이션은 기존 `collectAllCursorPages`(`src/utils/pagination.ts`) 또는 무한스크롤 패턴 재사용.
  - 반환 타입 `ClubRosterMember[]` (`clubMemberId`, `nickname`, `profileImageUrl?`, `role`).
  - 기존 staff용 `fetchClubMembers`(`clubApi.ts:1333-1356`)와 별도 함수로 둠.

### 2.2 진입점 (모임 가입 회원에게만 노출)
- 모임 홈(`GroupHomeView`)에 "회원 N명 〉" 섹션/행 추가 → 탭 시 회원 목록 화면 진입.
- 가입 회원이 아닐 땐 진입점 숨김/비활성(현재 `membershipStatus`/`canManageClub` 판정 로직 재사용, `workspaceLoader.ts`).

### 2.3 회원 목록 화면/오버레이
- 신규 뷰(예: `GroupMemberRosterView`) — 리스트 행 UI는 기존 관리용 행 패턴(`GroupManagementOverlay.tsx:443-487`, 스타일 `meetingStyles.ts`의 `managementIdentityRow/managementAvatar/managementPrimaryText`)을 **경량 버전으로 재사용**:
  - 프로필 사진(없으면 `DefaultProfileAvatar`) + 닉네임 + 역할 배지
  - **역할 수정/이메일/가입일 등 관리 요소 제거**
- 행 탭 → `navigation.navigate('UserProfile', { memberNickname, fromScreen: 'Meeting' })` (본인이면 `My` 탭). 패턴은 `useManagementState.ts:468-478`, `StoryScreen.tsx:801-812` 참고.
- 로딩 스켈레톤(기존 SkeletonBox 패턴), 빈/오류 상태 처리.

### 2.4 RN 작업 체크리스트
- [ ] `fetchClubRoster` + 타입 추가
- [ ] 모임 홈에 "회원 N명" 진입점(가입 회원에게만)
- [ ] `GroupMemberRosterView`(경량 행 + 역할 배지 + 프로필 이동)
- [ ] 로딩/빈/오류 상태, 무한스크롤(or 전체 수집)
- [ ] 디자인 토큰만 사용 → `npm run check` 통과
- [ ] iOS/Android 실기기 확인

## 3. 완료 기준(DoD)

- 그 모임의 **가입(ACTIVE) 회원**이 모임 홈에서 회원 목록에 진입해 프로필사진·닉네임·역할을 본다.
- 행 탭 시 해당 회원 프로필로 이동(본인은 마이페이지).
- **비회원/PENDING/비로그인은 목록 진입/조회 불가**(BE 403).
- 응답에 email/name/joinMessage 등 PII가 포함되지 않는다.
- 운영진의 기존 "회원 관리"(`/members`) 기능은 영향 없음.

## 4. 선행/의존
- **BE 엔드포인트 배포가 RN 작업의 선행 조건**(`/members/roster`).
- 정렬·역할 라벨 표기(개설자/운영진/회원)·페이지 크기는 BE와 합의해 확정.
