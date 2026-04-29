# Font 통일 정리

- 갱신 시각: `2026-04-29 09:29:57 KST`
- 스캔 범위: `src/**` (BE/FE 제외)
- 기준 파일: `src/theme/typography.ts`, `src/theme/installGlobalStyleScale.ts`

## 현재 상태

- `fontSize` 하드코딩: **0건**
- `lineHeight` 하드코딩: **0건**
- `letterSpacing` 하드코딩: **0건**
- 확인 명령:

```bash
rg -n "fontSize\\s*:\\s*[0-9]+" /Users/hyunil/Desktop/checkmo_rn_work/RN/src
rg -n "lineHeight\\s*:\\s*[0-9]+" /Users/hyunil/Desktop/checkmo_rn_work/RN/src
rg -n "letterSpacing\\s*:\\s*[-0-9.]+" /Users/hyunil/Desktop/checkmo_rn_work/RN/src
```

## 적용된 토큰 정책

1. `15`, `16`은 하드코딩 금지, 토큰으로 승격
2. `lineHeight`, `letterSpacing` 직접 지정 금지, 토큰에서만 관리
3. 네이밍은 역할형(`headline`/`subhead`/`body`/`caption`) 유지

## 추가된 토큰

- `subhead5` (16/22, medium)
- `body1_4` (15/20.3, regular)
- `body1_3_compact` (14/20, regular)
- `body1_3_relaxed` (14/22, regular)
- `body1_2_spacious` (14/30, medium)
- `caption1_2_trackingWide` (12/17.4, medium, letterSpacing 0.2)
- `caption1_3` (12/18, regular)
- `caption1_3_relaxed` (12/20, regular)
- `caption1_3_loose` (12/21, regular)
- `caption1_3_spacious` (12/22, regular)

## 재발 방지 룰

- 스크립트: `scripts/check-typography-hardcode.sh`
- npm 스크립트:
  - `npm run check:typography` (전체 `src` 검사)
  - `npm run check:typography:staged` (staged 파일만 검사)
  - `npm run check`에 `check:typography` 선행 포함

## 삐져나감/오버플로우 점검 메모

- 코드 정리 중 정적 확인 기준에서 신규 오버플로우 증상은 발견되지 않음
- 런타임(실기기/시뮬레이터) 시각 검증은 미수행
