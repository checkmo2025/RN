# Android 1.3.0 제출 파일 준비

- 준비일: 2026-10-29
- 앱 버전: **1.3.0**, 패키지: `kr.co.checkmo.app`
- 기존 EAS production / 원격 업로드 키 / AAB 빌드 방식을 유지한다.
- 직전 원격 빌드: 1.2.8 (16). 이번 versionCode는 EAS 원격 자동 증가로 배정한다. 로컬 versionCode 1은 원격 빌드 번호가 아니다.
- SDK 58 네이티브 변경과 fingerprint 런타임 정책을 포함한다.
- Google Play 업로드·심사 제출은 실행하지 않는다.
- 검증: 타입 검사·회귀 86개 통과, iOS Release build 및 서명 검증 통과. Android AAB 빌드·최종 메타데이터는 완료 후 기록한다.
