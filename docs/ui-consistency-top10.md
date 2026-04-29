# UI 통일 10개 항목 (RN)

> 범위: RN 코드 기준 (`src`, `docs`)  
> 제외: BE/FE 코드 수정

## 목표
- 화면마다 달라지는 UX/문구/컴포넌트 규칙을 10개 항목으로 고정한다.
- RN 신규 화면/수정 시 같은 체크리스트로 품질 편차를 줄인다.

## 10개 항목 로드맵

| 번호 | 항목 | 상태 | 산출물 |
|------|------|------|------|
| 1 | 문구/카피 규칙 통일 | 🔄 진행중 | `docs/ui-copy-consistency.md` |
| 2 | 로딩 피드백 규칙 통일 (풀스크린/인라인/버튼) | 🔄 진행중 | `docs/ui-loading-feedback-consistency.md` |
| 3 | 버튼 규격 통일 (높이/타입/disabled/loading) | 🔄 진행중 | `docs/ui-button-consistency.md` |
| 4 | 입력 폼 규격 통일 (필드/에러/도움말) | 🔄 진행중 | `docs/ui-input-form-consistency.md` |
| 5 | spacing 토큰 적용 통일 | 🔄 진행중 | `docs/ui-spacing-token-consistency.md` |
| 6 | radius/border/shadow 규칙 통일 | 🔄 진행중 | `docs/ui-radius-border-shadow-consistency.md` |
| 7 | 모달/바텀시트 패턴 통일 | 🔄 진행중 | `docs/ui-modal-bottomsheet-consistency.md` |
| 8 | 모션/햅틱 규칙 통일 | 🔄 진행중 | `docs/ui-motion-haptic-consistency.md` |
| 9 | 에러/빈 상태/성공 피드백 문구 통일 | 🔄 진행중 | `docs/ui-feedback-message-consistency.md` |
| 10 | 접근성/이벤트 네이밍 통일 | 🔄 진행중 | `docs/ui-accessibility-event-naming-consistency.md` |

## 진행 원칙
- 항목별로 먼저 `현황 스캔`을 끝내고, 이후 `정책 확정 -> 치환 적용 -> 회귀 점검` 순서로 진행한다.
- FE/BE는 참고만 하고, RN 기준 정책 문서와 RN 코드 반영을 우선한다.
