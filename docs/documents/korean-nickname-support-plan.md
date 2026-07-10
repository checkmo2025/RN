# 한글 닉네임 허용 구현 계획 — 띄어쓰기 미지원

> 작성일: 2026-07-10 KST
> 대상: RN `checkmo_rn`, BE `ref_code/BE`, FE `ref_code/FE`
> 상태: ⬜ 정책 확정 · 구현 대기
> 주의: `ref_code/BE`, `ref_code/FE`는 읽기 전용 참조 코드다. 실제 구현은 BE·FE 원본 저장소의 별도 브랜치에서 진행한다.

## 0. 확정 정책

| 항목 | 결정 |
|---|---|
| 한글 | 허용 |
| 한글 범위 | 완성형 `가-힣`과 호환 자모 `ㄱ-ㅎㅏ-ㅣ` 허용 |
| 띄어쓰기 | **미지원**. 앞·뒤·중간 공백, 연속 공백, 탭·개행·NBSP 등 모든 공백 문자 금지 |
| 길이 | 기존 최대 20자 유지 |
| 영문 | 기존처럼 소문자 `a-z`만 허용 |
| 숫자·특수문자 | 기존 DTO/RN의 명시적 허용 문자 집합 유지 |
| 이모지·기타 문자 | 미지원 |
| 정규화 | 중복 확인·저장·현재 닉네임 비교 전에 Unicode NFC 적용 |
| 중복 | 정규화된 최종 닉네임 기준으로 중복 불가 |

정책 예시:

| 입력 | 결과 | 이유 |
|---|---|---|
| `책모` | 허용 | 완성형 한글 |
| `책모123` | 허용 | 한글·숫자 혼합 |
| `ㅋㅋ책모` | 허용 | 호환 자모·완성형 한글 |
| `책모_123` | 허용 | 기존 허용 특수문자 유지 |
| `책 모` | 거부 | 중간 공백 |
| ` 책모`, `책모 ` | 거부 | 앞·뒤 공백 |
| `책  모` | 거부 | 연속 공백 |
| `책📚모` | 거부 | 이모지 |
| `BookMo` | 거부 | 영문 대문자 |

권장 사용자 문구:

- 기본 안내: `한글/영문 소문자/숫자/특수문자, 최대 20자`
- 공백 오류: `닉네임에는 띄어쓰기를 사용할 수 없습니다.`
- 문자 오류: `닉네임은 한글/영문 소문자/숫자/특수문자만 사용할 수 있습니다.`
- 길이 오류: `닉네임은 최대 20자까지 가능합니다.`

입력 중 허용되지 않는 문자를 조용히 삭제하지 않는다. 원문을 유지한 상태에서 오류를 표시하고 중복확인·다음 단계·저장을 차단한다. 특히 한글 IME 조합 중 나타나는 자모가 삭제되지 않아야 한다.

## 1. 공통 계약

1. BE를 닉네임 정책의 최종 기준으로 둔다.
2. `중복 확인`, `추가정보 입력`, `프로필 수정`이 동일한 validator와 normalizer를 사용한다.
3. 처리 순서는 `NFC 정규화 → 공백 검사 → 길이 검사 → 허용 문자 검사 → 중복 검사`로 통일한다.
4. 회원가입/프로필 저장 요청은 공백을 `trim()`하여 몰래 허용하지 않는다. 원본에 공백이 하나라도 있으면 검증 실패로 처리한다.
5. 로그인 입력의 앞뒤 공백 `trim()`은 사용 편의를 위해 유지할 수 있지만, 저장된 닉네임 자체에는 공백이 존재할 수 없다.
6. 닉네임이 URL path에 들어갈 때는 항상 path segment 단위로 `encodeURIComponent` 처리한다.

## 2. BE 구현 — 첫 번째 배포

### 2.1 검증 정책 단일화

현재 BE의 저장 DTO와 중복확인 API가 서로 다른 정규식을 사용한다.

- `member/web/dto/MemberRequestDTO.java`
  - `MemberProfileUpdate.nickname` (`:18-23`)
  - `AdditionalInfo.nickname` (`:53-59`)
  - 현재: 영문 소문자·숫자·명시된 특수문자만 허용
- `member/web/controller/MemberController.java`
  - `checkNickname()` (`:71-85`)
  - 현재: `^[a-z0-9\p{Punct}]+$`로 DTO보다 넓은 특수문자를 허용

구현 계획:

- [ ] 공통 `NicknamePolicy`와 커스텀 validation annotation/validator 추가
- [ ] 완성형 한글·호환 자모를 허용 문자에 포함
- [ ] 모든 종류의 공백을 명시적으로 거부
- [ ] 최대 20자, 영문 소문자, 기존 명시적 특수문자 정책 통일
- [ ] validation 메시지와 Swagger `@Schema` 설명·예시 갱신
- [ ] 프로필 수정의 `null`/빈 값은 기존의 "닉네임 변경 없음" 의미를 유지

### 2.2 정규화·중복·저장

- `member/internal/service/command/MemberCommandService.java`
  - 추가정보 저장 (`:56-78`)
  - 프로필 수정 (`:95-110`)
- `authentication/internal/service/command/AuthUserCommandService.java`
  - `updateNickname()` (`:156-165`)

구현 계획:

- [ ] 저장 전에 NFC로 정규화한 값을 `Member`와 `AuthUser` 양쪽에 동일하게 저장
- [ ] 추가정보 입력에도 명시적 닉네임 중복 검사 적용
- [ ] 프로필 수정의 현재 닉네임 비교도 정규화된 값으로 수행
- [ ] 중복확인 이후 동시 선점으로 DB UNIQUE 충돌이 발생해도 `MEMBER_416`으로 변환
- [ ] 중복확인 결과와 최종 저장 결과가 다르지 않도록 동일 repository 조건 사용

### 2.3 DB 확인

- `Member.nickName`, `AuthUser.nickName`은 모두 `VARCHAR(20)` 대응이므로 기본적으로 길이 migration은 필요 없다.
- 배포 전 운영 `member.nick_name`, `auth_user.nick_name`의 charset/collation이 한글과 NFC 중복 정책을 지원하는지 확인한다.
- 문제가 있을 때만 기존 migration을 수정하지 않고 신규 Flyway migration을 추가한다.

### 2.4 BE 테스트

- [ ] `PublicMemberApiTest`: 기존 `checkNicknameRejectsHangulNickname`을 한글 허용 테스트로 변경
- [ ] 사용 가능한 한글 닉네임 → `200`, `result=false`
- [ ] 이미 저장된 한글 닉네임 → `200`, `result=true`
- [ ] 공백 위치별 거부: 앞·뒤·중간·연속·탭·개행·NBSP
- [ ] 한글/숫자/기존 특수문자 혼합 허용
- [ ] 20자 허용, 21자 거부
- [ ] 이모지·대문자·기타 문자 거부
- [ ] `MemberApiTest`: 한글 추가정보 저장 및 `Member`·`AuthUser` 동기화
- [ ] `MemberApiTest`: 한글 닉네임 프로필 변경·중복·동시 선점 오류
- [ ] `AuthApiTest`: 한글 닉네임으로 웹/앱 로그인
- [ ] 한글 닉네임 path 회귀: 프로필·팔로우·차단·회원별 책·책이야기 조회
- [ ] MySQL/Flyway 환경에서 charset·UNIQUE 동작 확인

## 3. FE 구현 — BE 배포 후

### 3.1 공통 validator/normalizer

- 신규 공통 모듈 예시: `src/utils/nicknamePolicy.ts`
- [ ] `NICKNAME_MAX_LENGTH`, 허용 문자, NFC 정규화, 오류 사유를 한 곳에서 제공
- [ ] 가입과 프로필 편집의 중복된 인라인 정규식 제거
- [ ] 한글 IME 조합 중 자모를 삭제하지 않도록 destructive filtering 제거
- [ ] 공백 입력 시 명시적 오류를 보여주고 중복확인·저장을 차단

### 3.2 회원가입

- `components/base-ui/Join/steps/ProfileSetup/useProfileSetup.ts`
  - `handleNicknameChange()` (`:32-42`)
  - `profileSchema` (`:6-14`)
- `components/base-ui/Join/steps/ProfileSetup/ProfileSetup.tsx`
  - 모바일·데스크톱 닉네임 입력 및 오류 문구 (`:60-100`)

작업:

- [ ] 한글을 제거하는 정규식과 `한글과 띄어쓰기는 사용할 수 없습니다.` 문구 교체
- [ ] Zod schema, 중복확인 버튼 활성 조건, 최종 전송 전 검증을 공통 정책으로 통일
- [ ] 최대 20자 카운터·안내 문구 갱신
- [ ] 닉네임 변경 시 기존 중복확인 상태 초기화 유지

### 3.3 프로필 편집

- `app/(main)/setting/profile/ProfileEditPageClient.tsx`
  - 인라인 영문 전용 필터 (`:56-65`)
  - placeholder (`:191-202`)

작업:

- [ ] 회원가입과 동일한 공통 validator 적용
- [ ] 현재 닉네임 비교·중복확인·저장 body에 동일한 NFC 값 사용
- [ ] 한글 포함 안내 문구로 변경
- [ ] 공백·잘못된 문자·미확인 상태에서는 저장 차단

### 3.4 프로필 URL

사용자 API endpoint는 대부분 `encodeURIComponent`를 사용하지만, 프로필 경로를 문자열로 직접 조합하거나 `href`에 닉네임을 그대로 넣는 호출부가 여러 곳 있다.

- [ ] `profilePath(nickname)` 같은 공통 route helper 추가
- [ ] 홈·스토리·책 상세·댓글·팔로우·모임·관리자 회원 링크를 공통 helper로 교체
- [ ] 한글 닉네임 직접 URL 접속·새로고침·뒤로가기 회귀 확인

FE API DTO는 이미 `string`이므로 타입 변경은 필요 없다.

## 4. RN 구현 — BE 배포 후 앱 릴리스

### 4.1 공통 정책

- `src/constants/validation.ts`
  - 현재 `nicknameRegex` (`:4`)
- `src/constants/inputLimits.ts`
  - `NICKNAME: 20` 유지

작업:

- [ ] `nicknameRegex`에 완성형 한글·호환 자모 추가
- [ ] 공통 `normalizeNickname()`·`validateNickname()` 제공
- [ ] 공백/문자/길이 오류를 구분해 화면에서 동일 문구 사용

### 4.2 회원가입·프로필 완성

- `src/screens/AuthFlowScreen.tsx`
  - `resolveNicknameFormatError()` (`:115-125`)
  - `normalizeNicknameInput()` (`:127-148`)
  - `handleNicknameChange()` (`:643-652`)
  - 중복확인·다음 단계 검증 (`:735-781`)
  - 프로필 닉네임 UI (`:1467-1520`)

작업:

- [ ] 한글 금지 분기와 한글 삭제 로직 제거
- [ ] 한글 IME 조합 문자를 그대로 유지
- [ ] 공백은 삭제로 숨기지 않고 오류 표시 후 진행 차단
- [ ] 중복확인·다음 단계·최종 payload가 같은 NFC 값을 사용
- [ ] `아이디`로 잘못 표기된 오류 문구를 `닉네임`으로 통일

### 4.3 마이페이지 프로필 편집

- `src/screens/MyPageScreen.tsx`
  - `handleProfileEditNicknameChange()` (`:842-850`)
  - 중복확인·저장 검증 (`:852-903`)
  - placeholder·상태 UI (`:2069-2113`)

작업:

- [ ] 인라인 영문 전용 필터를 공통 validator로 교체
- [ ] 현재 닉네임 비교와 중복확인 완료 값을 NFC 기준으로 관리
- [ ] 한글 포함 placeholder와 공백 오류 표시 추가
- [ ] 저장 사이 선점 시 `MEMBER_416` 처리와 중복확인 초기화 유지

### 4.4 i18n·API 경로

- `src/i18n/translations.ts`
  - 영문 전용 오류 (`:908-910`)
  - 영문 전용 placeholder (`:1014-1015`)
- [ ] 한국어·영어 번역을 새 정책에 맞게 갱신

RN의 닉네임 query는 `URLSearchParams`, 주요 path는 `encodeURIComponent`, 딥링크는 decode하고 있으므로 API 타입 변경은 필요 없다. 코드 변경보다 한글 path 왕복 회귀 테스트가 핵심이다.

## 5. 구현·배포 순서와 브랜치

1. **BE 원본 저장소**
   - 별도 브랜치 예시: `feat/member-hangul-nickname`
   - 공통 정책·API·테스트 반영 후 먼저 배포
2. **FE 원본 저장소**
   - BE 배포 계약을 기준으로 가입·프로필 편집·URL 인코딩 반영
3. **RN `checkmo_rn`**
   - 동일 계약 반영 후 앱 검증·릴리스

BE가 기존 정책의 상위 집합으로 먼저 배포되면 구버전 FE/RN은 기존 영문 닉네임만 입력하면서 계속 동작한다. FE/RN을 먼저 배포하면 한글 중복확인·저장이 BE에서 거부될 수 있으므로 순서를 바꾸지 않는다.

## 6. 통합 검증 시나리오

| 영역 | 시나리오 | 기대 결과 |
|---|---|---|
| 중복확인 | `책모`, `책모123`, `ㅋㅋ책모`, `책모_123` | 정책상 유효, 중복 여부 정상 반환 |
| 공백 | `책 모`, ` 책모`, `책모 `, `책  모`, 탭/NBSP 포함 | 공백 전용 오류, API 호출·저장 차단 |
| 길이 | 한글 20자 / 21자 | 20자 허용, 21자 거부 |
| 문자 | 이모지·대문자·기타 문자 | 문자 규칙 오류 |
| 가입 | 한글 닉네임 중복확인 → 추가정보 저장 | 가입 완료 후 한글 닉네임 노출 |
| 프로필 | 영문 닉네임 → 한글 닉네임 변경 | `Member`·`AuthUser` 동기화, 앱 상태 갱신 |
| 로그인 | 한글 닉네임 + 비밀번호 | 웹·앱 로그인 성공 |
| 경로 | 프로필·팔로우·차단·서재·책이야기·딥링크 | 인코딩/디코딩 후 동일 닉네임으로 조회 |
| 동시성 | 중복확인 후 다른 요청이 먼저 선점 | 저장 실패 `MEMBER_416`, 재확인 유도 |

## 7. 완료 기준(DoD)

- BE·FE·RN이 같은 한글/공백/길이/문자 정책을 사용한다.
- 한글 완성형과 호환 자모 닉네임을 가입·수정·로그인에서 사용할 수 있다.
- 위치와 종류에 관계없이 공백이 포함된 닉네임은 저장되지 않는다.
- 닉네임 중복확인과 최종 저장 결과가 일치한다.
- 한글 닉네임이 들어간 모든 API path와 딥링크가 정상 동작한다.
- BE 테스트, FE `lint`·`build`, RN `typecheck`·`lint`·`check`가 통과한다.
- 테스트 계정으로 가입·수정처럼 서버 데이터를 변경하는 E2E는 사전 승인 후 실행한다.

## 8. 이번 범위에서 제외

- 닉네임 띄어쓰기 지원
- 고유 `handle`과 자유로운 `displayName` 분리
- 최대 길이 20자 변경
- 기존 허용 특수문자 축소 또는 확대
- 탈퇴 회원 닉네임 재사용 정책 변경
- `ref_code/BE`, `ref_code/FE` 직접 수정

## 9. 레퍼런스 메모

- [그믐](https://www.gmeum.com/): 한글·자모 허용, 공백 미지원, 웹 UI 기준 2~10자
- [밀리의 서재 프로필](https://www.millie.co.kr/v4/library/profile): 한글·내부 공백 허용, 최대 20자
- [포스타입 멀티 프로필](https://help.postype.com/hc/ko/articles/360008746434-%EB%A9%80%ED%8B%B0-%ED%94%84%EB%A1%9C%ED%95%84): 1~40자, 공백만으로 된 닉네임만 금지

책모는 현재 닉네임을 표시명뿐 아니라 로그인·프로필 URL·팔로우·차단·신고 식별자로도 사용한다. 따라서 이번 단계에서는 가장 가까운 독서 커뮤니티인 그믐처럼 **한글은 허용하되 공백은 금지**하고, 향후 표시명과 고유 식별자를 분리할 때 공백 지원을 다시 검토한다.
