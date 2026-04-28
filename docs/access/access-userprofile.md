# 사용자 프로필 화면 접근 권한 (`UserProfileScreen`)

## 역할 범위

| 역할 | 설명 |
|------|------|
| 사용자 | 회원가입 하지 않은 사람 |
| 멤버 | 회원가입을 한 사람 |
| 관리자 | 책모의 관리자 |

---

## 기능별 권한

| 기능 | 사용자 | 멤버 | 관리자 |
|------|:------:|:----:|:------:|
| 화면 진입 | ✅ | ✅ | ✅ |
| 프로필 정보 조회 (닉네임/소개/카테고리) | ✅ | ✅ | ✅ |
| 책이야기 목록 조회 | ✅ | ✅ | ✅ |
| 서재 (좋아요한 책) 조회 | ✅ | ✅ | ✅ |
| 가입한 모임 목록 조회 | ✅ | ✅ | ✅ |
| 팔로워/팔로잉 목록 조회 | ❌ 로그인 유도 | ✅ | ✅ |
| 구독 토글 (팔로우/언팔로우) | ❌ 로그인 유도 | ✅ | ✅ |
| 팔로워/팔로잉 목록 내 구독 토글 | ❌ | ✅ | ✅ |
| 멤버 신고 | ❌ 로그인 유도 | ✅ | ✅ |

## 비고

- `GET /api/members/{nickname}`, `GET /api/members/{nickname}/book-stories`, `GET /api/members/{nickname}/liked-books`, `GET /api/members/{nickname}/clubs` — permitAll, 비로그인도 조회 가능
- `GET /api/members/{nickname}/followers`, `GET /api/members/{nickname}/followings` — authenticated, `requireAuth()` 게이트 적용
- 구독/신고 액션은 `requireAuth()` 래퍼로 보호
- 본인 프로필 진입 시 별도 분기 없음 (마이페이지와 동일한 컴포넌트 공유 안 함)
- 관리자 전용 기능 없음
