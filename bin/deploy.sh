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

# Use PID file approach instead of systemd
PID_FILE="$HOME/.eassist-api.pid"

# Stop service using PID file
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo '')
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[INFO] Stopping existing service with PID: $OLD_PID"
    kill -TERM "$OLD_PID" 2>/dev/null || true
    sleep 3
    # Force kill if still running
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "[INFO] Force killing process: $OLD_PID"
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE"
fi

# Additional cleanup - kill any remaining processes owned by current user
echo "[INFO] Cleaning up any remaining processes"
if command -v pgrep >/dev/null 2>&1; then
  # Kill node processes running server.js (only owned by current user)
  NODE_PIDS=$(pgrep -f 'node.*server.js' 2>/dev/null || true)
  if [ -n "$NODE_PIDS" ]; then
    echo "[INFO] Killing node processes: $NODE_PIDS"
    echo "$NODE_PIDS" | tr ' ' '\n' | while read pid; do
      [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
    done
  fi

  # Kill npm start processes
  NPM_PIDS=$(pgrep -f 'npm.*start' 2>/dev/null || true)
  if [ -n "$NPM_PIDS" ]; then
    echo "[INFO] Killing npm processes: $NPM_PIDS"
    echo "$NPM_PIDS" | tr ' ' '\n' | while read pid; do
      [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
    done
  fi
fi

# Wait for processes to fully terminate
sleep 5

# --- begin hardened 8080 cleanup ---
echo "[INFO] Systemd check for lingering service on 8080"
if command -v systemctl >/dev/null 2>&1; then
  # Stop common unit names quietly if they exist
  for svc in eassist-api eassist eassist_api; do
    if systemctl list-units --type=service --all | grep -q "^${svc}.service"; then
      echo "[INFO] Stopping systemd service: ${svc}.service"
      sudo systemctl stop "${svc}.service" || true
      sudo systemctl disable "${svc}.service" || true
    fi
  done
fi

echo "[INFO] Enumerating listeners on 8080 with sudo (cross-user)"
# Try ss first (fast), fall back to lsof
PIDS_SUDO="$(sudo ss -ltnp 2>/dev/null | awk '/:8080 /{print}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | tr '\n' ' ')"
if [ -z "$PIDS_SUDO" ] && command -v lsof >/dev/null 2>&1; then
  PIDS_SUDO="$(sudo lsof -nP -iTCP:8080 -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ')"
fi

if [ -n "$PIDS_SUDO" ]; then
  echo "[INFO] Killing PIDs listening on 8080: $PIDS_SUDO"
  for pid in $PIDS_SUDO; do
    sudo kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 2
  # Force-kill if still alive
  for pid in $PIDS_SUDO; do
    if sudo kill -0 "$pid" 2>/dev/null; then
      echo "[INFO] Force killing PID: $pid"
      sudo kill -9 "$pid" 2>/dev/null || true
    fi
  done
fi

echo "[INFO] Using fuser as last resort"
sudo fuser -k 8080/tcp 2>/dev/null || echo "[INFO] fuser found no processes"
sleep 2

# Wait loop until 8080 is free
echo "[INFO] Verifying port 8080 is free"
for i in $(seq 1 20); do
  if sudo ss -ltn 2>/dev/null | grep -q ':8080 '; then
    echo "[INFO] Port still busy, retry $i/20..."
    sleep 1
  else
    echo "[INFO] Port 8080 is now free"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "[ERROR] Port 8080 did not free up"
    sudo ss -ltnp | grep ':8080' || true
    exit 1
  fi
done
# --- end hardened 8080 cleanup ---

# Start service using simple process management
echo "[INFO] Starting eassist-api service"

# Create log directory
LOG_DIR="$HOME/logs"
mkdir -p "$LOG_DIR" 2>/dev/null || LOG_DIR="/tmp"
LOG_FILE="$LOG_DIR/eassist-api.log"

# Start the service in background
cd /opt/eassist-api
NODE_ENV=production PORT=8080 nohup npm start >"$LOG_FILE" 2>&1 &
NEW_PID=$!

# Save PID for future deployments
echo $NEW_PID > "$PID_FILE"
echo "[INFO] Started service with PID: $NEW_PID"
echo "[INFO] Log file: $LOG_FILE"

# Wait and verify service started
sleep 5
if ! kill -0 "$NEW_PID" 2>/dev/null; then
  echo "[ERROR] Service failed to start"
  echo "[ERROR] Recent logs:"
  tail -20 "$LOG_FILE" 2>/dev/null || echo 'No logs available'
  exit 1
fi

# Verify service is listening on port 8080
echo "[INFO] Waiting for service to start..."
READY=0
for i in {1..30}; do
  if command -v nc >/dev/null 2>&1 && nc -z localhost 8080 2>/dev/null; then
    echo "[INFO] ✅ Service is responding on port 8080"
    READY=1
    break
  elif command -v lsof >/dev/null 2>&1 && lsof -ti:8080 >/dev/null 2>&1; then
    echo "[INFO] ✅ Service is listening on port 8080"
    READY=1
    break
  fi

  # Check if process is still alive
  if ! kill -0 "$NEW_PID" 2>/dev/null; then
    echo "[ERROR] Service process died during startup"
    tail -30 "$LOG_FILE" 2>/dev/null || echo 'No logs available'
    exit 1
  fi

  echo "[INFO] Waiting for service... ($i/30)"
  sleep 2
done

if [ $READY -eq 1 ]; then
  echo "[OK] ✅ Deployment successful"
  echo "[INFO] Service PID: $NEW_PID"
  echo "[INFO] PID file: $PID_FILE"
  echo "[INFO] Log file: $LOG_FILE"
else
  echo "[ERROR] ❌ Service startup timeout"
  echo "[ERROR] Process info:"
  ps aux | grep "$NEW_PID" 2>/dev/null || echo 'Process not found'
  echo "[ERROR] Recent logs:"
  tail -50 "$LOG_FILE" 2>/dev/null || echo 'No logs available'
  exit 1
fi

