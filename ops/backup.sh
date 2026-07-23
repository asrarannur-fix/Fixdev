#!/bin/bash
# ops/backup.sh

# Memastikan script dijalankan dengan bash

# Load environment variables
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Fallback for production if not set
: ${FIXDEV_DATABASE_NAME:=fixdev}
: ${DATABASE_URL:=postgresql://fixdev:fixdev_db_2026@127.0.0.1:5432/fixdev}

# Extract DB connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -r 's/.*@([0-9.]+):[0-9]+.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed -r 's/.*:([0-9]+)\/.*$/\1/')
DB_USER=$(echo $DATABASE_URL | sed -r 's/.*\/\/(.*):.*@.*/\1/')
DB_PASSWORD=$(echo $DATABASE_URL | sed -r 's/.*:([^@]+)@.*/\1/')

# Check if variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$FIXDEV_DATABASE_NAME" ]; then
  echo "Error: Missing one or more database connection parameters." >&2
  echo "Please ensure DATABASE_URL and FIXDEV_DATABASE_NAME are set in .env or environment." >&2
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="$BACKUP_DIR/$FIXDEV_DATABASE_NAME-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "Starting backup of database '$FIXDEV_DATABASE_NAME' to '$BACKUP_FILE'..."

PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$FIXDEV_DATABASE_NAME" --no-owner --no-acl > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"
  echo "Latest backup: $(readlink -f $BACKUP_FILE)"
else
  echo "Backup failed!" >&2
  exit 1
fi

# Optional: Clean up old backups (e.g., keep last 7 days)
# find "$BACKUP_DIR" -type f -name "*.sql" -mtime +7 -delete

