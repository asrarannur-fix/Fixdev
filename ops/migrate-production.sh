#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/fixdev"
ENV_FILE="/etc/fixdev/fixdev.production.env"
BACKUP_DIR="/var/backups/fixdev"

cd "$APP_DIR"
[[ -r "$ENV_FILE" ]] || { echo "Environment production tidak ditemukan." >&2; exit 1; }
command -v pg_dump >/dev/null || { echo "pg_dump tidak tersedia." >&2; exit 1; }

set -a
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]] || { echo "DATABASE_URL tidak tersedia." >&2; exit 1; }

install -d -m 700 "$BACKUP_DIR"
backup_file="$BACKUP_DIR/fixdev-$(date +%Y%m%d-%H%M%S).dump"
printf 'Membuat backup database production: %s\n' "$backup_file"
pg_dump "$DATABASE_URL" --format=custom --file="$backup_file"
chmod 600 "$backup_file"

printf 'Menjalankan migration production setelah backup berhasil.\n'
DOTENV_CONFIG_PATH="$ENV_FILE" FIXDEV_PROFILE=production FIXDEV_DATABASE_NAME=fixdev npm run db:migrate:production
printf 'Migration selesai. Backup dipertahankan di %s.\n' "$backup_file"
