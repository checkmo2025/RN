# UI 버튼 규격 통일 가이드 (3번 항목)

> 기준 문서: `docs/ui-consistency-top10.md`의 3번 항목  
> 범위: RN `src/**/*.tsx` 버튼/클릭 액션 UI

## 1) 점검 목적
- 버튼 크기/상태/피드백을 통일해 화면 간 조작감 차이를 줄인다.
- 버튼을 화면마다 새로 정의하는 비용을 줄이고 재사용성을 높인다.

## 2) 현재 현황 요약 (RN 기준)
- 공용 버튼 컴포넌트 존재:
  - `PrimaryButton`, `SecondaryButton`, `IconButton`, `FloatingActionButton`
- 실제 사용 편차:
  - `PrimaryButton`/`SecondaryButton` 렌더 사용: 0건
  - `IconButton`/`FloatingActionButton` 사용: 9건
  - `<Pressable` 사용: 336건
  - `FeedbackPressable as Pressable` import: 15개 파일
- 크기 규격이 화면별로 혼재:
  - `height: 44` (`PrimaryButton`)
  - `height: 48` (`FloatingActionButton`, 일부 중복확인 버튼)
  - `height/minHeight: 52` (`ReportMemberModal`, `AuthFlow`, `MyPage`)
  - `height: 28` (헤더/필터/작은 액션 버튼 다수)

## 3) 통일 정책 (초안)

### A. 버튼 타입
- `primary`: 핵심 완료 액션
- `secondary`: 보조 액션
- `outline`: 경계형 보조 액션
- `ghost`: 배경 없는 텍스트/아이콘 액션
- `danger`: 파괴적 액션(탈퇴/삭제)

### B. 버튼 크기
- `lg` (주요 CTA): 높이 52
- `md` (일반 버튼): 높이 44
- `sm` (칩/필터/보조): 높이 28
- `icon` (아이콘 단독): 28 또는 32 (컨텍스트 고정)

### C. 상태 규칙
- `default`, `pressed`, `disabled`, `loading`를 모든 버튼 타입에서 동일하게 지원
- `loading`에서는 클릭 차단 + 문구 변경 또는 아이콘 전환
- `disabled` 표현은 opacity 하향 또는 토큰 컬러로 일관 처리

### D. 피드백 규칙
- RN 기본 `Pressable` 대신 가능한 곳은 `FeedbackPressable` 또는 공용 버튼 래퍼 사용
- Android ripple/opacity 반응을 공통 규칙으로 유지

## 4) 1차 정리 대상
- `PrimaryButton`/`SecondaryButton`를 실제 화면에서 쓰도록 진입점 정의
- 동일 역할 버튼의 사이즈 혼재(`44/48/52`)를 역할별(`lg/md/sm`)로 매핑
- `업로드/저장/처리` 상태 버튼은 `loading` 상태 규칙에 맞춰 동작 통일

## 5) 2차 정리 대상
- `AppButton`(semantic variant + size + loading) 공용 컴포넌트 도입 검토
- `Pressable` 직접 스타일링 케이스를 점진적으로 래핑 컴포넌트로 치환
- 버튼 라벨 문구를 `ui-copy` 정책과 연결

## 6) 완료 조건
- 주요 액션 버튼이 공용 규격(type/size/state)을 따름
- 같은 역할 버튼의 높이/패딩 편차가 사라짐
- `loading/disabled` 동작이 화면별로 동일하게 체감됨
