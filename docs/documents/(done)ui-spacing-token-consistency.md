# UI spacing 토큰 통일 가이드 (5번 항목)

> 기준 문서: `docs/documents/(done)ui-consistency-top10.md`의 5번 항목  
> 범위: RN `src/**/*.tsx` 간격(margin/padding/gap) 스타일

## 1) 점검 목적
- 화면 간 간격 리듬을 토큰 기반으로 통일한다.
- 하드코딩 숫자 간격으로 생기는 미세한 UI 편차를 줄인다.

## 2) 현재 현황 요약 (RN 기준)
- `spacing.` 사용 전체: 880건
- spacing 관련 속성에서 토큰 사용: 812건
- spacing 관련 속성에서 숫자 하드코딩: 54건

대표 하드코딩 예시:
- `MeetingListCard`: `paddingTop: 13`, `paddingHorizontal: 14`, `gap: 2/4/6/8`
- `BottomTabs`: `paddingTop: 8`, `paddingHorizontal: 10`, `marginTop: -2`
- `AuthFlow`/`MyPage`/`Meeting`: `paddingVertical: 0/2/4`, `marginTop: -8/-10`

자주 보이는 값:
- `gap: 2` 다수
- `paddingVertical: 2/4/0`
- `marginTop: 2`, 음수 offset(`-2/-8/-10`)

## 3) 통일 정책 (초안)

### A. 토큰 우선 원칙
- spacing 관련 속성은 기본적으로 `spacing` 토큰만 사용한다.
- 신규 스타일에서 숫자 직접 입력을 금지한다.

### B. 예외 허용 기준
- `0`은 허용
- 안전영역/애니메이션 보정/아이콘 픽셀 정렬처럼 불가피한 경우만 숫자 허용
- 예외는 인접 주석으로 이유를 명시한다.

### C. 미세 간격 처리
- `2`, `10`, `14`처럼 자주 쓰이는 값이 반복되면
  - `spacing` 토큰 확장 또는
  - 기존 토큰 조합(`spacing.xs / 2` 등)으로 치환

## 4) 1차 정리 대상
- `src/components/feature/groups/MeetingListCard.tsx`의 `13/14/2/4/6/8` 계열 정리
- `src/navigation/BottomTabs.tsx`의 `8/10/-2` 계열 정리
- 입력 필드 주변 `paddingVertical: 4`, `gap: 2` 반복 영역 정리

## 5) 2차 정리 대상
- spacing 숫자 하드코딩을 파일 단위로 0건화
- `(done)component-spacing-audit.md`와 정책 연결
- CI/PR 점검용 `rg` 룰을 spacing 항목에도 추가

## 6) 완료 조건
- spacing 관련 하드코딩 숫자가 정책 예외 외 0건
- 주요 화면의 간격 리듬이 토큰 스케일로 통일됨
