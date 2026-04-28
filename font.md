# Font 통일 정리

- 생성 시각: `2026-04-28 23:48:08 KST`
- 스캔 범위: `src/**`, `App.tsx`
- 기준 파일: `src/theme/typography.ts`, `src/theme/installGlobalStyleScale.ts`

## 현재 상태

- `typography` 토큰의 기본 크기 단계: `12`, `14`, `18`, `20`, `22`, `24`, `32`, `36`, `48`
- `fontSize` 하드코딩 잔여: **2건**
  - `src/components/feature/groups/MeetingListCard.tsx` (`fontSize: 16`)
  - `src/screens/MeetingScreen.tsx` (`fontSize: 15`)
- `lineHeight` 하드코딩: **22건**
  - 분포: `18`(5건), `20`(7건), `21`(1건), `22`(8건), `30`(1건)
- `letterSpacing` 하드코딩: **1건**
  - `src/components/common/BookFlipLoadingScreen.tsx` (`letterSpacing: 0.2`)

## 다음 통일 우선순위

1. `fontSize` 직접 지정 2건을 `typography` 토큰으로 대체
2. `15`, `16` 전용 단계가 계속 필요하면 `src/theme/typography.ts`에 토큰을 추가하고 숫자 직접 지정 금지
3. `lineHeight` 직접 지정 22건을 토큰 기준으로 정리
4. `letterSpacing` 예외 1건은 토큰화하거나 예외 사유를 주석으로 명시

## 작업 규칙

- `Text` 스타일은 `...typography.*`를 기본으로 시작
- `fontSize` override는 예외 상황이 아니면 금지
- 새 타이포 단계가 필요하면 사용 전 토큰부터 정의
- PR 전 아래 점검 명령으로 하드코딩 재확인

```bash
rg -n "fontSize\\s*:\\s*[0-9]+" src App.tsx
rg -n "lineHeight\\s*:\\s*[0-9]+" src App.tsx
rg -n "letterSpacing\\s*:\\s*[-0-9.]+" src App.tsx
```
