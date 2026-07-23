#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' 'production:'
curl -fsSk https://fixdev.web.id/api/health
printf '\n%s\n' 'development:'
curl -fsSk https://dev.fixdev.web.id/api/health
printf '\n'
pm2 list
