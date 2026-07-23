#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/fixdev"
COMMIT_MESSAGE="${1:-}"

if [[ -z "$COMMIT_MESSAGE" ]]; then
  echo "Usage: bash ops/push.sh \"commit message\"" >&2
  exit 2
fi

cd "$APP_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git diff --cached --check
  git commit -m "$COMMIT_MESSAGE"
else
  echo "Tidak ada perubahan untuk di-commit."
fi

git push origin main
printf 'Push selesai. Production belum direstart otomatis. Jalankan ops/deploy.sh di server production.\n'
