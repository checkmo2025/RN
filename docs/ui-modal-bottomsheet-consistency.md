# UI 모달/바텀시트 통일 가이드 (7번 항목)

> 기준 문서: `docs/ui-consistency-top10.md`의 7번 항목  
> 범위: RN `src/**/*.tsx` `Modal` 기반 레이어 UI

## 1) 점검 목적
- 모달/시트의 진입/종료/배경/헤더 패턴을 통일한다.
- 화면마다 다른 닫기 동작, 애니메이션, 레이아웃 규칙으로 인한 혼란을 줄인다.

## 2) 현재 현황 요약 (RN 기준)
- `<Modal` 사용: 19건
- 파일 분포:
  - `MeetingScreen`: 11건
  - `AuthFlowScreen`: 2건
  - `AppHeader`: 2건
  - `StoryScreen`/`MyPageScreen`/`ActionMenu`/`ReportMemberModal`: 각 1건
- `onRequestClose`: 19건(전부 정의됨)
- `animationType` 혼재:
  - `fade`: 13
  - `slide`: 4
  - `none`: 2
- `transparent` 직접 사용: 2건 (`ActionMenu`, `ReportMemberModal`)

## 3) 통일 정책 (초안)

### A. 레이어 타입 정의
- `modal-dialog`: 확인/입력 중심, `fade`
- `bottom-sheet`: 작업 선택/세부 패널, `slide`
- `fullscreen-sheet`: 복잡한 편집/관리 화면, `slide`

### B. 공통 구조
- 백드롭(overlay) + 카드(card) + 헤더(header) + 액션 영역(footer) 구조 통일
- `onRequestClose`는 항상 동일 정책(뒤로가기/백드롭/닫기 버튼)으로 동작

### C. 닫기 규칙
- 백드롭 탭 닫힘 허용 여부를 타입별로 고정
- 파괴적 작성 화면은 닫기 전 확인(Alert) 정책을 공통화

### D. 안전영역/키보드
- 모달 헤더/푸터의 safe area 처리 규칙 고정
- 입력 모달은 키보드 대응(스크롤/여백/토스트 위치) 표준화

## 4) 1차 정리 대상
- `MeetingScreen` 다중 모달 11건의 타입 분류 및 명명 정리
- `animationType` 혼재(`none/fade/slide`)의 목적 기반 표준화
- 공통 모달 스타일 키(`*ModalOverlay`, `*ModalCard`, `*ModalHeader`) 재사용 가능성 정리

## 5) 2차 정리 대상
- `BaseModal`, `BottomSheetModal` 공용 래퍼 도입 검토
- 모달 스택 우선순위(zIndex/elevation) 규칙 문서화
- 모달 오픈/클로즈 시 포커스 이동 및 접근성 안내 추가

## 6) 완료 조건
- 모달 타입별 애니메이션/닫기 동작이 예측 가능함
- 신규 모달이 공용 패턴으로 생성되고 임의 구현이 줄어듦
