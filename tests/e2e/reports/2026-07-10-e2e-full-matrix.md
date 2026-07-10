# 2026-07-10 14:11:45 KST E2E 전체 기능 결과표 - iOS Local E2E Full

- Platform: ios
- Source catalog: `tests/e2e/reports/e2e-test-catalog.md`
- Result counts: PASS 7, FAIL 0, NOT RUN 32, BLOCKED 53
- Rule: 실행한 기능만 PASS/FAIL로 표시하고, 실행하지 않은 기능은 NOT RUN 또는 BLOCKED로 둔다.

| 날짜 | 시간(KST) | 기능영역 | 하위영역 | 테스트/기능 | 결과 | 실행가능 상태 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-10 | 14:11:45 | Smoke / App Shell | Launch | App cold launch reaches Home | PASS | Ready | Covered by `ios-guest-smoke.yaml`. |
| 2026-07-10 | 14:11:45 | Smoke / App Shell | Tabs | Home, Meeting, Story, News, My tab entry | PASS | Ready | My tab checks login gate as guest. |
| 2026-07-10 | 14:11:45 | Smoke / App Shell | Header | Search icon opens book search | NOT RUN | Ready | More reliable with `testID`. |
| 2026-07-10 | 14:11:45 | Smoke / App Shell | Header | Notification icon opens login gate as guest | NOT RUN | Ready | Auth gate behavior. |
| 2026-07-10 | 14:11:45 | Smoke / App Shell | Navigation | Android back / iOS swipe basics | BLOCKED | Needs selector | Best after stable selectors. |
| 2026-07-10 | 14:11:45 | Smoke / App Shell | Loading | Boot loader disappears and content appears | NOT RUN | Ready | Visual assertion possible. |
| 2026-07-10 | 14:11:45 | Auth | Login | Email/nickname login success | PASS | Ready | Covered by `ios-login-smoke.yaml`; pass test account via runtime `EMAIL`/`PASSWORD`. |
| 2026-07-10 | 14:11:45 | Auth | Login | Wrong password error | NOT RUN | Needs account | Non-mutating. |
| 2026-07-10 | 14:11:45 | Auth | Session | App restart keeps login | PASS | Ready | Covered by `ios-login-persistence.yaml` after a successful login flow. |
| 2026-07-10 | 14:11:45 | Auth | Refresh | Long idle then authenticated API still works | NOT RUN | Needs account | 1-hour wait can be scripted but slow. |
| 2026-07-10 | 14:11:45 | Auth | Logout | Logout returns to Home guest state | NOT RUN | Needs account | Mutates local session only. |
| 2026-07-10 | 14:11:45 | Auth | Signup | Email verification and profile completion | BLOCKED | Needs permission | Creates server account. |
| 2026-07-10 | 14:11:45 | Auth | Find email/password | Recovery flows | NOT RUN | Needs account | Depends on backend mail/verification setup. |
| 2026-07-10 | 14:11:45 | Auth | Social login | Kakao/Apple auth entry | NOT RUN | Needs account | External auth often semi-manual. |
| 2026-07-10 | 14:11:45 | Home | Promotions | Promotion carousel renders and swipes | NOT RUN | Ready | Network data dependent. |
| 2026-07-10 | 14:11:45 | Home | Feed | Book story cards render | NOT RUN | Ready | Current smoke asserts feed section. |
| 2026-07-10 | 14:11:45 | Home | Feed | Infinite scroll loads more | NOT RUN | Ready | Can detect repeated errors/visible footer. |
| 2026-07-10 | 14:11:45 | Home | Like | Guest like opens login | NOT RUN | Ready | Non-mutating. |
| 2026-07-10 | 14:11:45 | Home | Like | Logged-in like toggles count/state | BLOCKED | Needs account / Needs permission | Mutates like state. |
| 2026-07-10 | 14:11:45 | Home | Subscribe | Guest subscribe opens login | NOT RUN | Ready | Non-mutating. |
| 2026-07-10 | 14:11:45 | Home | Subscribe | Logged-in subscribe toggles | BLOCKED | Needs account / Needs permission | Mutates follow state. |
| 2026-07-10 | 14:11:45 | Home | Profile | Author click navigates to profile | BLOCKED | Needs selector | Needs stable card target. |
| 2026-07-10 | 14:11:45 | Meeting | Discover | Meeting tab renders recommendations/search | PASS | Ready | Covered partly by smoke. |
| 2026-07-10 | 14:11:45 | Meeting | Search | Search by club name/region | NOT RUN | Ready | Needs predictable keyword. |
| 2026-07-10 | 14:11:45 | Meeting | Filters | Meeting output/input filters apply | NOT RUN | Ready | Needs stable visible results. |
| 2026-07-10 | 14:11:45 | Meeting | Join | Guest join opens login | NOT RUN | Ready | Non-mutating. |
| 2026-07-10 | 14:11:45 | Meeting | Join | Private club join request submit/close | BLOCKED | Needs account / Needs permission | Creates request. |
| 2026-07-10 | 14:11:45 | Meeting | Join | Rejected request re-enables join button | BLOCKED | Needs account / Needs data | Requires rejected state. |
| 2026-07-10 | 14:11:45 | Meeting | Detail | Club home renders info, notice, members | BLOCKED | Needs data | Requires known club. |
| 2026-07-10 | 14:11:45 | Meeting | Detail | Switch club and cache/refresh state | BLOCKED | Needs data | Useful performance regression. |
| 2026-07-10 | 14:11:45 | Meeting | Management | Management bottom sheet starts from bottom | BLOCKED | Needs account / Needs data | Requires owner/staff account. |
| 2026-07-10 | 14:11:45 | Meeting | Management | Join request list pull-to-refresh | BLOCKED | Needs account / Needs data | Staff role. |
| 2026-07-10 | 14:11:45 | Meeting | Management | Member list pull-to-refresh | BLOCKED | Needs account / Needs data | Staff role. |
| 2026-07-10 | 14:11:45 | Meeting | Edit club | Name duplicate check | BLOCKED | Needs account / Needs permission | Staff role, may mutate club name. |
| 2026-07-10 | 14:11:45 | Meeting | Edit club | Inquiry links add/edit/delete | BLOCKED | Needs account / Needs permission | Mutates club links. |
| 2026-07-10 | 14:11:45 | Meeting | Leave/delete | Leave club / delete club | BLOCKED | Needs permission | High-risk, only with disposable data. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Notice list | List and pinned notice render | BLOCKED | Needs data | Known club. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Detail | Notice detail/comments render | BLOCKED | Needs data | Known notice. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Create | Create normal notice | BLOCKED | Needs account / Needs permission | Staff role. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Edit/delete | Edit/delete notice | BLOCKED | Needs permission | Staff role. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Comment | Add/edit/delete notice comment | BLOCKED | Needs account / Needs permission | Mutates comment. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Poll | Android real-name option toggles | BLOCKED | Needs Android / Needs account | Specific QA target. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Poll | Multiple-choice option toggles | BLOCKED | Needs Android / Needs account | Specific QA target. |
| 2026-07-10 | 14:11:45 | Notice / Poll | Book attachment | Attach bookshelf to notice | BLOCKED | Needs account / Needs data | Staff role + bookshelf. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Bookshelf | Bookshelf tab/list renders | BLOCKED | Needs data | Known club. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Detail | Bookshelf detail opens | BLOCKED | Needs data | Known bookshelf. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Topic/review | Topic/review tabs render and paginate | BLOCKED | Needs data | Known posts. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Compose | Add/edit/delete topic/review | BLOCKED | Needs account / Needs permission | Mutates posts. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Regular meeting | Meeting detail opens from bookshelf | BLOCKED | Needs data | Known meeting. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Team manage | Drag members between teams | BLOCKED | Needs account / Needs data / Needs selector | Complex gesture test. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Chat | Open chat room and load messages | BLOCKED | Needs account / Needs data | Known meeting/team. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Chat | Send/receive WebSocket message | BLOCKED | Needs account / Needs permission | Requires second account for full realtime. |
| 2026-07-10 | 14:11:45 | Bookshelf / Regular Meeting / Chat | Chat report | Report user/message from chat | BLOCKED | Needs account / Needs permission | Mutates report data. |
| 2026-07-10 | 14:11:45 | Story | Feed | All/following/club tabs render | NOT RUN | Ready / Needs account for following | Guest all feed ready. |
| 2026-07-10 | 14:11:45 | Story | Infinite scroll | No duplicate cursor request symptoms | NOT RUN | Ready | Can check no visible 429/retry loop. |
| 2026-07-10 | 14:11:45 | Story | Detail | Story detail opens | NOT RUN | Ready | Needs stable card selector. |
| 2026-07-10 | 14:11:45 | Story | Compose | Guest compose opens login | NOT RUN | Ready | Non-mutating. |
| 2026-07-10 | 14:11:45 | Story | Compose | Create/edit/delete story | BLOCKED | Needs account / Needs permission | Mutates story data. |
| 2026-07-10 | 14:11:45 | Story | Comments | Create/edit/delete comment/reply | BLOCKED | Needs account / Needs permission | Mutates comments. |
| 2026-07-10 | 14:11:45 | Story | Like | Like/unlike story | BLOCKED | Needs account / Needs permission | Mutates like state. |
| 2026-07-10 | 14:11:45 | Story | Report | Guest report closes modal and opens login | NOT RUN | Ready | Specific QA target. |
| 2026-07-10 | 14:11:45 | Story | Report | Logged-in report submit | BLOCKED | Needs account / Needs permission | Mutates reports. |
| 2026-07-10 | 14:11:45 | Story | Book search | Search/select book in compose | NOT RUN | Ready | Network dependent. |
| 2026-07-10 | 14:11:45 | News | List | News tab renders list/promotions | PASS | Ready | Covered by smoke tab entry. |
| 2026-07-10 | 14:11:45 | News | Detail | News detail opens | NOT RUN | Ready | Needs stable article target. |
| 2026-07-10 | 14:11:45 | News | Detail layout | Title -> created date -> content | NOT RUN | Ready | Specific QA target. |
| 2026-07-10 | 14:11:45 | News | Contact | Contact button opens link/modal | NOT RUN | Ready | Depends current UX. |
| 2026-07-10 | 14:11:45 | News | Original link | Open external source | BLOCKED | Needs permission | Opens browser/external URL. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Guest | My tab opens login | PASS | Ready | Covered by smoke. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Profile | Profile sections render after login | NOT RUN | Needs account | Non-mutating. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Edit profile | Nickname duplicate button works with keyboard | BLOCKED | Needs account / Needs permission | May mutate nickname/description. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Edit profile | Description supports newline | BLOCKED | Needs account / Needs permission | Specific QA target. |
| 2026-07-10 | 14:11:45 | My Page / Settings | My stories | Draft/delete story behavior | BLOCKED | Needs account / Needs permission | Mutates story. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Liked books | Liked books render/toggle | BLOCKED | Needs account / Needs permission | Mutates likes. |
| 2026-07-10 | 14:11:45 | My Page / Settings | My clubs | My club list and navigation | BLOCKED | Needs account / Needs data | Non-mutating. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Reports | Report management maps backend fields | BLOCKED | Needs account / Needs data | Specific QA target. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Blocks | Blocked members list/unblock | BLOCKED | Needs account / Needs permission | Mutates block state. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Notifications | List, settings, redirect | BLOCKED | Needs account / Needs data | Some mutating read status. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Language | Korean/English switch persists | NOT RUN | Ready / Needs account optional | Can run guest. |
| 2026-07-10 | 14:11:45 | My Page / Settings | Email/password | Change email/password | BLOCKED | Needs account / Needs permission | Sensitive; use disposable account. |
| 2026-07-10 | 14:11:45 | User Profile | Profile | Open another user's profile | NOT RUN | Ready | Needs known nickname/card. |
| 2026-07-10 | 14:11:45 | User Profile | Follow | Follow/unfollow user | BLOCKED | Needs account / Needs permission | Mutates follow state. |
| 2026-07-10 | 14:11:45 | User Profile | Stories | Other profile story opens and returns correctly | BLOCKED | Needs data | Specific QA target. |
| 2026-07-10 | 14:11:45 | User Profile | Books/clubs | Liked books and clubs render | BLOCKED | Needs data | Known member. |
| 2026-07-10 | 14:11:45 | User Profile | Report/block | Report/block user | BLOCKED | Needs account / Needs permission | Mutates report/block data. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | Images | Image placeholders/cache render without blank cards | NOT RUN | Ready | Visual assertions/screenshots. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | Performance | Tab switch and first content timing | NOT RUN | Ready | Needs custom timing wrapper/logging for exact numbers. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | Scroll | Lists/detail screens scroll consistently | NOT RUN | Ready | Needs per-screen flow expansion. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | Error handling | 401/403/404/429 toasts | BLOCKED | Needs data/mock | Hard with live backend only. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | Deep links | Notification route params and app scheme | BLOCKED | Needs data | Can use `simctl openurl`. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | i18n | Translation keys not visible | NOT RUN | Ready | Guest and logged-in variants. |
| 2026-07-10 | 14:11:45 | Cross-Cutting | Accessibility selectors | Stable `testID` coverage | BLOCKED | Needs selector | Recommended before broad automation. |
