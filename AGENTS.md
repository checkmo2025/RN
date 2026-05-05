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
