# Agent Instructions

- 이 레포(`checkmo_rn`)는 책모(독서모임 커뮤니티) **모바일 앱**(Expo / React Native)이다.
- `ref_code/` 디렉터리에는 참조용 외부 코드(읽기 전용 클론)가 포함되어 있다. `.gitignore`에 등록되어 RN 레포에 커밋/푸시되지 않으며, 빌드에서도 제외된다. API 스펙·도메인 로직을 참고할 때 사용하고, 이 디렉터리의 코드는 RN 작업 중 수정하거나 커밋하지 않는다.
  - `ref_code/BE`: 백엔드. 별도 레포 `https://github.com/checkmo2025/BE.git` (Spring Boot 3.5 / Java 21 / Gradle).
  - `ref_code/FE`: 웹 프론트엔드. 별도 레포 `https://github.com/checkmo2025/FE.git` (Next.js 16 / React 19).

- iOS 로컬 Archive/App Store 제출 작업을 시작하기 전에 `docs/agent/ios-local-release-runbook.md`를 확인한다.
  - 정상적인 다음 배포에서는 빌드 번호 동기화 → Xcode Archive → Upload만 반복한다.
  - 키체인/인증서 복구는 코드 서명 사전 테스트가 실패할 때만 수행하며, 정상 상태에서는 반복하지 않는다.

- If a user request ends with `/md`, append a short update to `docs/agent/agent-log.md`.
- The appended update must include:
  - Date (`YYYY-MM-DD`)
  - Time (`HH:mm:ss KST`)
  - Brief summary of what was changed
- Keep the summary concise (1-4 bullet points).

- `docs/agent/todo.md`의 `## 📌 에이전트 프롬프트 블록 (여기는 프롬프트)` 섹션은 아래 경우에만 먼저 확인한다.
  - 사용자가 TODO 정리/업데이트/구조화 요청을 한 경우
  - `docs/agent/*` 문서를 수정하는 경우
  - 사용자가 TODO/agent-log 동기화를 요청한 경우

- `docs/agent/archive_todo.md`는 완료된 TODO 항목 보관 로그이며, 사용자가 과거 완료 항목 확인을 명시하지 않는 한 먼저 읽지 않는다.

- `docs/agent/agent-log.md`는 시간 오름차순(과거 위, 최신 아래)으로 유지하며, 새 로그는 반드시 파일 하단에 추가한다.

- 커밋/푸시 요청 시 기본 순서는 아래를 따른다.
  1) TODO 상태가 바뀌었으면 `docs/agent/todo.md`를 먼저 갱신한다.
  2) `docs/agent/agent-log.md`를 갱신한다. (날짜/시간/KST + 변경 요약 1~4개 bullet)
  3) 필요한 검증을 수행한다.
  4) 현재 작업과 관련된 파일만 스테이징한다. (무관한 untracked 제외)
  5) 커밋한다.
  6) 현재 브랜치로 푸시한다.
  - `agent-log` 변경은 반드시 같은 커밋에 포함한다.

- 사용자가 `/cpa`를 요청하면 위 커밋/푸시 기본 순서를 그대로 즉시 수행한다.

- Ponytail로 고도화·리팩터링한 작업은 `docs/optimization/README.md` 규칙과 `docs/optimization/TEMPLATE.md` 형식에 따라 기능별로 기록한다.
  - 사용자가 명시적으로 허용하지 않은 기능·데이터·순서·문구·오류·권한 로직은 바꾸지 않는다.
  - 핵심 구현 코드의 추가+삭제 합계는 기본 200줄 이내로 하고, 초과 시 예외 사유와 분할하지 않은 이유를 기록한다.
  - 측정하지 않은 성능은 개선으로 기록하지 않는다.
