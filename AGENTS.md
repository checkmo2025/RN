# Agent Instructions

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

- 커밋/푸시 요청 시 작업 순서는 `todo 업데이트 → agent-log 업데이트 → 검증 → 커밋 → 푸시`를 기본으로 하며, `agent-log` 변경은 반드시 같은 커밋에 포함한다.
- `docs/agent/agent-log.md`는 시간 오름차순(과거 위, 최신 아래)으로 유지하며, 새 로그는 반드시 파일 하단에 추가한다.

- 사용자가 `/cpa`를 요청하면 아래 순서로 수행한다.
  1) `docs/agent/agent-log.md`를 먼저 업데이트한다. (날짜/시간/KST + 변경 요약 1~4개 bullet)
  2) 현재 작업과 관련된 변경 파일만 스테이징한다. (무관한 untracked 폴더/파일 제외)
  3) 간결한 커밋 메시지로 커밋한다.
  4) 현재 브랜치로 푸시한다.
