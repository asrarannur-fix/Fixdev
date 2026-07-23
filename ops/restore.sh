#!/bin/bash
# ops/restore.sh

# Load environment variables
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Fallback for production if not set
: ${FIXDEV_DATABASE_NAME:=fixdev}
: ${DATABASE_URL:=postgresql://fixdev:fixdev_db_2026@127.0.0.1:5432/fixdev}

# Check for backup file argument
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>" >&2
  exit 1
fi

BACKUP_FILE="$1"
RESTORE_DB_NAME="${2:-$FIXDEV_DATABASE_NAME}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found." >&2
  exit 1
fi

# Extract DB connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -r 's/.*@([0-9.]+):[0-9]+.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed -r 's/.*:([0-9]+)\/.*$/\1/')
DB_USER=$(echo $DATABASE_URL | sed -r 's/.*\/\/(.*):.*@.*/\1/')
DB_PASSWORD=$(echo $DATABASE_URL | sed -r 's/.*:([^@]+)@.*/\1/')

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$RESTORE_DB_NAME" ]; then
  echo "Error: Missing one or more database connection parameters." >&2
  exit 1
fi

echo "Warning: This will drop and recreate the database '$RESTORE_DB_NAME'."
echo "Are you sure you want to proceed? (y/N)"
# For non-interactive automation, skip confirmation if -y is provided as third argument
if [[ "$3" != "-y" ]]; then
  read -r response
  if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

echo "Terminating existing connections to '$RESTORE_DB_NAME'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$RESTORE_DB_NAME' AND pid <> pg_backend_pid();"

echo "Recreating database '$RESTORE_DB_NAME'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $RESTORE_DB_NAME;"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $RESTORE_DB_NAME;"

echo "Starting restore of database '$RESTORE_DB_NAME' from '$BACKUP_FILE'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$RESTORE_DB_NAME" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Restore successful!"
else
  echo "Restore failed!" >&2
  exit 1
fi

