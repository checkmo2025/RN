# Agent Instructions

- `ref_code/` 디렉터리에는 참조용 외부 코드가 포함되어 있다.
  - `ref_code/BE`: 백엔드 파일이며, 별도의 백엔드 GitHub 레포와 연결되어 있다.
  - `ref_code/FE`: 프론트엔드 파일이며, 별도의 프론트엔드 GitHub 레포와 연결되어 있다.

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
