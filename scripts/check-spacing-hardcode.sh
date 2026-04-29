#!/usr/bin/env bash
set -euo pipefail

# spacing 토큰값(4/8/12/16/20/24/32)이 margin·padding·gap 속성에 직접 하드코딩된 경우를 감지한다.
# 허용 예외: 0, 음수, 2·3·6(미세 보정), 10·13·14·18 등 컴포넌트 전용 디자인값
PATTERN='(marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|gap)[[:space:]]*:[[:space:]]*(4|8|12|16|20|24|32),'

MODE="${1:-all}"
MATCHES=""

if [[ "${MODE}" == "--staged" ]]; then
  STAGED_FILES=()
  while IFS= read -r file; do
    [[ "${file}" =~ ^src/.*\.(ts|tsx)$ ]] || continue
    [[ "${file}" == "src/theme/spacing.ts" ]] && continue
    STAGED_FILES+=("${file}")
  done < <(git diff --cached --name-only --diff-filter=ACM)

  if [[ "${#STAGED_FILES[@]}" -eq 0 ]]; then
    echo "[OK] No staged RN source files to check."
    exit 0
  fi

  MATCHES="$(grep -En "${PATTERN}" "${STAGED_FILES[@]}" 2>/dev/null || true)"
else
  MATCHES="$(grep -rn --include="*.ts" --include="*.tsx" -E "${PATTERN}" src/ \
    --exclude="src/theme/spacing.ts" 2>/dev/null || true)"
fi

if [[ -n "${MATCHES}" ]]; then
  echo "[FAIL] Hardcoded spacing token values detected:"
  echo "${MATCHES}"
  echo
  echo "Use spacing tokens from src/theme/spacing.ts instead."
  echo "Allowed exceptions: 0, negative offsets, 2·3·6 (micro), component-specific design values."
  exit 1
fi

echo "[OK] Spacing hardcode check passed."
