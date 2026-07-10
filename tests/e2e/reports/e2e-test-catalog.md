# Checkmo E2E Test Catalog

This is the local E2E coverage catalog. Status values:

- `Ready`: can run with current app and current local setup.
- `Needs account`: requires test credentials.
- `Needs data`: requires known seed data or a prepared club/story/notification.
- `Needs permission`: mutates backend data, so confirm before running.
- `Needs selector`: should add `testID`/stable labels before reliable automation.

## Smoke / App Shell

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Launch | App cold launch reaches Home | Ready | Covered by `ios-guest-smoke.yaml`. |
| Tabs | Home, Meeting, Story, News, My tab entry | Ready | My tab checks login gate as guest. |
| Header | Search icon opens book search | Ready | More reliable with `testID`. |
| Header | Notification icon opens login gate as guest | Ready | Auth gate behavior. |
| Navigation | Android back / iOS swipe basics | Needs selector | Best after stable selectors. |
| Loading | Boot loader disappears and content appears | Ready | Visual assertion possible. |

## Auth

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Login | Email/nickname login success | Ready | Covered by `ios-login-smoke.yaml`; pass test account via runtime `EMAIL`/`PASSWORD`. |
| Login | Wrong password error | Needs account | Non-mutating. |
| Session | App restart keeps login | Ready | Covered by `ios-login-persistence.yaml` after a successful login flow. |
| Refresh | Long idle then authenticated API still works | Needs account | 1-hour wait can be scripted but slow. |
| Logout | Logout returns to Home guest state | Needs account | Mutates local session only. |
| Signup | Email verification and profile completion | Needs permission | Creates server account. |
| Find email/password | Recovery flows | Needs account | Depends on backend mail/verification setup. |
| Social login | Kakao/Apple auth entry | Needs account | External auth often semi-manual. |

## Home

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Promotions | Promotion carousel renders and swipes | Ready | Network data dependent. |
| Feed | Book story cards render | Ready | Current smoke asserts feed section. |
| Feed | Infinite scroll loads more | Ready | Can detect repeated errors/visible footer. |
| Like | Guest like opens login | Ready | Non-mutating. |
| Like | Logged-in like toggles count/state | Needs account / Needs permission | Mutates like state. |
| Subscribe | Guest subscribe opens login | Ready | Non-mutating. |
| Subscribe | Logged-in subscribe toggles | Needs account / Needs permission | Mutates follow state. |
| Profile | Author click navigates to profile | Needs selector | Needs stable card target. |

## Meeting

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Discover | Meeting tab renders recommendations/search | Ready | Covered partly by smoke. |
| Search | Search by club name/region | Ready | Needs predictable keyword. |
| Filters | Meeting output/input filters apply | Ready | Needs stable visible results. |
| Join | Guest join opens login | Ready | Non-mutating. |
| Join | Private club join request submit/close | Needs account / Needs permission | Creates request. |
| Join | Rejected request re-enables join button | Needs account / Needs data | Requires rejected state. |
| Detail | Club home renders info, notice, members | Needs data | Requires known club. |
| Detail | Switch club and cache/refresh state | Needs data | Useful performance regression. |
| Management | Management bottom sheet starts from bottom | Needs account / Needs data | Requires owner/staff account. |
| Management | Join request list pull-to-refresh | Needs account / Needs data | Staff role. |
| Management | Member list pull-to-refresh | Needs account / Needs data | Staff role. |
| Edit club | Name duplicate check | Needs account / Needs permission | Staff role, may mutate club name. |
| Edit club | Inquiry links add/edit/delete | Needs account / Needs permission | Mutates club links. |
| Leave/delete | Leave club / delete club | Needs permission | High-risk, only with disposable data. |

## Notice / Poll

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Notice list | List and pinned notice render | Needs data | Known club. |
| Detail | Notice detail/comments render | Needs data | Known notice. |
| Create | Create normal notice | Needs account / Needs permission | Staff role. |
| Edit/delete | Edit/delete notice | Needs permission | Staff role. |
| Comment | Add/edit/delete notice comment | Needs account / Needs permission | Mutates comment. |
| Poll | Android real-name option toggles | Needs Android / Needs account | Specific QA target. |
| Poll | Multiple-choice option toggles | Needs Android / Needs account | Specific QA target. |
| Book attachment | Attach bookshelf to notice | Needs account / Needs data | Staff role + bookshelf. |

## Bookshelf / Regular Meeting / Chat

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Bookshelf | Bookshelf tab/list renders | Needs data | Known club. |
| Detail | Bookshelf detail opens | Needs data | Known bookshelf. |
| Topic/review | Topic/review tabs render and paginate | Needs data | Known posts. |
| Compose | Add/edit/delete topic/review | Needs account / Needs permission | Mutates posts. |
| Regular meeting | Meeting detail opens from bookshelf | Needs data | Known meeting. |
| Team manage | Drag members between teams | Needs account / Needs data / Needs selector | Complex gesture test. |
| Chat | Open chat room and load messages | Needs account / Needs data | Known meeting/team. |
| Chat | Send/receive WebSocket message | Needs account / Needs permission | Requires second account for full realtime. |
| Chat report | Report user/message from chat | Needs account / Needs permission | Mutates report data. |

## Story

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Feed | All/following/club tabs render | Ready / Needs account for following | Guest all feed ready. |
| Infinite scroll | No duplicate cursor request symptoms | Ready | Can check no visible 429/retry loop. |
| Detail | Story detail opens | Ready | Needs stable card selector. |
| Compose | Guest compose opens login | Ready | Non-mutating. |
| Compose | Create/edit/delete story | Needs account / Needs permission | Mutates story data. |
| Comments | Create/edit/delete comment/reply | Needs account / Needs permission | Mutates comments. |
| Like | Like/unlike story | Needs account / Needs permission | Mutates like state. |
| Report | Guest report closes modal and opens login | Ready | Specific QA target. |
| Report | Logged-in report submit | Needs account / Needs permission | Mutates reports. |
| Book search | Search/select book in compose | Ready | Network dependent. |

## News

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| List | News tab renders list/promotions | Ready | Covered by smoke tab entry. |
| Detail | News detail opens | Ready | Needs stable article target. |
| Detail layout | Title -> created date -> content | Ready | Specific QA target. |
| Contact | Contact button opens link/modal | Ready | Depends current UX. |
| Original link | Open external source | Needs permission | Opens browser/external URL. |

## My Page / Settings

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Guest | My tab opens login | Ready | Covered by smoke. |
| Profile | Profile sections render after login | Needs account | Non-mutating. |
| Edit profile | Nickname duplicate button works with keyboard | Needs account / Needs permission | May mutate nickname/description. |
| Edit profile | Description supports newline | Needs account / Needs permission | Specific QA target. |
| My stories | Draft/delete story behavior | Needs account / Needs permission | Mutates story. |
| Liked books | Liked books render/toggle | Needs account / Needs permission | Mutates likes. |
| My clubs | My club list and navigation | Needs account / Needs data | Non-mutating. |
| Reports | Report management maps backend fields | Needs account / Needs data | Specific QA target. |
| Blocks | Blocked members list/unblock | Needs account / Needs permission | Mutates block state. |
| Notifications | List, settings, redirect | Needs account / Needs data | Some mutating read status. |
| Language | Korean/English switch persists | Ready / Needs account optional | Can run guest. |
| Email/password | Change email/password | Needs account / Needs permission | Sensitive; use disposable account. |

## User Profile

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Profile | Open another user's profile | Ready | Needs known nickname/card. |
| Follow | Follow/unfollow user | Needs account / Needs permission | Mutates follow state. |
| Stories | Other profile story opens and returns correctly | Needs data | Specific QA target. |
| Books/clubs | Liked books and clubs render | Needs data | Known member. |
| Report/block | Report/block user | Needs account / Needs permission | Mutates report/block data. |

## Cross-Cutting

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Images | Image placeholders/cache render without blank cards | Ready | Visual assertions/screenshots. |
| Performance | Tab switch and first content timing | Ready | Needs custom timing wrapper/logging for exact numbers. |
| Scroll | Lists/detail screens scroll consistently | Ready | Needs per-screen flow expansion. |
| Error handling | 401/403/404/429 toasts | Needs data/mock | Hard with live backend only. |
| Deep links | Notification route params and app scheme | Needs data | Can use `simctl openurl`. |
| i18n | Translation keys not visible | Ready | Guest and logged-in variants. |
| Accessibility selectors | Stable `testID` coverage | Needs selector | Recommended before broad automation. |
