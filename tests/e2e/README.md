# Local E2E

This directory is for local-only Checkmo E2E flows. These tests are intended to be run by Codex on demand, not by PR/CI.

## Default Runner

- Tool: Maestro
- iOS app id: `kr.co.checkmo.app`
- Default first pass: iOS simulator guest smoke
- Reports: `docs/e2e-reports/YYYY-MM-DD-e2e-report.md` and `.csv`

## Current Flow Files

| Flow | Platform | Auth | Mutates server data | Purpose |
| --- | --- | --- | --- | --- |
| `ios-guest-smoke.yaml` | iOS | Guest | No | Launch app, verify Home, visit Meeting/Story/News/My login gate. |
| `ios-login-smoke.yaml` | iOS | Test account | No | Launch with clear state, sign in with runtime `EMAIL`/`PASSWORD`, verify auth gate closes. |
| `ios-login-persistence.yaml` | iOS | Test account | No | Relaunch without clearing state and verify the authenticated My Page remains available. |

## Reporting

After every E2E run, append a row with:

| Date | Time | Test | Platform | Result | Error Count | Error Items | Notes |
| --- | --- | --- | --- | --- | ---: | --- | --- |

Use:

```bash
node scripts/e2e-report.js --suite "iOS Guest Smoke" --platform ios --flow tests/e2e/ios-guest-smoke.yaml --result pass --errors 0 --notes "Maestro smoke passed"
```

The script writes both Markdown and CSV so the CSV can be opened in Excel.

For a full feature matrix, use:

```bash
node scripts/e2e-report.js --full-matrix --suite "iOS Local E2E Full" --platform ios --preset local-full-smoke
```

The full matrix writes `docs/e2e-reports/YYYY-MM-DD-e2e-full-matrix.md` and `.csv`.
Only actually executed checks should be marked `PASS` or `FAIL`; unexecuted checks stay `NOT RUN` or `BLOCKED`.

## Scope Rules

- Keep all runs local unless explicitly requested.
- Do not add GitHub Actions or PR gates unless explicitly requested.
- Ask before running tests that create or modify backend data.
- Prefer iOS first if no platform is specified.
- Use test accounts for authenticated flows; do not use personal accounts unless the user explicitly provides them for testing.
