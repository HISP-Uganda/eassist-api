#!/usr/bin/env bash
set -euo pipefail

cd /opt/eassist-api

# Load .env (export all variables)
set -a
if [ -f ./.env ]; then
  # shellcheck disable=SC1091
  . ./.env
fi
set +a

: "${PORT:=8080}"
: "${NODE_ENV:=production}"

exec /usr/bin/node /opt/eassist-api/src/server.js
