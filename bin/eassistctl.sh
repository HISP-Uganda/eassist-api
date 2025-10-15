#!/usr/bin/env bash
# eassistctl: Unified deployment and service management for eassist-api
#
# Features:
# - clone: clone repo into target dir
# - deploy: fetch/checkout ref, install deps, run migrations, restart service (systemd or nohup)
# - start/stop/restart/status/logs: service management
# - migrate/seed: database tasks
# - systemd-install: install/enable systemd unit from repo (eassist-api.service)
#
# Defaults favor:
# - DEST_DIR=/opt/eassist-api
# - REPO_URL=https://github.com/HISP-Uganda/eassist-api.git
# - REF=origin/releases
# - PORT=8080
set -euo pipefail

# ------------- Defaults -------------
DEST_DIR="${DEST_DIR:-/opt/eassist-api}"
REPO_URL="${REPO_URL:-https://github.com/HISP-Uganda/eassist-api.git}"
REF="${REF:-origin/releases}"
PORT="${PORT:-8080}"
SERVICE_NAME="${SERVICE_NAME:-eassist-api.service}"
LOG_DIR_DEFAULT="$HOME/logs"
PID_FILE_DEFAULT="$HOME/.eassist-api.pid"
# ------------------------------------

log()  { printf '%s\n' "[INFO] $*"; }
warn() { printf '%s\n' "[WARN] $*" >&2; }
err()  { printf '%s\n' "[ERROR] $*" >&2; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { err "Missing command: $1"; exit 1; }; }
exists() { command -v "$1" >/dev/null 2>&1; }

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [options]

Commands:
  clone              Clone the repository into DEST_DIR
  deploy             Deploy/update code, install deps, run migrations, restart service
  start              Start the service (systemd if available, else nohup)
  stop               Stop the service
  restart            Restart the service
  status             Show service status (systemd or process)
  logs               Tail service logs
  migrate            Run DB migrations (migrate:prep if present, then migrate)
  seed               Run DB seed (seed:all|seed:initial|seed)
  systemd-install    Install/enable systemd unit from eassist-api.service

Common options (env or flags):
  --dir PATH         Target directory (default: ${DEST_DIR})
  --repo URL         Git repository URL (default: ${REPO_URL})
  --ref REF          Git ref to deploy (default: ${REF})
  --env-file PATH    Path to .env to copy into DEST_DIR/.env (optional)
  --no-seed          Skip seeding during deploy
  --nohup            Force nohup mode instead of systemd
  --systemd          Force systemd mode if available
  --port N           Override port (default: ${PORT})

Examples:
  $(basename "$0") clone --dir /opt/eassist-api --ref origin/releases
  $(basename "$0") deploy --dir /opt/eassist-api --ref origin/releases
  $(basename "$0") restart
EOF
}

# --------- Arg parsing (global flags) ---------
CMD="${1:-}" || true
shift || true
FORCE_NOHUP=0
FORCE_SYSTEMD=0
ENV_FILE=""
RUN_SEED=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DEST_DIR="${2:-}"; shift 2;;
    --repo) REPO_URL="${2:-}"; shift 2;;
    --ref) REF="${2:-}"; shift 2;;
    --env-file) ENV_FILE="${2:-}"; shift 2;;
    --no-seed) RUN_SEED=0; shift;;
    --nohup) FORCE_NOHUP=1; shift;;
    --systemd) FORCE_SYSTEMD=1; shift;;
    --port) PORT="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) warn "Unknown option: $1"; shift;;
  esac
done

[ -n "$CMD" ] || { usage; exit 2; }

# --------- Helpers ---------
mkdir_p_chown() {
  local dir="$1" user="$2" group="$3"
  sudo mkdir -p "$dir"
  sudo chown -R "$user:$group" "$dir"
}

repo_root_from_dir() {
  # Resolve the repo root: if DEST_DIR contains .git, that's the root; else assume DEST_DIR
  if [ -d "$DEST_DIR/.git" ]; then
    echo "$DEST_DIR"
  else
    echo "$DEST_DIR"
  fi
}

have_systemd() {
  [ "$FORCE_NOHUP" -eq 0 ] && [ -f "/etc/systemd/system/$SERVICE_NAME" ] && exists systemctl
}

stop_service() {
  log "Stopping service/processes on port $PORT"
  if have_systemd; then
    sudo systemctl stop "$SERVICE_NAME" || true
  else
    # PID file stop
    local pid_file="${PID_FILE_DEFAULT}"
    if [ -f "$pid_file" ]; then
      local old_pid; old_pid=$(cat "$pid_file" 2>/dev/null || echo '')
      if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
        log "Stopping PID $old_pid"
        kill -TERM "$old_pid" || true
        sleep 2
        kill -0 "$old_pid" 2>/dev/null && kill -9 "$old_pid" || true
      fi
      rm -f "$pid_file"
    fi
    # Kill anything on port (user-owned)
    if exists lsof; then
      local upids
      upids=$(lsof -ti:"$PORT" 2>/dev/null | while read -r p; do [ "$(ps -o user= -p "$p" 2>/dev/null)" = "$(whoami)" ] && echo "$p"; done)
      [ -n "$upids" ] && { log "Killing PIDs: $upids"; for p in $upids; do kill -9 "$p" 2>/dev/null || true; done; }
    fi
  fi
  # Wait until free
  for i in $(seq 1 15); do
    if ! ss -ltnp 2>/dev/null | grep -q ":$PORT"; then
      log "✅ Port $PORT is free."
      return 0
    fi
    sleep 1
  done
  err "Port $PORT is still busy."
  return 1
}

start_nohup() {
  local log_dir="$LOG_DIR_DEFAULT" log_file pid_file
  mkdir -p "$log_dir" || log_dir="/tmp"
  log_file="$log_dir/eassist-api.log"
  pid_file="$PID_FILE_DEFAULT"
  ( cd "$DEST_DIR" && NODE_ENV=production PORT="$PORT" nohup npm start >"$log_file" 2>&1 & echo $! >"$pid_file" )
  log "Started via nohup. Log: $log_file, PID_FILE: $pid_file"
}

start_systemd() {
  sudo systemctl daemon-reload || true
  sudo systemctl restart "$SERVICE_NAME"
}

wait_ready() {
  log "Waiting for service on :$PORT ..."
  # prefer curl HTTP probe; fallback to nc/ss/lsof
  for i in $(seq 1 40); do
    # Try HTTP GET to root; any HTTP response indicates readiness
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS --max-time 2 -o /dev/null "http://127.0.0.1:${PORT}/"; then
        log "✅ HTTP response on :$PORT"
        return 0
      fi
    fi
    # TCP checks
    if command -v nc >/dev/null 2>&1; then
      if nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
        log "✅ TCP open on :$PORT"
        return 0
      fi
    fi
    if command -v ss >/dev/null 2>&1; then
      if ss -ltn 2>/dev/null | grep -q ":$PORT\b"; then
        log "✅ Service is listening on :$PORT"
        return 0
      fi
    fi
    if command -v lsof >/dev/null 2>&1; then
      if lsof -ti:"$PORT" >/dev/null 2>&1; then
        log "✅ Detected listener on :$PORT"
        return 0
      fi
    fi
    sleep 1.5
  done
  err "Service did not become ready on :$PORT"
  # show recent logs for diagnostics
  local log_file1="$LOG_DIR_DEFAULT/eassist-api.log"
  local log_file2="/tmp/eassist-api.log"
  if [ -f "$log_file1" ]; then
    warn "Last 200 lines of $log_file1:"; tail -n 200 "$log_file1" || true
  elif [ -f "$log_file2" ]; then
    warn "Last 200 lines of $log_file2:"; tail -n 200 "$log_file2" || true
  else
    warn "No log file found at $log_file1 or $log_file2"
  fi
  return 1
}

ensure_env_and_port() {
  # Ensure .env exists and enforce PORT
  if [ ! -f "$DEST_DIR/.env" ]; then
    err "Missing $DEST_DIR/.env. Provide --env-file or create it manually."
    exit 1
  fi
  if grep -q '^PORT=' "$DEST_DIR/.env"; then
    sed -i.bak "s/^PORT=.*/PORT=$PORT/" "$DEST_DIR/.env" 2>/dev/null || true
    rm -f "$DEST_DIR/.env.bak" || true
  else
    echo "PORT=$PORT" >> "$DEST_DIR/.env"
  fi
}

persist_build_meta() {
  # EASSIST_BUILD and GIT_SHA in .env
  local sha short ts build
  if [ -d "$DEST_DIR/.git" ]; then
    sha=$(git -C "$DEST_DIR" rev-parse HEAD 2>/dev/null || echo "")
  else
    sha=""
  fi
  short="${sha:0:12}"
  ts=$(date +%Y%m%d%H%M%S)
  build="deploy.${short:-local}.$ts"
  # Upsert helper
  if grep -q '^GIT_SHA=' "$DEST_DIR/.env"; then
    sed -i.bak "s/^GIT_SHA=.*/GIT_SHA=${sha}/" "$DEST_DIR/.env" && rm -f "$DEST_DIR/.env.bak"
  else
    printf '\nGIT_SHA=%s\n' "$sha" >> "$DEST_DIR/.env"
  fi
  if grep -q '^EASSIST_BUILD=' "$DEST_DIR/.env"; then
    sed -i.bak "s/^EASSIST_BUILD=.*/EASSIST_BUILD=${build}/" "$DEST_DIR/.env" && rm -f "$DEST_DIR/.env.bak"
  else
    printf '\nEASSIST_BUILD=%s\n' "$build" >> "$DEST_DIR/.env"
  fi
}

npm_has_script() { ( cd "$DEST_DIR" && npm run -s 2>/dev/null | grep -qE "^\s*$1\b" ); }

run_migrations() {
  log "Running database migrations ..."
  if npm_has_script migrate:prep; then ( cd "$DEST_DIR" && npm run migrate:prep ) || true; fi
  if npm_has_script migrate; then ( cd "$DEST_DIR" && npm run migrate );
  elif npm_has_script migrate:run; then ( cd "$DEST_DIR" && npm run migrate:run );
  else warn "No migration script found (migrate or migrate:run)."; fi
}

run_seed() {
  log "Running database seeding ..."
  if npm_has_script seed:all; then ( cd "$DEST_DIR" && npm run seed:all );
  elif npm_has_script seed:initial; then ( cd "$DEST_DIR" && npm run seed:initial );
  elif npm_has_script seed; then ( cd "$DEST_DIR" && npm run seed );
  else warn "No seeding script found (seed:all / seed:initial / seed)."; fi
}

is_port_listening() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then ss -ltn 2>/dev/null | grep -q ":${p}\\b" && return 0; fi
  if command -v lsof >/dev/null 2>&1; then lsof -ti:"$p" >/dev/null 2>&1 && return 0; fi
  if command -v nc >/dev/null 2>&1; then nc -z 127.0.0.1 "$p" >/dev/null 2>&1 && return 0; fi
  return 1
}

is_port_free() { ! is_port_listening "$1"; }

# --------- Commands ---------
case "$CMD" in
  clone)
    require_cmd git
    sudo mkdir -p "$DEST_DIR"
    if [ -d "$DEST_DIR/.git" ]; then
      log "Already a git repo at $DEST_DIR; fetching updates ..."
      git -C "$DEST_DIR" fetch --all --prune --tags
    else
      log "Cloning $REPO_URL into $DEST_DIR"
      sudo rm -rf "$DEST_DIR"/* 2>/dev/null || true
      git clone "$REPO_URL" "$DEST_DIR"
    fi
    ;;

  deploy)
    require_cmd git; require_cmd npm
    # Apply env file if provided
    if [ -n "$ENV_FILE" ]; then
      [ -f "$ENV_FILE" ] || { err "--env-file not found: $ENV_FILE"; exit 1; }
      sudo cp "$ENV_FILE" "$DEST_DIR/.env"
      sudo chown "$(whoami):$(id -gn)" "$DEST_DIR/.env" || true
    fi
    # Checkout ref
    if [ -d "$DEST_DIR/.git" ]; then
      log "Fetching and checking out $REF in $DEST_DIR"
      git -C "$DEST_DIR" fetch --all --prune --tags
      if git -C "$DEST_DIR" rev-parse --verify -q "$REF" >/dev/null 2>&1; then
        git -C "$DEST_DIR" reset --hard "$REF"
      else
        git -C "$DEST_DIR" reset --hard "origin/${REF}"
      fi
    else
      log "Not a git repo; cloning fresh"
      git clone "$REPO_URL" "$DEST_DIR"
      git -C "$DEST_DIR" reset --hard "$REF" || git -C "$DEST_DIR" reset --hard "origin/${REF}" || true
    fi
    # Install deps
    if [ -f "$DEST_DIR/package-lock.json" ]; then
      log "Installing dependencies (npm ci)"
      ( cd "$DEST_DIR" && npm ci )
    else
      log "Installing dependencies (npm install)"
      ( cd "$DEST_DIR" && npm install --no-audit --no-fund )
    fi
    ensure_env_and_port
    persist_build_meta
    stop_service
    run_migrations
    if [ "$RUN_SEED" -eq 1 ]; then run_seed; else log "Skipping seeding (--no-seed)"; fi
    if [ "$FORCE_NOHUP" -eq 1 ] || ! have_systemd; then
      start_nohup
    else
      start_systemd
    fi
    wait_ready
    ;;

  start)
    ensure_env_and_port
    if [ "$FORCE_NOHUP" -eq 1 ] || ! have_systemd; then start_nohup; else start_systemd; fi
    wait_ready
    ;;

  stop)
    stop_service
    ;;

  restart)
    stop_service || warn "Stop may have failed; port might still be busy"
    if is_port_free "$PORT"; then
      if [ "$FORCE_NOHUP" -eq 1 ] || ! have_systemd; then start_nohup; else start_systemd; fi
    else
      warn "Port $PORT is still busy; assuming an instance is already running. Skipping start."
    fi
    wait_ready
    ;;

  status)
    if have_systemd; then sudo systemctl --no-pager --full status "$SERVICE_NAME" || true; fi
    ss -ltnp 2>/dev/null | grep ":$PORT" || echo "No listener on :$PORT (visible to current user)"
    ;;

  logs)
    tail -n 200 -F "$LOG_DIR_DEFAULT/eassist-api.log" || tail -n 200 -F /tmp/eassist-api.log || true
    ;;

  migrate)
    ensure_env_and_port
    run_migrations
    ;;

  seed)
    ensure_env_and_port
    run_seed
    ;;

  systemd-install)
    require_cmd sudo; require_cmd systemctl
    [ -f "$DEST_DIR/eassist-api.service" ] || { err "Missing eassist-api.service in $DEST_DIR"; exit 1; }
    sudo cp "$DEST_DIR/eassist-api.service" "/etc/systemd/system/$SERVICE_NAME"
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    log "Installed and enabled $SERVICE_NAME"
    ;;

  *)
    err "Unknown command: $CMD"; usage; exit 2;;

esac

