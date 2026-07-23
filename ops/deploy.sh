#!/bin/bash
# ==========================================
# FIXDEV ERP SaaS — Automated Deployment Script
# Run on production server: bash ops/deploy.sh
# ==========================================

set -euo pipefail

APP_DIR="/home/ubuntu/fixdev"
PM2_NAME="fixdev-erp"
ENV_FILE="/etc/fixdev/fixdev.production.env"

echo "=== 🚀 FIXDEV DEPLOYMENT START ==="

# Check directory
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Directory $APP_DIR does not exist. Clone the repository there first."
    exit 1
fi

cd "$APP_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Error: Working tree is dirty. Commit/stash local changes before production deploy."
    git status --short
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Production environment file $ENV_FILE does not exist."
    exit 1
fi
set -a
source "$ENV_FILE"
set +a

# Pull latest code
echo "📦 Pulling latest code from git..."
git pull --ff-only origin main

# Install dependencies
echo "📥 Installing dependencies..."
if [ -f package-lock.json ]; then
    npm ci --include=dev
else
    npm install
fi

# Build production bundles
echo "⚙️ Building React frontend & Node server..."
npm run build

# Manage PM2 Process
echo "🔄 Restarting app using PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
    echo "❌ Error: pm2 is not installed or not in PATH."
    exit 1
fi
mkdir -p logs
# Only production is restarted here; development remains managed separately.
pm2 startOrRestart ecosystem.config.cjs --only "$PM2_NAME" --update-env

# Verify the process serves the health endpoint before saving state.
healthy=false
for attempt in $(seq 1 15); do
    if curl -fsS -H "Host: fixdev.web.id" http://127.0.0.1:3000/api/health >/dev/null; then
        healthy=true
        echo "✅ Production health check passed on attempt $attempt."
        break
    fi
    echo "⏳ Production belum siap (attempt $attempt/15), menunggu 2 detik..."
    sleep 2
done
if [ "$healthy" != true ]; then
    echo "❌ Error: Production health check failed after 15 attempts."
    exit 1
fi

# Save PM2 state
pm2 save

echo "=== 🎉 DEPLOYMENT SUCCESSFUL ==="
echo "You can check logs via: pm2 logs $PM2_NAME"
