#!/usr/bin/env bash
# Zero-downtime-ish deploy helper for eAssist API on a single host
# Usage: ./bin/deploy.sh [git-ref]
# Example: sudo -u gitdeploy /opt/eassist-api/bin/deploy.sh origin/main
set -euo pipefail

cd /opt/eassist-api

# Load .env to pick up optional AUDIT_LOG_* and NODE_ENV
set -a
if [ -f ./.env ]; then
  # shellcheck disable=SC1091
  . ./.env
fi
set +a

# Helper: upsert an env var in .env
upsert_env() {
  local key="$1"; shift
  local val="$1"; shift || true
  touch ./.env
  if grep -qE "^${key}=" ./.env; then
    sed -i.bak -E "s|^${key}=.*$|${key}=${val}|" ./.env && rm -f ./.env.bak
  else
    printf '\n%s=%s\n' "$key" "$val" >> ./.env
  fi
}

REF="${1:-origin/main}"
echo "[INFO] Starting deploy of ref: ${REF}"

if [ -d .git ]; then
  echo "[INFO] Detected git repository; performing fetch/reset"
  if git rev-parse --verify -q "$REF" >/dev/null 2>&1; then
    : # ref exists locally
  else
    git fetch --all --prune --tags
  fi
  echo "[INFO] Checking out $REF"
  if git rev-parse --verify -q "$REF" >/dev/null 2>&1; then
    git checkout -q -- .
    git reset --hard "$REF"
  else
    git checkout -q "$REF" || true
    git reset --hard "origin/${REF}"
  fi
else
  echo "[INFO] Not a git repo; skipping git fetch/reset (expecting files were uploaded by CI)"
fi

# Persist build metadata if provided by CI
if [ -n "${EASSIST_BUILD:-}" ]; then
  echo "[INFO] Setting EASSIST_BUILD=${EASSIST_BUILD}"
  upsert_env EASSIST_BUILD "$EASSIST_BUILD"
fi
if [ -n "${GIT_SHA:-}" ]; then
  echo "[INFO] Setting GIT_SHA=${GIT_SHA}"
  upsert_env GIT_SHA "$GIT_SHA"
fi

# Install dependencies (prefer clean install)
if [ -f package-lock.json ]; then
  echo "[INFO] Installing dependencies with npm ci"
  npm ci
else
  echo "[INFO] Installing dependencies with npm install"
  npm install --no-audit --no-fund
fi

# Run DB migrations
if npm run -s migrate >/dev/null 2>&1; then
  echo "[INFO] Running database migrations"
  npm run migrate:prep || true
  npm run migrate
else
  echo "[WARN] No migrate script found; skipping migrations"
fi

# Aggressively kill any process using port 8080 before restarting
echo "[INFO] Forcefully stopping all processes on port 8080"
# Try multiple methods to ensure port is free
pkill -9 -f "node.*server.js" || true
pkill -9 -f "npm.*start" || true
sleep 1

# Use fuser if available (more reliable for killing port processes)
if command -v fuser >/dev/null 2>&1; then
  fuser -k -9 8080/tcp || true
  sleep 1
fi

# Use lsof as fallback
PORT_PID=$(lsof -ti:8080 || true)
if [ -n "$PORT_PID" ]; then
  echo "[INFO] Killing processes on port 8080: $PORT_PID"
  kill -9 $PORT_PID || true
  sleep 2
fi

# Final verification that port is free
if lsof -ti:8080 >/dev/null 2>&1; then
  echo "[ERROR] Port 8080 is still in use after kill attempts"
  lsof -i:8080 || true
  exit 1
fi

echo "[INFO] Port 8080 is confirmed free"

# Restart systemd service (allowed by provisioning sudoers)
if command -v systemctl >/dev/null 2>&1; then
  echo "[INFO] Restarting eassist-api service"
  sudo systemctl restart eassist-api
  sleep 2
  sudo systemctl status --no-pager eassist-api || true
else
  echo "[WARN] systemctl not found; ensure the service is restarted manually"
fi

echo "[OK] Deploy complete"
