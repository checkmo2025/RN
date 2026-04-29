#!/usr/bin/env bash
set -euo pipefail

PATTERN='(fontSize|lineHeight|letterSpacing)\s*:\s*[-]?[0-9]+(?:\.[0-9]+)?'
EXCLUDE_GLOBS=(
  --glob '!src/theme/typography.ts'
  --glob '!src/theme/installGlobalStyleScale.ts'
)

MODE="${1:-all}"
MATCHES=""

if [[ "${MODE}" == "--staged" ]]; then
  STAGED_FILES=()
  while IFS= read -r file; do
    [[ "${file}" =~ ^src/.*\.(ts|tsx)$ ]] || continue
    [[ "${file}" == "src/theme/typography.ts" ]] && continue
    [[ "${file}" == "src/theme/installGlobalStyleScale.ts" ]] && continue
    STAGED_FILES+=("${file}")
  done < <(git diff --cached --name-only --diff-filter=ACM)

  if [[ "${#STAGED_FILES[@]}" -eq 0 ]]; then
    echo "[OK] No staged RN source files to check."
    exit 0
  fi

  MATCHES="$(rg -n --pcre2 "${PATTERN}" "${STAGED_FILES[@]}" || true)"
else
  MATCHES="$(rg -n --pcre2 "${PATTERN}" src "${EXCLUDE_GLOBS[@]}" || true)"
fi

if [[ -n "${MATCHES}" ]]; then
  echo "[FAIL] Hardcoded typography values detected:"
  echo "${MATCHES}"
  echo
  echo "Use typography tokens from src/theme/typography.ts instead."
  exit 1
fi

echo "[OK] Typography hardcode check passed."
