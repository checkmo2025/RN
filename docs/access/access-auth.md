# 인증 화면 접근 권한 (`AuthFlowScreen`)

## 역할 범위

| 역할 | 설명 |
|------|------|
| 사용자 | 회원가입 하지 않은 사람 |
| 멤버 | 회원가입을 한 사람 |

---

## 인증 플로우 구성

`AuthFlowScreen`은 단일 화면에서 스텝 기반 상태 머신으로 동작합니다.

| 스텝 | 이름 | 설명 |
|------|------|------|
| login | 로그인 | 이메일/닉네임 + 비밀번호 입력 |
| findId | 아이디 찾기 | 이름 + 전화번호로 이메일 조회 |
| resetPw | 비밀번호 재발급 | 이메일로 임시 비밀번호 발송 |
| terms | 약관 동의 (가입 1/6) | 필수/선택 약관 동의 |
| emailVerification | 이메일 인증 (가입 2/6) | 인증 코드 발송/확인 (10분 유효) |
| passwordSet | 비밀번호 설정 (가입 3/6) | 비밀번호 입력 및 유효성 검사 |
| profileBasic | 기본 정보 (가입 4/6) | 닉네임/이름/전화번호/소개 |
| profileExtra | 추가 정보 (가입 5/6) | 프로필 이미지/카테고리/아바타 색상 |
| signupComplete | 가입 완료 (가입 6/6) | 완료 확인 및 다음 행동 선택 |

---

## 기능별 권한

| 기능 | 사용자 | 멤버 |
|------|:------:|:----:|
| 로그인 화면 진입 | ✅ | ✅ (이미 로그인 상태면 미진입) |
| 이메일/닉네임 로그인 | ✅ | ✅ |
| 소셜 로그인 (카카오 등) | ✅ | ✅ |
| 회원가입 플로우 진행 | ✅ | ❌ (이미 가입됨) |
| 아이디 찾기 | ✅ | ✅ |
| 임시 비밀번호 발급 | ✅ | ✅ |

---

## 회원가입 단계별 검증 규칙

| 단계 | 검증 항목 |
|------|-----------|
| 이메일 | 이메일 형식, 인증 코드 일치, 10분 타이머 |
| 비밀번호 | 6~12자, 영문 1자 이상 + 특수문자 1자 이상 |
| 닉네임 | 최대 20자, 영문/한글/숫자/특수문자, 중복 확인 필요 |
| 이름 | 최대 10자 |
| 소개 | 최대 40자 |
| 카테고리 | 1~6개 선택 (15개 중) |

---

## 비고

- `POST /api/auth/login` — permitAll
- `POST /api/auth/sign-up`, `POST /api/auth/additional-info` — permitAll (가입 전 단계)
- `POST /api/auth/email-verifications` (코드 발송), `POST /api/auth/email-verifications/confirm` — permitAll
- `GET /api/members/find-email`, `POST /api/auth/temporary-password` — permitAll (계정 찾기/재발급)
- `GET /api/members/check-nickname` — permitAll (닉네임 중복 확인)
- 이미 로그인된 멤버는 AuthFlowScreen 접근 불필요 (앱 레벨에서 라우팅 차단)
- 관리자 계정 전용 가입 경로 없음 — 관리자는 BE에서 역할 부여
