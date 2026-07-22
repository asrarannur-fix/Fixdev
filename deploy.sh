#!/bin/bash
# ==========================================
# FIXDEV ERP SaaS — Automated Deployment Script
# Run this on your server: bash deploy.sh
# ==========================================

set -euo pipefail

APP_DIR="/var/www/fixdev"
PM2_NAME="fixdev-erp"
ENV_FILE="/etc/fixdev/fixdev.production.env"

echo "=== 🚀 FIXDEV DEPLOYMENT START ==="

# Check directory
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Directory $APP_DIR does not exist. Clone the repository there first."
    exit 1
fi

cd "$APP_DIR"

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
    npm ci
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
pm2 startOrRestart ecosystem.config.cjs --env production

# Save PM2 state
pm2 save

echo "=== 🎉 DEPLOYMENT SUCCESSFUL ==="
echo "You can check logs via: pm2 logs $PM2_NAME"
