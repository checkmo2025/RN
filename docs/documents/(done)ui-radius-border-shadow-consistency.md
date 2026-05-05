# UI radius/border/shadow 통일 가이드 (6번 항목)

> 기준 문서: `docs/documents/(done)ui-consistency-top10.md`의 6번 항목  
> 범위: RN `src/**/*.tsx` 표면 스타일(radius, border, shadow, elevation)

## 1) 점검 목적
- 카드/패널/버튼의 표면 스타일을 일관된 디자인 언어로 통일한다.
- 임의 숫자 radius/그림자 값으로 생기는 화면별 무드 편차를 줄인다.

## 2) 현재 현황 요약 (RN 기준)
- `borderRadius: radius.*` 토큰 사용: 215건
- `borderRadius` 숫자 하드코딩: 58건
  - 빈도 상위: `16(10건)`, `4(9건)`, `18(6건)`, `14(6건)`
- `borderColor` 하드코딩 hex: 1건 (`MeetingScreen`)
- `backgroundColor` 하드코딩 hex: 13건
- shadow/elevation 관련 라인: 70건
  - `shadowColor` 토큰 사용: 2건
  - `shadowColor` hex 사용: 11건

## 3) 통일 정책 (초안)

### A. Radius 규칙
- 원칙: `radius` 토큰 사용 (`xs/sm/md/lg/pill`)
- 예외: 원형 아바타(`width/2`), 특수 shape는 숫자 허용 + 주석

### B. Border/Color 규칙
- `borderColor`, `backgroundColor`는 기본적으로 `colors` 토큰 사용
- hex 직입력은 브랜드/카테고리 색 등 불가피한 경우만 허용

### C. Shadow 규칙
- 공통 elevation preset(예: `surface1/surface2/overlay`)으로 통합
- `shadowColor/shadowOpacity/shadowRadius/elevation` 세트를 컴포넌트별 임의 정의하지 않도록 제한

## 4) 1차 정리 대상
- `borderRadius` 하드코딩 다수 파일:
  - `MeetingScreen`, `MyPageScreen`, `StoryScreen`, `BookStory*`, `AppHeader`
- `shadowColor: '#000'` 반복 구간:
  - `BookStoryCard`, `BookStoryFeedCard`, `HomeColumns`, `ToastHost`, `BottomTabs` 등
- 하드코딩 배경/경계색:
  - `MeetingScreen`, `BookFlipLoadingScreen`

## 5) 2차 정리 대상
- `surface` 스타일 토큰(반경+테두리+그림자) 묶음 도입
- 화면별 카드/모달/드롭다운을 preset 기반으로 치환
- 디자인 시스템 문서와 RN 토큰 네이밍 매핑

## 6) 완료 조건
- radius/border/shadow 하드코딩이 정책 예외만 남음
- 동일 역할의 표면 컴포넌트가 같은 preset을 공유함
