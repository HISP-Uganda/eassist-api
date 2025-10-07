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

# Stop all services and processes using port 8080
echo "[INFO] Stopping all services on port 8080"

# Stop systemd service if it exists
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet eassist-api 2>/dev/null; then
    echo "[INFO] Stopping systemd service: eassist-api"
    sudo systemctl stop eassist-api || true
  fi
fi

# Kill any processes still using port 8080
echo "[INFO] Checking for processes on port 8080"
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS=$(sudo lsof -ti:8080 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "[INFO] Killing processes on port 8080: $PORT_PIDS"
    echo "$PORT_PIDS" | xargs -r sudo kill -9 || true
    sleep 2
  fi
fi

# Alternative: use fuser if lsof not available
if command -v fuser >/dev/null 2>&1; then
  sudo fuser -k 8080/tcp 2>/dev/null || true
  sleep 1
fi

# Verify port is free
if sudo lsof -ti:8080 >/dev/null 2>&1; then
  echo "[ERROR] Port 8080 is still in use after cleanup!"
  sudo lsof -i:8080 || true
  exit 1
fi

echo "[INFO] Port 8080 is now free"

# Start systemd service
if command -v systemctl >/dev/null 2>&1; then
  echo "[INFO] Starting eassist-api service"
  sudo systemctl start eassist-api

  # Wait for service to be ready
  echo "[INFO] Waiting for service to start..."
  for i in {1..15}; do
    if sudo lsof -ti:8080 >/dev/null 2>&1; then
      echo "[INFO] Service is now listening on port 8080"
      sudo systemctl status --no-pager eassist-api || true
      echo "[OK] Deploy complete"
      exit 0
    fi
    sleep 1
  done

  echo "[ERROR] Service failed to start on port 8080"
  sudo systemctl status --no-pager eassist-api || true
  sudo journalctl -u eassist-api -n 50 --no-pager || true
  exit 1
else
  echo "[WARN] systemctl not found; ensure the service is started manually"
fi

echo "[OK] Deploy complete"
