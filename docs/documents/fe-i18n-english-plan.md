# FE 다국어(한국어/영어) 전환 계획

작성일: 2026-07-01

## 1. 목적

`ref_code/FE`는 Next.js App Router 기반의 책모 웹 프론트엔드이다. 현재 한국어 중심으로 구현되어 있으며, 영어 지원을 추가하려면 단순 문자열 치환이 아니라 라우팅, 메타데이터, SEO, 공통 UI, API enum 라벨, 날짜/시간 포맷까지 함께 정리해야 한다.

이 문서는 `ref_code/FE`를 읽기 전용으로 조사한 결과를 바탕으로, 영어 지원을 안정적으로 도입하기 위한 실행 계획을 정리한다. 실제 수정은 FE 별도 레포에서 진행해야 하며, RN 레포의 `ref_code`는 RN 커밋에 포함하지 않는다.

## 2. 근거 문서

- Next.js 공식 i18n 가이드: locale 라우팅, `[lang]` 세그먼트, dictionary 기반 localization, `generateStaticParams`, `<html lang>` 처리를 설명한다.
  https://nextjs.org/docs/app/guides/internationalization
- next-intl App Router 가이드: `messages`, `src/i18n/request.ts`, `next.config.ts` plugin 구성을 제안한다.
  https://next-intl.dev/docs/getting-started/app-router
- next-intl locale routing 가이드: `src/i18n/routing.ts`, `src/proxy.ts`, `src/i18n/navigation.ts`, `src/app/[locale]/layout.tsx` 구성을 제안한다. Next.js 16 기준으로 `middleware.ts`가 아니라 `proxy.ts`를 사용한다고 명시한다.
  https://next-intl.dev/docs/routing/setup
- next-intl routing configuration: `localePrefix`, `pathnames`, `domains`, `alternateLinks(hreflang)` 선택지를 제공한다.
  https://next-intl.dev/docs/routing/configuration
- Google Search Central localized versions: 다국어 페이지는 `hreflang` 또는 sitemap 등으로 언어별 대체 URL을 명시하는 것이 권장된다.
  https://developers.google.com/search/docs/specialty/international/localized-versions

## 3. 현재 FE 구조 진단

### 3.1 기술 스택

- `ref_code/FE/package.json`
  - Next.js `^16.1.6`
  - React `19.2.0`
  - TypeScript
  - Tailwind CSS 4
  - TanStack Query
  - Zustand
  - Sentry
- 현재 i18n 전용 라이브러리 의존성은 없다.
- `src/proxy.ts`가 이미 인증/접근 제어 용도로 존재한다. next-intl 도입 시 이 파일을 교체하는 것이 아니라 기존 인증 로직과 locale middleware를 합성해야 한다.
- `next.config.ts`는 `withSentryConfig(nextConfig, ...)`로 감싸져 있다. next-intl plugin을 추가할 때 Sentry wrapper와 composition 순서를 명확히 해야 한다.

### 3.2 App Router 구조

조사 기준 파일 수:

- `src/app`의 `page.tsx`: 70개
- `src/app`의 `layout.tsx`: 17개
- `src/components`의 TS/TSX 파일: 188개
- 한국어가 포함된 TS/TSX 파일: 341개
- 한국어가 포함된 라인: 약 3,061라인

라우트 그룹별 `page.tsx` 분포:

- `(main)`: 45개
- `(admin)`: 13개
- `(public)`: 5개
- `support`: 5개
- `landing`: 1개
- root `page.tsx`: 1개

주요 라우트 영역:

- 고객-facing 메인: `home`, `groups`, `books`, `stories`, `news`, `profile`, `search`, `setting`
- 공개 auth: `signup`, `find-account`, `find-password`
- 랜딩: `landing`
- 공개 문서: `support`, `support/v1/*`
- 관리자: `admin/*`

### 3.3 현재 i18n 관점의 핵심 문제

- `src/app/layout.tsx`
  - `<html lang="ko">`로 고정되어 있다.
  - `metadata.title`, `description`, `openGraph.locale`가 한국어/한국 locale로 고정되어 있다.
  - `BottomNav`, `GlobalLoginModal`, `Toaster`, `AuthProvider`, `HeaderTitleProvider`가 전역으로 묶여 있어 locale provider와의 결합 순서를 다시 설계해야 한다.
- `src/proxy.ts`
  - 현재 path matching과 auth redirect가 locale 없는 경로 기준이다.
  - locale prefix가 들어오면 `/en/groups`, `/ko/groups` 같은 경로를 normalize해서 auth rule을 적용해야 한다.
- `src/app/sitemap.ts`
  - 현재 static/dynamic sitemap이 단일 한국어 URL만 생성한다.
  - 영어 URL과 alternate URL 생성이 필요하다.
- `src/app/robots.ts`
  - disallow 경로가 locale 없는 path 기준이다.
  - locale prefix 전략에 따라 `/en/setting`, `/en/signup` 등도 차단 대상인지 검토해야 한다.
- navigation 사용량
  - `next/navigation` 사용 파일: 94개
  - `next/link` 사용 파일: 29개
  - `router.push/replace("/...")` 직접 호출: 약 52곳
  - `href="/..."` 직접 사용: 약 13곳
  - 따라서 폴더만 `[locale]` 아래로 옮기면 링크 누락이 생긴다. locale-aware navigation wrapper가 먼저 필요하다.
- metadata 사용량
  - `metadata` 또는 `generateMetadata` 사용 파일: 48개
  - title/description fallback에 한국어가 많이 들어 있다.
- 사용자 피드백 문구
  - `toast`, `alert`, `window.confirm`, `setToastMessage`, `showToast` 사용 파일: 48개
  - validation, success, error 문구가 컴포넌트/훅/서비스에 흩어져 있다.

## 4. 문자열 분포와 우선순위

한국어 문자열이 많은 파일 상위 예시:

- `src/components/base-ui/Landing/LandingChatSection.tsx`
- `src/app/(main)/groups/[id]/admin/edit/page.tsx`
- `src/app/(main)/groups/[id]/admin/bookcase/[meetingId]/edit/page.tsx`
- `src/app/(main)/groups/create/CreateGroupPageClient.tsx`
- `src/app/(main)/groups/[id]/admin/bookcase/new/page.tsx`
- `src/constants/setting/terms.ts`
- `src/app/(main)/groups/[id]/admin/members/page.tsx`
- `src/components/base-ui/Admin/stories/bookstory_detail.tsx`
- `src/app/(main)/groups/[id]/admin/notice/new/page.tsx`
- `src/types/groups/groups.ts`

영역별 분포:

- `components/base-ui`: 149개 파일에 한국어 포함
- `app/(main)`: 80개 파일에 한국어 포함
- `app/(admin)`: 13개 파일에 한국어 포함
- `app/(public)`: 9개 파일에 한국어 포함
- `types/groups`: 8개 파일에 한국어 포함
- `components/layout`: 7개 파일에 한국어 포함
- `constants/setting`: 5개 파일에 한국어 포함
- `app/support`: 5개 파일에 한국어 포함

해석:

- 1차 전환 대상은 공통 shell, auth, landing, home, support, settings이다.
- 그룹 생성/관리, 공지, 책장, 관리자 화면은 문자열 밀도가 높고 form validation이 많아 2차 이후에 묶어서 처리해야 한다.
- `types/groups`, `constants/categories`, `utils/groupMapper`처럼 API enum과 한국어 label이 섞인 파일은 먼저 구조를 분리해야 한다.

## 5. 추천 아키텍처

### 5.1 라이브러리

`next-intl`을 권장한다.

이유:

- Next.js App Router와 잘 맞는다.
- Server Component, Client Component, metadata, route navigation, proxy를 한 흐름으로 다룰 수 있다.
- Next.js 16의 `proxy.ts` 흐름과 공식 문서가 맞물린다.
- ICU message, plural, rich text, 날짜/숫자 formatting까지 확장 가능하다.

설치 대상은 RN 레포가 아니라 FE 별도 레포이다.

```bash
pnpm add next-intl
```

### 5.2 Locale 정책

지원 locale:

- `ko`: 기본 locale
- `en`: 영어

권장 routing 전략:

```ts
localePrefix: "as-needed"
```

권장 이유:

- 현재 서비스 URL이 `/home`, `/groups`, `/stories`처럼 한국어 기본 URL로 이미 구성되어 있다.
- 기본 locale인 한국어는 기존 URL을 유지하고, 영어만 `/en/home`, `/en/groups`, `/en/stories`로 추가하는 방식이 기존 링크/SEO/공유 URL의 충격을 줄인다.
- `/ko/home`과 `/en/home`을 완전히 대칭으로 두고 싶다면 `localePrefix: "always"`가 더 명확하지만, 기존 URL 전체에 301 redirect 설계가 필요하다.

최종 PM/SEO 결정 옵션:

- 보존 우선: `/home` = 한국어, `/en/home` = 영어
- 대칭 우선: `/ko/home`, `/en/home`, 기존 `/home`은 `/ko/home`으로 301

현재 FE 상태에서는 보존 우선(`as-needed`)을 기본안으로 둔다.

### 5.3 신규 파일 구조

권장 추가 파일:

```text
messages/
  ko.json
  en.json
src/i18n/
  routing.ts
  request.ts
  navigation.ts
  locale.ts
  labels.ts
  formats.ts
```

역할:

- `messages/*.json`: 화면 문구
- `src/i18n/routing.ts`: `locales`, `defaultLocale`, `localePrefix`, 선택적 `pathnames`
- `src/i18n/request.ts`: request locale 기준 message 로딩
- `src/i18n/navigation.ts`: `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname` wrapper
- `src/i18n/locale.ts`: locale type, locale stripping, locale path helper
- `src/i18n/labels.ts`: API enum -> locale label mapping helper
- `src/i18n/formats.ts`: 날짜/시간/숫자 formatting helper

### 5.4 Message namespace

초기 namespace 제안:

```text
Common
Navigation
Metadata
Auth
Signup
Landing
Home
Search
Groups
Books
Stories
News
Profile
Settings
Support
Admin
Errors
Enums
Validation
Toast
UnsavedChanges
```

원칙:

- 컴포넌트명 그대로 namespace를 늘리지 말고, 제품 도메인 기준으로 묶는다.
- 반복되는 버튼/상태/empty/loading/error 문구는 `Common`, `Validation`, `Toast`, `Errors`로 빼서 중복을 줄인다.
- 약관/개인정보처리방침처럼 긴 문서는 JSON message보다 별도 content module 또는 MDX 구조가 더 낫다.
- 사용자 생성 콘텐츠, 책 제목, 모임명, 닉네임, 뉴스 본문처럼 API 데이터 자체는 번역하지 않는다.

## 6. 구현 단계

### Phase 0. 준비

목표:

- FE 별도 레포에서 작업 브랜치를 만든다.
- `next-intl`을 설치한다.
- 현재 build/lint baseline을 확인한다.

작업:

- `pnpm lint`
- `pnpm build`
- 현재 실패가 있으면 i18n 작업 전 baseline 문서화
- `rg "[가-힣]" src` 기준 허용 목록을 나중에 비교할 수 있도록 저장

### Phase 1. i18n 기반 레이어 추가

대상 파일:

- `next.config.ts`
- `src/i18n/routing.ts`
- `src/i18n/request.ts`
- `src/i18n/navigation.ts`
- `src/proxy.ts`
- `messages/ko.json`
- `messages/en.json`

작업:

1. `next.config.ts`에 `createNextIntlPlugin`을 추가한다.
2. Sentry와 next-intl wrapper를 합성한다.
   - 권장 형태: `withSentryConfig(withNextIntl(nextConfig), sentryOptions)`
3. `routing.ts`에 `ko`, `en`, `defaultLocale: "ko"`, `localePrefix: "as-needed"`를 정의한다.
4. `navigation.ts`에서 next-intl의 `createNavigation(routing)` wrapper를 export한다.
5. `request.ts`에서 request locale을 검증하고 locale별 message를 import한다.
6. `src/proxy.ts`는 next-intl proxy와 기존 auth proxy를 합친다.
7. auth rule은 locale을 제거한 normalized pathname 기준으로 판단한다.

주의:

- 현재 `protectedRoutes`는 비어 있지만 향후 다시 활성화될 수 있으므로 locale-aware helper를 만들어 둔다.
- `authRoutes = ["/login", "/signup"]`는 현재 실제 login page가 modal 중심이라 path 정책을 재검토해야 한다.
- OAuth redirect/callback URL이 locale prefix를 보존해야 하는지 확인해야 한다.

### Phase 2. App Router locale segment 재배치

대상:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/landing/*`
- `src/app/(main)/*`
- `src/app/(public)/*`
- `src/app/support/*`
- 필요 시 `src/app/(admin)/*`

권장 구조:

```text
src/app/
  [locale]/
    layout.tsx
    page.tsx
    landing/
    (main)/
    (public)/
    support/
    admin/        # 관리자도 locale 아래에 둘지 최종 결정 필요
  global-error.tsx
  sitemap.ts
  robots.ts
```

작업:

1. locale layout에서 `params.locale`을 검증한다.
2. `<html lang={locale}>`을 동적으로 설정한다.
3. `NextIntlClientProvider`를 `Providers`, `AuthProvider`, `HeaderTitleProvider`와 올바른 순서로 배치한다.
4. `generateStaticParams`를 추가한다.
5. 정적 렌더링이 필요한 layout/page에는 `setRequestLocale(locale)`을 적용한다.
6. root `/` 진입 시 기존 localStorage 기반 랜딩 분기 로직을 locale-aware path로 바꾼다.

관리자 라우트 결정:

- 1안: 관리자도 locale 아래에 둔다.
  - 장점: root layout/i18n provider가 단순하다.
  - 단점: `/en/admin`도 생길 수 있다. admin 번역을 안 할 경우 영어 path에서 한국어 admin이 보일 수 있다.
- 2안: 관리자만 별도 root layout으로 분리한다.
  - 장점: 고객-facing i18n 범위가 명확하다.
  - 단점: Next App Router의 multiple root layout 구조가 필요하고 전역 provider 중복이 생긴다.
- 권장: 초기에는 관리자도 구조상 locale provider 아래에 포함하되, `Admin` namespace는 한국어 fallback으로 두고 영어 공개 범위에서 제외한다. 운영 정책상 admin URL을 절대 노출하지 않을 계획이면 2안으로 분리한다.

### Phase 3. Locale-aware navigation 전환

대상:

- `src/components/layout/Header.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/AdminHeader.tsx`
- `src/components/layout/SearchModal.tsx`
- `src/components/layout/NotificationDropdown.tsx`
- `src/components/auth/AuthProvider.tsx`
- `src/hooks/useAuthGuard.ts`
- `src/hooks/useClubAccessGuard.ts`
- `src/hooks/useUnsavedChangesGuard.tsx`
- `router.push/replace` 직접 호출이 있는 page/client component 전체

작업:

1. `next/link` import를 `@/i18n/navigation`의 `Link`로 바꾼다.
2. `next/navigation`의 `useRouter`, `usePathname`, `redirect` 사용을 가능한 범위에서 `@/i18n/navigation` wrapper로 바꾼다.
3. `/groups/${id}` 같은 template route는 locale-aware router가 처리하도록 wrapper를 사용한다.
4. query-only update인 `router.replace("?tab=...")`는 기존 의도대로 동작하는지 별도 확인한다.
5. `getPageTitle(pathname)`처럼 pathname을 직접 비교하는 로직은 locale이 제거된 normalized path 기준으로 판단한다.

주의 파일:

- `Header.tsx`: NAV label, active state, page title, logo href
- `BottomNav.tsx`: active state가 `/` 기준이라 locale 적용 시 오작동 가능
- `AuthProvider.tsx`: profile completion redirect가 locale을 잃을 가능성
- `useUnsavedChangesGuard.tsx`: anchor click interception에서 locale path 생성과 history marker 처리 확인 필요
- `NotificationDropdown.tsx`, `utils/notification.ts`: 서버 notification redirect URL이 locale 없는 path일 수 있음

### Phase 4. 공통 UI와 핵심 flow 번역

1차 번역 대상:

- `Header`
- `BottomNav`
- `SearchModal`
- `NotificationDropdown`
- `GlobalLoginModal`
- `LoginModal`
- `LoginForm`
- `SocialLogin`
- `ConfirmModal`
- `UnsavedChangesConfirmModal`
- `AuthProvider` profile completion modal
- `Join/Signup` flow
- `FindAccount`, `FindPassword`
- `Support`

작업 원칙:

- 버튼, placeholder, aria-label, alt text도 번역한다.
- form validation 문구는 `Validation` namespace로 이동한다.
- toast/success/error는 `Toast` 또는 feature namespace에 둔다.
- 공통 modal 문구는 feature에 흩어두지 말고 재사용 가능한 key로 둔다.

예시:

```tsx
const t = useTranslations("Auth.Login");

<input placeholder={t("identifierPlaceholder")} />
<button>{isLoading ? t("submitting") : t("submit")}</button>
```

### Phase 5. API enum과 UI label 분리

우선 대상:

- `src/constants/categories.ts`
- `src/types/groups/groups.ts`
- `src/types/groups/clubCreate.ts`
- `src/utils/groupMapper.ts`
- `src/constants/report.ts`
- `src/types/report.ts`
- `src/constants/setting/setting.ts`
- `src/constants/auth.ts`

현재 문제:

- `Category`, `BookCategory`, `ParticipantLabel` 같은 타입이 한국어 label을 타입 자체로 사용한다.
- `BOOK_CATEGORY_TO_CODE`, `PARTICIPANT_LABEL_TO_TYPE`는 한국어 label이 API 변환 key로 들어간다.
- 영어 도입 후 `Travel` 같은 label이 생기면 기존 map이 깨질 수 있다.

권장 구조:

```ts
export const BOOK_CATEGORY_CODES = [
  "TRAVEL",
  "FOREIGN_LANGUAGE",
  "CHILDREN_BOOKS",
] as const;

export type BookCategoryCode = (typeof BOOK_CATEGORY_CODES)[number];
```

label 변환은 화면에서만:

```tsx
const t = useTranslations("Enums.BookCategory");
const label = t(code);
```

적용 원칙:

- API request/response type은 enum code만 사용한다.
- UI select/chip/filter는 code 배열을 돌면서 `t(code)`로 label을 렌더링한다.
- `"전체"`도 type label이 아니라 `"ALL"` 같은 UI filter code로 분리한다.
- `ReportReason`, participant type, account status, member role, notice type도 같은 방식으로 정리한다.

### Phase 6. 날짜/시간/숫자 포맷 현지화

대상:

- `src/utils/time.ts`
- `src/utils/date.ts`
- 각 page/client component 내부의 `formatDate`, `formatYYYYMMDD`, `formatMeetingDateLoose`
- `.toLocaleDateString("ko-KR")` 직접 호출

현재 예:

- `방금 전`
- `${diffMins}분 전`
- `${diffHours}시간 전`
- `${diffDays}일 전`
- `2026년 6월 5일`
- `YYYY.MM.DD.`

권장:

- next-intl의 date/time/relative time formatting 또는 `Intl.RelativeTimeFormat` 기반 helper를 만든다.
- display helper는 locale을 인자로 받거나 hook으로 감싼다.
- input parsing/submit format은 locale과 분리한다. API로 보내는 값은 ISO 또는 기존 BE 스펙을 유지한다.

### Phase 7. 페이지군별 본문 번역

우선순위:

1. Landing
   - 첫 방문자가 영어 지원을 가장 먼저 체감하는 영역
   - `LandingChatSection`, `LandingManageSection` 등 문자열 밀도 높음
2. Home
   - 메인 사용자 flow
3. Auth/Public
   - signup, find-account, find-password
4. Support/Legal
   - 고객지원은 빠르게 번역 가능
   - 약관/개인정보처리방침은 법률 검토 필요
5. Groups browse/detail
   - 가입, 멤버 전용 접근, 연락처/링크, empty/error 문구
6. Stories/Books/News/Profile
   - 사용자 생성 콘텐츠는 번역하지 않고 chrome/action/empty/error만 번역
7. Group admin/bookcase/notice
   - form validation과 dirty guard가 많아 별도 묶음으로 처리
8. Admin
   - 외부 사용자 대상이 아니라면 최후순위

### Phase 8. Metadata, sitemap, SEO

대상:

- `src/app/[locale]/layout.tsx`
- 각 page의 `metadata` / `generateMetadata`
- `src/app/sitemap.ts`
- `src/app/robots.ts`

작업:

1. root metadata의 title template, description, Open Graph를 locale별로 생성한다.
2. `openGraph.locale`을 `ko_KR`, `en_US` 등으로 분기한다.
3. `generateMetadata({params})`에서 locale을 받고 `getTranslations({locale, namespace: "Metadata"})`를 사용한다.
4. fallback title `"모임"`, `"책장"`, `"공지사항"`도 locale message로 이동한다.
5. `alternates.languages` 또는 sitemap alternates를 일관된 helper로 생성한다.
6. `sitemap.ts`는 static routes와 dynamic routes 모두 locale URL을 생성한다.
7. `robots.ts`는 locale prefix를 포함한 private route 차단 여부를 검토한다.

주의:

- Google 문서 기준으로 localized page는 자기 자신과 다른 언어 버전을 모두 가리키는 alternate 관계가 필요하다.
- `hreflang`, sitemap alternate, HTTP header를 모두 중복 관리할 필요는 없다. FE에서는 Next Metadata와 sitemap helper를 같은 source of truth로 묶어 drift를 막는 것이 중요하다.

### Phase 9. Backend/API message 처리

현재:

- `apiClient`, `errorMapper`, services, hooks에 한국어 fallback error가 많다.
- BE가 내려주는 `response.message`가 한국어일 수 있다.

초기 정책:

- BE message는 fallback으로만 사용한다.
- FE가 code를 알고 있는 경우 `Errors.{code}`로 locale message를 우선 표시한다.
- code가 없으면 서버 message를 표시하되, 영어 locale에서는 generic fallback을 고려한다.

추가 협의:

- BE가 `Accept-Language`를 지원할 계획이 있다면 `apiClient`에서 locale을 header에 실어 보낼 수 있다.
- 단, 1차 영어 지원은 FE message catalog 중심으로 진행하는 것이 범위 통제에 좋다.

## 7. 예상 변경 파일 우선순위

### 반드시 먼저 바꿀 파일

- `ref_code/FE/package.json`
- `ref_code/FE/pnpm-lock.yaml`
- `ref_code/FE/next.config.ts`
- `ref_code/FE/src/proxy.ts`
- `ref_code/FE/src/app/layout.tsx`
- `ref_code/FE/src/app/page.tsx`
- `ref_code/FE/src/app/sitemap.ts`
- `ref_code/FE/src/app/robots.ts`

### i18n 신규 파일

- `ref_code/FE/messages/ko.json`
- `ref_code/FE/messages/en.json`
- `ref_code/FE/src/i18n/routing.ts`
- `ref_code/FE/src/i18n/request.ts`
- `ref_code/FE/src/i18n/navigation.ts`
- `ref_code/FE/src/i18n/locale.ts`
- `ref_code/FE/src/i18n/labels.ts`
- `ref_code/FE/src/i18n/formats.ts`

### 공통 UI

- `ref_code/FE/src/components/layout/Header.tsx`
- `ref_code/FE/src/components/layout/BottomNav.tsx`
- `ref_code/FE/src/components/layout/SearchModal.tsx`
- `ref_code/FE/src/components/layout/NotificationDropdown.tsx`
- `ref_code/FE/src/components/common/ConfirmModal.tsx`
- `ref_code/FE/src/components/common/UnsavedChangesConfirmModal.tsx`
- `ref_code/FE/src/hooks/useUnsavedChangesGuard.tsx`

### auth/signup

- `ref_code/FE/src/components/auth/AuthProvider.tsx`
- `ref_code/FE/src/components/base-ui/Login/*`
- `ref_code/FE/src/components/base-ui/Join/*`
- `ref_code/FE/src/contexts/SignupContext.tsx`
- `ref_code/FE/src/constants/auth.ts`
- `ref_code/FE/src/constants/password.ts`

### labels/enum

- `ref_code/FE/src/constants/categories.ts`
- `ref_code/FE/src/types/groups/groups.ts`
- `ref_code/FE/src/types/groups/clubCreate.ts`
- `ref_code/FE/src/utils/groupMapper.ts`
- `ref_code/FE/src/constants/report.ts`
- `ref_code/FE/src/types/report.ts`
- `ref_code/FE/src/constants/setting/setting.ts`

## 8. 검증 기준

### 자동 검증

- `pnpm lint`
- `pnpm build`
- TypeScript build에서 message key 누락이 잡히도록 next-intl TypeScript augmentation 검토
- `rg "[가-힣]" src` 결과를 점검하고 허용 목록을 제외한 UI 하드코딩 제거

### 수동 QA

필수 경로:

- `/`
- `/landing`
- `/home`
- `/groups`
- `/stories`
- `/news`
- `/search`
- `/support`
- `/signup`
- `/find-account`
- `/find-password`
- `/en`
- `/en/landing`
- `/en/home`
- `/en/groups`
- `/en/stories`
- `/en/news`
- `/en/search`
- `/en/support`
- `/en/signup`

필수 시나리오:

- locale switch 후 같은 path/query 유지
- 로그인 모달 열기/닫기
- 로그인 실패 validation
- 회원가입 step 이동
- 검색 modal과 검색 결과 이동
- 비로그인 그룹 접근 시 로그인 modal
- profile completion gate
- unsaved changes modal
- notification redirect
- sitemap URL 생성
- metadata title/description/og locale 확인

### SEO 검증

- 한국어 기본 URL과 영어 URL이 모두 sitemap에 포함된다.
- 영어 URL은 canonical/alternate가 올바르다.
- locale별 `<html lang>`이 맞다.
- `og:locale`과 title/description이 locale별로 바뀐다.
- 기존 한국어 URL이 404가 되지 않는다.

## 9. 주요 리스크와 대응

| 리스크 | 원인 | 대응 |
| --- | --- | --- |
| 링크 locale 누락 | `router.push("/...")`, `href="/..."` 직접 사용 | `@/i18n/navigation` wrapper로 단계적 교체 |
| auth redirect가 locale을 잃음 | `router.replace("/")`, proxy redirect 고정 | locale-aware path helper 사용 |
| 기본 URL SEO 손상 | `/home`을 갑자기 `/ko/home`으로 이동 | 기본안은 `as-needed`, 대칭 URL이 필요하면 301 계획 포함 |
| API enum label 깨짐 | 한국어 label을 type key로 사용 | code-first enum으로 리팩터링 |
| legal 문서 품질 이슈 | 약관/개인정보처리방침 직역 | 영어 법률 문구는 별도 검토 후 공개 |
| backend message 한국어 노출 | BE `message` fallback 사용 | FE error code mapping 우선, unknown은 generic fallback |
| admin scope 증가 | admin 문자열도 13 page 존재 | admin은 1차 범위에서 제외하거나 ko fallback 유지 |
| static rendering 저하 | Server Component에서 next-intl 사용 | `generateStaticParams`, `setRequestLocale` 적용 |
| sitemap drift | metadata와 sitemap alternate를 따로 작성 | locale path helper를 공통 사용 |

## 10. 권장 진행 순서 요약

1. FE 레포에서 `next-intl` 설치 및 i18n scaffold 추가
2. `proxy.ts`에 locale routing과 기존 auth guard 합성
3. App Router를 `[locale]` 세그먼트 기준으로 재배치
4. locale-aware navigation wrapper 도입
5. Header/BottomNav/Login/Search/Modal 같은 공통 UI 먼저 번역
6. enum/label 구조를 code-first로 정리
7. 날짜/시간/상대시간 formatting locale화
8. Landing/Home/Auth/Support/Settings부터 페이지군별 번역
9. Groups/Stories/Books/News/Profile 번역
10. Admin과 긴 legal 문서는 별도 phase로 처리
11. metadata/sitemap/hreflang 검증
12. lint/build/manual QA 후 배포

## 11. 1차 완료 정의

1차 영어 지원을 완료했다고 판단하려면 아래 조건을 만족해야 한다.

- `/en/landing`, `/en/home`, `/en/groups`, `/en/stories`, `/en/news`, `/en/search`, `/en/support`, `/en/signup`이 정상 렌더링된다.
- 기존 `/home`, `/groups`, `/stories`, `/news`는 한국어로 유지된다.
- Header, BottomNav, Login, Signup, Search, Support, Home의 핵심 문구가 영어로 표시된다.
- route 이동 후 locale이 유지된다.
- API enum label이 한국어 type에 의존하지 않는다.
- `<html lang>`, metadata, sitemap alternate가 locale별로 맞다.
- `pnpm lint`와 `pnpm build`가 통과한다.
- 남은 한국어 하드코딩 목록이 문서화되어 있다.
