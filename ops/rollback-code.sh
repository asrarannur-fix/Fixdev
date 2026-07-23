#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/fixdev"
COMMIT="${1:-}"

if [[ -z "$COMMIT" ]]; then
  echo "Usage: bash ops/rollback-code.sh <commit-baik>" >&2
  exit 2
fi

cd "$APP_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree dirty. Bersihkan/commit perubahan sebelum rollback." >&2
  git status --short
  exit 1
fi

git checkout "$COMMIT" -- .
npm ci --include=dev
npm run build
pm2 restart fixdev-erp --update-env
curl -fsS -H 'Host: fixdev.web.id' http://127.0.0.1:3000/api/health >/dev/null
pm2 save
printf 'Rollback kode selesai. Database tidak diubah otomatis.\n'
