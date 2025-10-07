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

# --- begin sudo-free 8080 cleanup ---
echo "[INFO] Sudo-free port 8080 cleanup (no elevated privileges)"

# First check what we can see without sudo
if command -v ss >/dev/null 2>&1; then
  echo "[INFO] Checking port 8080 with user permissions:"
  ss -tlnp 2>/dev/null | grep :8080 || echo "[INFO] No visible processes using port 8080"
elif command -v lsof >/dev/null 2>&1; then
  echo "[INFO] Checking port 8080 with lsof:"
  lsof -i:8080 2>/dev/null || echo "[INFO] No visible processes using port 8080"
fi

# Kill any processes we can see and control
if command -v lsof >/dev/null 2>&1; then
  USER_PIDS=$(lsof -ti:8080 2>/dev/null | while read pid; do
    if [ -n "$pid" ] && ps -p "$pid" -o user= 2>/dev/null | grep -q "^$(whoami)$"; then
      echo "$pid"
    fi
  done)

  if [ -n "$USER_PIDS" ]; then
    echo "[INFO] Killing user-owned processes on port 8080: $USER_PIDS"
    for pid in $USER_PIDS; do
      if [ -n "$pid" ]; then
        echo "[INFO] Killing PID: $pid"
        kill -9 "$pid" 2>/dev/null || echo "[INFO] Could not kill $pid"
      fi
    done
    sleep 2
  fi
fi

# Alternative strategy: Use a different port temporarily and proxy
# Check if port 8080 is still busy after cleanup
sleep 2
ALTERNATIVE_PORT=8081

if command -v nc >/dev/null 2>&1; then
  if nc -z localhost 8080 2>/dev/null; then
    echo "[WARNING] Port 8080 still appears busy, trying alternative approach"
    echo "[INFO] Checking if we can use alternative port $ALTERNATIVE_PORT"

    if ! nc -z localhost $ALTERNATIVE_PORT 2>/dev/null; then
      echo "[INFO] Port $ALTERNATIVE_PORT is free, will use as alternative"
      # Update PORT in .env temporarily
      if [ -f .env ]; then
        sed -i.bak "s/^PORT=.*/PORT=$ALTERNATIVE_PORT/" .env 2>/dev/null || {
          echo "PORT=$ALTERNATIVE_PORT" >> .env
        }
      else
        echo "PORT=$ALTERNATIVE_PORT" > .env
      fi
      echo "[INFO] Temporarily using port $ALTERNATIVE_PORT instead of 8080"
    else
      echo "[ERROR] Both ports 8080 and $ALTERNATIVE_PORT appear to be in use"
      # Last resort: try to find any available port
      for try_port in 8082 8083 8084 8085 3000 3001 9000 9001; do
        if ! nc -z localhost $try_port 2>/dev/null; then
          echo "[INFO] Found available port $try_port, using as emergency fallback"
          if [ -f .env ]; then
            sed -i.bak "s/^PORT=.*/PORT=$try_port/" .env 2>/dev/null || {
              echo "PORT=$try_port" >> .env
            }
          else
            echo "PORT=$try_port" > .env
          fi
          ALTERNATIVE_PORT=$try_port
          break
        fi
      done
    fi
  else
    echo "[INFO] Port 8080 appears to be free after cleanup"
    # Ensure .env has PORT=8080
    if [ -f .env ]; then
      if grep -q "^PORT=" .env; then
        sed -i.bak "s/^PORT=.*/PORT=8080/" .env 2>/dev/null
      else
        echo "PORT=8080" >> .env
      fi
    else
      echo "PORT=8080" > .env
    fi
  fi
fi

# Final verification
echo "[INFO] Final port verification before starting service"
FINAL_PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d= -f2 || echo "8080")
echo "[INFO] Will start service on port: $FINAL_PORT"

# Wait a bit more to ensure port is released
sleep 3
# --- end sudo-free 8080 cleanup ---

# Start service using simple process management
echo "[INFO] Starting eassist-api service"

# Create log directory
LOG_DIR="$HOME/logs"
mkdir -p "$LOG_DIR" 2>/dev/null || LOG_DIR="/tmp"
LOG_FILE="$LOG_DIR/eassist-api.log"

# Get the port from .env (it might have been changed to an alternative port)
FINAL_PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d= -f2 || echo "8080")
echo "[INFO] Starting service on port: $FINAL_PORT"

# Start the service in background with the correct port
cd /opt/eassist-api
NODE_ENV=production PORT="$FINAL_PORT" nohup npm start >"$LOG_FILE" 2>&1 &
NEW_PID=$!

# Save PID for future deployments
echo $NEW_PID > "$PID_FILE"
echo "[INFO] Started service with PID: $NEW_PID on port $FINAL_PORT"
echo "[INFO] Log file: $LOG_FILE"

# Wait and verify service started
sleep 5
if ! kill -0 "$NEW_PID" 2>/dev/null; then
  echo "[ERROR] Service failed to start"
  echo "[ERROR] Recent logs:"
  tail -20 "$LOG_FILE" 2>/dev/null || echo 'No logs available'
  exit 1
fi

# Verify service is listening on the correct port
echo "[INFO] Waiting for service to start on port $FINAL_PORT..."
READY=0
for i in {1..30}; do
  if command -v nc >/dev/null 2>&1 && nc -z localhost "$FINAL_PORT" 2>/dev/null; then
    echo "[INFO] ✅ Service is responding on port $FINAL_PORT"
    READY=1
    break
  elif command -v lsof >/dev/null 2>&1 && lsof -ti:"$FINAL_PORT" >/dev/null 2>&1; then
    echo "[INFO] ✅ Service is listening on port $FINAL_PORT"
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
  echo "[INFO] Service Port: $FINAL_PORT"
  echo "[INFO] PID file: $PID_FILE"
  echo "[INFO] Log file: $LOG_FILE"
  if [ "$FINAL_PORT" != "8080" ]; then
    echo "[WARNING] Service is running on port $FINAL_PORT instead of 8080 due to port conflict"
    echo "[INFO] You may need to update your reverse proxy/load balancer configuration"
  fi
else
  echo "[ERROR] ❌ Service startup timeout"
  echo "[ERROR] Process info:"
  ps aux | grep "$NEW_PID" 2>/dev/null || echo 'Process not found'
  echo "[ERROR] Recent logs:"
  tail -50 "$LOG_FILE" 2>/dev/null || echo 'No logs available'
  exit 1
fi

