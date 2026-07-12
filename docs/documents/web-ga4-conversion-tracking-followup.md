# 웹 GA4 전환 추적 후속 작업

> 작성일: 2026-07-12 KST  
> 대상: `ref_code/FE` 웹 프론트엔드(읽기 전용 참조)  
> 목표: UTM 방문부터 로그인·회원가입·모임 가입 신청까지 동일 GA4 속성에서 확인

## 현재 확인 상태

- `src/app/layout.tsx`에서 `NEXT_PUBLIC_GTM_ID`로 Google Tag Manager를 로드한다.
- 웹 코드에는 `sendGTMEvent` 또는 `dataLayer.push` 기반 전환 이벤트가 없다.
- UTM 방문은 GTM 안의 GA4 태그가 게시되어 있으면 웹 캠페인으로 자동 수집된다.
- 앱과 웹을 합쳐 보려면 GTM의 GA4 측정 ID가 Firebase 프로젝트에 연결된 동일 GA4 속성의 웹 데이터 스트림이어야 한다.

## 공통 이벤트 계약

| 이벤트 | 발생 조건 | 필수 파라미터 |
|---|---|---|
| `login` | 로그인 API와 프로필 확인 성공 | `method` |
| `sign_up` | 추가 회원 정보 저장까지 완료 | `method` |
| `club_join_request` | 모임 가입 신청 API 성공 | `club_id` |
| `join_group` | 신청 결과가 실제 가입 상태임을 확인 | `group_id` |

권장 `method` 값은 `email`, `kakao`, `google`, `naver`, `apple`, `unknown`으로 통일한다.

## 웹 코드 반영 지점

### 로그인

파일: `src/components/base-ui/Login/hooks/useLoginForm.tsx`

- `authService.login` 및 로그인 사용자 상태 반영이 성공한 뒤 `login` 이벤트를 전송한다.
- 이메일 로그인은 `method: "email"`을 사용한다.
- 소셜 로그인 콜백 성공 경로에서도 공급자별 `method`를 전송한다.

### 회원가입

파일: `src/components/base-ui/Join/steps/ProfileImage/useProfileImage.ts`

- `authService.additionalInfo`와 최종 프로필 상태 반영이 성공한 뒤 `sign_up` 이벤트를 전송한다.
- 계정 생성 API 직후가 아니라 프로필 완성까지 끝난 시점을 가입 완료로 본다.

### 모임 가입

파일: `src/app/(main)/groups/GroupsPageClient.tsx`

- `joinAsync` 성공 직후 `club_join_request`를 전송한다.
- 현재 응답은 문자열이라 실제 가입 상태와 대기 상태를 구분할 수 없다.
- `join_group`은 가입 후 멤버십 조회를 추가하거나 API 응답에 상태가 포함된 뒤 전송한다.
- 운영진 승인으로 나중에 가입되는 경우의 실제 `join_group` 전환은 백엔드 이벤트가 가장 정확하다.

## GTM 설정

1. 위 네 이벤트를 `dataLayer` Custom Event로 수신한다.
2. 각 이벤트 이름과 동일한 GA4 Event 태그를 만든다.
3. `method`, `club_id`, `group_id`를 이벤트 파라미터로 전달한다.
4. 모든 GA4 Event 태그는 앱 Firebase와 같은 GA4 속성의 웹 데이터 스트림으로 보낸다.
5. GA4 관리에서 `sign_up`, `club_join_request`, `join_group`을 주요 이벤트로 지정한다.

## 유입 속성

웹 UTM 표준은 아래 값을 사용한다.

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

앱과 동일하게 장기 전환의 최초·최근 유입을 별도로 비교하려면 웹에서도 첫 방문 UTM과 최근 UTM을 쿠키 또는 localStorage에 저장하고 전환 이벤트에 아래 값을 추가한다.

```text
first_source
first_medium
first_campaign
last_source
last_medium
last_campaign
```

GA4 관리에서 위 값을 이벤트 범위 또는 사용자 범위 맞춤 측정기준으로 등록해야 탐색 보고서에서 선택할 수 있다.

## 대시보드 권장 퍼널

```text
session_start 또는 landing page view
→ login
→ sign_up
→ club_join_request
→ join_group
```

기본 분해 기준은 `플랫폼`, `수동 소스/매체`, `수동 캠페인`, `first_source`, `last_source`로 둔다.
